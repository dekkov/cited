---
phase: 03-user-ai-loop-the-demo
plan: 02
type: execute
wave: 2
depends_on: ["03-01"]
files_modified:
  - packages/core/src/retrieval/hybridRetrieve.ts
  - packages/core/src/retrieval/hybridRetrieve.test.ts
  - packages/core/src/retrieval/index.ts
  - packages/core/src/recommendations/validateCitations.ts
  - packages/core/src/recommendations/validateCitations.test.ts
  - packages/core/src/recommendations/index.ts
  - packages/core/src/swap/cluster.ts
  - packages/core/src/swap/cluster.test.ts
  - packages/core/src/swap/index.ts
  - packages/core/src/index.ts
  - packages/db/migrations/0009_phase3_cluster_assignment.sql
autonomous: true
requirements:
  - AION-02
  - AION-03
  - REC-02
  - REC-05
  - SWAP-02
user_setup: []
must_haves:
  truths:
    - "hybridRetrieve(db, embedQuery, textQuery, filters, limit) returns ranked clips combining pgvector cosine + tsvector via RRF"
    - "Every transaction issuing filtered ANN queries sets `hnsw.iterative_scan = strict_order`"
    - "validateCitations() reuses Phase 2's groundingCheck (threshold 0.85); returns {valid, dropped}"
    - "Cluster assignment script computes cluster_id (k=4 per domain) for all habit_templates and writes to DB"
  artifacts:
    - path: "packages/core/src/retrieval/hybridRetrieve.ts"
      provides: "Hybrid pgvector+tsvector retrieval with RRF"
      contains: "SET LOCAL hnsw.iterative_scan"
    - path: "packages/core/src/recommendations/validateCitations.ts"
      provides: "Post-generation citation grounding (REC-02)"
      contains: "groundingCheck"
    - path: "packages/core/src/swap/cluster.ts"
      provides: "k-means cluster assignment for habit_templates"
      contains: "computeClusters"
  key_links:
    - from: "validateCitations.ts"
      to: "groundingCheck"
      via: "import from @cited/core/llm/grounding/similarityCheck"
      pattern: "from '.\\./llm/grounding/similarityCheck'"
    - from: "hybridRetrieve.ts"
      to: "Postgres"
      via: "drizzle sql template + pgvector + tsvector"
      pattern: "SET LOCAL hnsw.iterative_scan"
---

<objective>
Build the retrieval + grounding + cluster-assignment libraries that the interview API (03-03) and swap (03-06) call into. **No route handlers in this plan** — only pure library functions with tests.

Purpose: Centralize hybrid RAG in one tested function. Reuse Phase 2's groundingCheck (do not duplicate). Pre-compute habit_template cluster_ids so swap can run with simple SQL.

Output: Three library packages (retrieval, recommendations, swap) with passing tests; one migration that runs the first cluster assignment.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@packages/core/src/llm/grounding/similarityCheck.ts
@packages/core/src/llm/registry.ts
@packages/db/src/schema/clips.ts
@packages/db/src/schema/habit-templates.ts
@packages/db/src/schema/habit-template-clips.ts

<interfaces>
From Plan 03-01 (must be merged first):
- `packages/core/src/retrieval/types.ts` exports `ClipRetrievalFilters`, `RankedClip`, `Domain`
- `packages/core/src/interview/schemas.ts` exports `CitationSchema`, `Citation`

Reused from Phase 2:
- `groundingCheck(nearest, quotedSpan, clipId): Promise<number>` and `GROUNDING_THRESHOLD = 0.85` from `packages/core/src/llm/grounding/similarityCheck.ts`
- `getEmbeddings()` from `packages/core/src/llm/registry.ts` — returns `EmbeddingProvider` (OpenAI text-embedding-3-small, 1536-dim)

Caller pattern (from Phase 2): retrieval/grounding libs in `@cited/core` are drizzle-orm-free; caller passes a `db` query or a query function. Follow the same pattern here.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: hybridRetrieve() — pgvector + tsvector RRF with iterative_scan, metadata filters, exclude-id support</name>
  <read_first>
    - packages/core/src/llm/grounding/similarityCheck.ts (test-seam pattern, caller-supplied query)
    - packages/db/src/schema/clips.ts (column names: claim, rationale, speaker, domain, risk_flags, embedding, status, removed_at)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 2: Hybrid retrieval SQL"
    - packages/core/src/retrieval/types.ts (RankedClip, ClipRetrievalFilters)
  </read_first>
  <behavior>
    - Test 1: When caller-supplied query returns 3 rows, hybridRetrieve returns 3 RankedClip with descending similarityScore
    - Test 2: Filters.excludeClipIds removes those IDs (test asserts they're passed through to the query)
    - Test 3: Filters.excludeRiskFlags is passed through (default for interview turns: ['medical_advice','supplement','contraindication'])
    - Test 4: Empty result from caller query → returns []
    - Test 5: Test-seam pattern — exported `__setHybridQueryImpl` lets unit tests inject a fake without a real DB
  </behavior>
  <action>
    Create `packages/core/src/retrieval/hybridRetrieve.ts`. Mirror the Phase 2 pattern: caller supplies a `HybridQueryFn` so `@cited/core` stays drizzle-free.

    ```ts
    import type { ClipRetrievalFilters, RankedClip } from './types';

    export type HybridQueryFn = (params: {
      readonly embedQuery: number[];      // 1536-dim
      readonly textQuery: string;
      readonly filters: ClipRetrievalFilters;
      readonly limit: number;
    }) => Promise<readonly RankedClip[]>;

    /**
     * The recommended caller SQL (run inside a transaction; caller is responsible for
     * `SET LOCAL hnsw.iterative_scan = strict_order;` and `SET LOCAL hnsw.max_scan_tuples = 20000;`
     * BEFORE this query). The CTE filters BEFORE the ANN sort so iterative_scan can do its job.
     *
     * WITH params AS (SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w),
     * filtered AS (
     *   SELECT id, embedding, claim, rationale, speaker, domain, risk_flags,
     *          to_tsvector('english', coalesce(claim,'') || ' ' || coalesce(rationale,'')) AS fts
     *   FROM clips
     *   WHERE status = 'approved'
     *     AND removed_at IS NULL
     *     AND ($1::text[] IS NULL OR domain::text = ANY($1::text[]))
     *     AND NOT (coalesce(risk_flags, '{}'::text[]) && $2::text[])
     *     AND ($3::uuid[] IS NULL OR id <> ALL($3::uuid[]))
     * ),
     * vec_ranked AS (
     *   SELECT id,
     *          row_number() OVER (ORDER BY embedding <=> $4::vector) AS rnk_vec,
     *          1 - (embedding <=> $4::vector) AS sim_vec
     *   FROM filtered
     *   ORDER BY embedding <=> $4::vector
     *   LIMIT 30
     * ),
     * text_ranked AS (
     *   SELECT id,
     *          row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', $5)) DESC) AS rnk_text
     *   FROM filtered
     *   WHERE fts @@ plainto_tsquery('english', $5)
     *   LIMIT 30
     * ),
     * fused AS (
     *   SELECT f.id,
     *          coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) * (SELECT vec_w FROM params) +
     *          coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) * (SELECT text_w FROM params)
     *            AS rrf_score,
     *          coalesce(v.sim_vec, 0) AS sim_vec,
     *          coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) AS vec_score,
     *          coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) AS text_score
     *   FROM filtered f
     *   LEFT JOIN vec_ranked v ON v.id = f.id
     *   LEFT JOIN text_ranked t ON t.id = f.id
     *   WHERE v.id IS NOT NULL OR t.id IS NOT NULL
     * )
     * SELECT f.id AS clip_id, f.rrf_score AS similarity_score,
     *        f.vec_score AS vector_score, f.text_score AS text_score,
     *        c.claim, c.speaker, c.domain
     * FROM fused f JOIN clips c ON c.id = f.id
     * ORDER BY rrf_score DESC
     * LIMIT $6;
     */

    let queryImpl: HybridQueryFn | null = null;
    export function __setHybridQueryImpl(impl: HybridQueryFn | null): void {
      queryImpl = impl;
    }

    export async function hybridRetrieve(
      query: HybridQueryFn,
      embedQuery: number[],
      textQuery: string,
      filters: ClipRetrievalFilters = {},
      limit = 5,
    ): Promise<readonly RankedClip[]> {
      const fn = queryImpl ?? query;
      const rows = await fn({ embedQuery, textQuery, filters, limit });
      return [...rows].sort((a, b) => b.similarityScore - a.similarityScore);
    }
    ```

    The verbatim SQL template above is embedded in the JSDoc so executors of Plan 03-03 (which writes the route handler that calls this) can paste it into a Drizzle `sql\`...\`` template literal. **Do NOT inline drizzle-orm here** — `@cited/core` does not depend on drizzle.

    Update `packages/core/src/retrieval/index.ts` to re-export `hybridRetrieve` and `HybridQueryFn`.

    Write `hybridRetrieve.test.ts` covering all 5 behaviors using `__setHybridQueryImpl` to inject a fake.
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- hybridRetrieve</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/retrieval/hybridRetrieve.ts`
    - `grep -q "SET LOCAL hnsw.iterative_scan" packages/core/src/retrieval/hybridRetrieve.ts` returns 0 (must appear in JSDoc, copied verbatim for the route handler in Plan 03-03)
    - `grep -q "RRF\|rrf_score\|rrf_k" packages/core/src/retrieval/hybridRetrieve.ts` returns 0
    - `grep -q "__setHybridQueryImpl" packages/core/src/retrieval/hybridRetrieve.ts` returns 0
    - `grep -q "drizzle" packages/core/src/retrieval/hybridRetrieve.ts` returns 1 (no matches — @cited/core stays drizzle-free)
    - `pnpm --filter @cited/core test -- hybridRetrieve` exits 0
  </acceptance_criteria>
  <done>hybridRetrieve callable from any package, tested with injected query, ready for route handlers in 03-03/03-06.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: validateCitations() — reuse Phase 2 groundingCheck, regenerate-on-fail policy lives in caller</name>
  <read_first>
    - packages/core/src/llm/grounding/similarityCheck.ts (groundingCheck signature, GROUNDING_THRESHOLD = 0.85)
    - packages/core/src/interview/schemas.ts (CitationSchema from Plan 03-01)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 4: Citation grounding"
  </read_first>
  <behavior>
    - Test 1: Citation whose clipId is not found by caller-supplied lookup → dropped with reason 'clip_not_found_or_unapproved'
    - Test 2: Citation whose clip status != 'approved' → dropped same reason
    - Test 3: Citation with similarity < 0.85 → dropped with reason `claim_similarity_<score>_below_threshold`
    - Test 4: Citation with similarity >= 0.85 → added to valid
    - Test 5: All-valid input → dropped is empty
  </behavior>
  <action>
    Create `packages/core/src/recommendations/validateCitations.ts`:

    ```ts
    import { GROUNDING_THRESHOLD, type NearestChunkQuery, groundingCheck } from '../llm/grounding/similarityCheck';
    import type { Citation } from '../interview/schemas';

    export type ClipLookup = (clipId: string) => Promise<
      { id: string; status: string; claim: string; removedAt: Date | null } | null
    >;

    export type CitationDropReason =
      | 'clip_not_found_or_unapproved'
      | `claim_similarity_${string}_below_threshold`;

    export type ValidateCitationsResult = {
      readonly valid: readonly Citation[];
      readonly dropped: ReadonlyArray<{ citation: Citation; reason: CitationDropReason }>;
    };

    /**
     * REC-02: For each model-provided citation, (1) verify the clip exists, is approved, not removed;
     * (2) call groundingCheck (Phase 2, threshold 0.85) on the model's `claim` text against the
     * clip's transcript chunks. Drop on either failure. Caller decides whether to regenerate.
     */
    export async function validateCitations(
      citations: readonly Citation[],
      clipLookup: ClipLookup,
      nearest: NearestChunkQuery,
    ): Promise<ValidateCitationsResult> {
      const valid: Citation[] = [];
      const dropped: Array<{ citation: Citation; reason: CitationDropReason }> = [];

      for (const c of citations) {
        const row = await clipLookup(c.clipId);
        if (!row || row.status !== 'approved' || row.removedAt !== null) {
          dropped.push({ citation: c, reason: 'clip_not_found_or_unapproved' });
          continue;
        }
        const sim = await groundingCheck(nearest, c.claim, c.clipId);
        if (sim < GROUNDING_THRESHOLD) {
          dropped.push({
            citation: c,
            reason: `claim_similarity_${sim.toFixed(2)}_below_threshold` as CitationDropReason,
          });
          continue;
        }
        valid.push(c);
      }
      return { valid, dropped };
    }
    ```

    Create `packages/core/src/recommendations/index.ts` re-exporting validateCitations + types.

    Add to `packages/core/src/index.ts`: `export * from './recommendations';`.

    Write `validateCitations.test.ts` covering all 5 behaviors. Mock `groundingCheck` via `__setEmbeddingsImpl` test seam (or by passing a fake `nearest` that returns specific similarity scores).

    The regenerate-on-fail policy (if `valid.length < 2`, regenerate once) lives in Plan 03-03's route handler — NOT here. This function is a pure validator.
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- validateCitations</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/recommendations/validateCitations.ts`
    - `grep -q "groundingCheck" packages/core/src/recommendations/validateCitations.ts` returns 0
    - `grep -q "GROUNDING_THRESHOLD" packages/core/src/recommendations/validateCitations.ts` returns 0
    - `grep -q "function groundingCheck\|export.*groundingCheck.*=" packages/core/src/recommendations/validateCitations.ts` returns 1 (no NEW definition — only import)
    - `pnpm --filter @cited/core test -- validateCitations` exits 0
  </acceptance_criteria>
  <done>validateCitations callable from Plan 03-03 synthesis route; Phase 2 groundingCheck reused, not duplicated.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Cluster assignment library + first batch migration</name>
  <read_first>
    - packages/db/src/schema/habit-templates.ts (clusterId column added in Plan 03-01)
    - packages/db/src/schema/habit-template-clips.ts (join table to clips)
    - packages/db/src/schema/clips.ts (embedding column)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 5: Substantively-different swap"
  </read_first>
  <behavior>
    - Test 1: computeClusters() with synthetic templates (per-domain centroids) assigns same domain templates near same centroid to same cluster
    - Test 2: k=4 per domain → returned cluster_id ∈ {0..3} for each template
    - Test 3: Templates with no clips → cluster_id = null
    - Test 4: Deterministic seed: same input → same output across runs
  </behavior>
  <action>
    Create `packages/core/src/swap/cluster.ts` — pure k-means (no DB). The implementation must be fully deterministic; the pseudocode/scaffold below MUST be implemented as-written (no further hand-waving):

    ```ts
    import type { Domain } from '../interview/schemas';

    export type TemplateEmbedding = {
      readonly templateId: string;
      readonly domain: Domain;
      readonly centroid: readonly number[];  // mean of the template's clip embeddings, 1536-dim
    };

    export type ClusterAssignment = {
      readonly templateId: string;
      readonly clusterId: number | null;  // null when centroid is empty/no clips
    };

    // Seeded PRNG — mulberry32. Seed fixed at 42 for determinism (used only if random tiebreaks needed; primary tiebreaks are templateId-based).
    function mulberry32(seed: number): () => number {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    export function cosineDistance(a: readonly number[], b: readonly number[]): number {
      let dot = 0, na = 0, nb = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        dot += a[i]! * b[i]!;
        na += a[i]! * a[i]!;
        nb += b[i]! * b[i]!;
      }
      if (na === 0 || nb === 0) return 1;
      return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    /**
     * Deterministic k-means. k=4 per domain (SWAP-02 default). Seed = 42.
     * - Templates with empty/missing centroid → cluster_id = null (skipped from clustering).
     * - Group remaining templates by domain.
     * - For each domain group with >= k templates:
     *     1. Sort group by templateId (lexicographic ascending) — deterministic ordering.
     *     2. Pick k initial centroids as k evenly-spaced indices: floor(i * (n-1) / (k-1)) for i in 0..k-1.
     *        (If n < k, every template becomes its own cluster; later clusters unfilled.)
     *     3. Iterate up to 20 times:
     *        a. For each template, compute cosineDistance to each of k centroids.
     *        b. Assign to nearest centroid. On equal distance (within 1e-12), pick the centroid whose
     *           seed templateId is lexicographically smaller (deterministic tiebreak).
     *        c. Recompute each centroid as the element-wise mean of its members' centroids.
     *        d. If no assignment changed since previous iteration, break.
     *     4. Emit { templateId, clusterId } for each template in this domain (clusterId ∈ 0..k-1).
     * - For groups with < k templates: assign cluster_id = group-index sequence 0..n-1.
     * - Return ClusterAssignment[] across all templates (null entries preserved).
     */
    export function computeClusters(
      templates: readonly TemplateEmbedding[],
      k = 4,
    ): readonly ClusterAssignment[] {
      const _rng = mulberry32(42); // reserved for any future random fallback; not used in core loop
      const out: ClusterAssignment[] = [];
      const byDomain = new Map<Domain, TemplateEmbedding[]>();

      for (const t of templates) {
        if (!t.centroid || t.centroid.length === 0) {
          out.push({ templateId: t.templateId, clusterId: null });
          continue;
        }
        const arr = byDomain.get(t.domain) ?? [];
        arr.push(t);
        byDomain.set(t.domain, arr);
      }

      for (const [, group] of byDomain) {
        // Deterministic ordering
        const sorted = [...group].sort((a, b) => (a.templateId < b.templateId ? -1 : a.templateId > b.templateId ? 1 : 0));
        const n = sorted.length;
        if (n === 0) continue;

        if (n < k) {
          sorted.forEach((t, i) => out.push({ templateId: t.templateId, clusterId: i }));
          continue;
        }

        // Initial centroids: k evenly-spaced indices in the sorted group
        const seedIdx: number[] = [];
        for (let i = 0; i < k; i++) seedIdx.push(Math.floor((i * (n - 1)) / (k - 1)));
        let centroids: number[][] = seedIdx.map((idx) => [...sorted[idx]!.centroid]);
        const seedTemplateIds = seedIdx.map((idx) => sorted[idx]!.templateId);

        let assignments: number[] = new Array(n).fill(-1);
        for (let iter = 0; iter < 20; iter++) {
          // Assign
          const next: number[] = new Array(n);
          for (let i = 0; i < n; i++) {
            let bestC = 0;
            let bestD = Infinity;
            for (let c = 0; c < k; c++) {
              const d = cosineDistance(sorted[i]!.centroid, centroids[c]!);
              if (d < bestD - 1e-12) {
                bestD = d; bestC = c;
              } else if (Math.abs(d - bestD) <= 1e-12) {
                // Tiebreak: prefer centroid whose seed templateId is lexicographically smaller
                if (seedTemplateIds[c]! < seedTemplateIds[bestC]!) {
                  bestC = c;
                }
              }
            }
            next[i] = bestC;
          }
          // Early terminate if unchanged
          let changed = false;
          for (let i = 0; i < n; i++) if (next[i] !== assignments[i]) { changed = true; break; }
          assignments = next;
          if (!changed && iter > 0) break;

          // Recompute centroids
          const dim = centroids[0]!.length;
          const sums: number[][] = Array.from({ length: k }, () => new Array(dim).fill(0));
          const counts: number[] = new Array(k).fill(0);
          for (let i = 0; i < n; i++) {
            const c = assignments[i]!;
            counts[c]++;
            for (let j = 0; j < dim; j++) sums[c]![j] += sorted[i]!.centroid[j]!;
          }
          for (let c = 0; c < k; c++) {
            if (counts[c] > 0) for (let j = 0; j < dim; j++) sums[c]![j] /= counts[c]!;
            else sums[c] = [...centroids[c]!]; // keep prior centroid if empty cluster
          }
          centroids = sums;
        }

        for (let i = 0; i < n; i++) {
          out.push({ templateId: sorted[i]!.templateId, clusterId: assignments[i]! });
        }
      }

      return out;
    }
    ```

    The implementation above is the contract — executors should transcribe it verbatim and write tests against it. Seed = 42, max 20 iterations, deterministic templateId-sort tiebreaks, cosine distance per pgvector parity.

    Create `packages/core/src/swap/index.ts` re-exporting. Add `export * from './swap';` to `packages/core/src/index.ts`.

    Write `cluster.test.ts` per behavior block.

    **Migration 0009_phase3_cluster_assignment.sql**: This SQL is a *placeholder* — the first cluster batch will be applied by a one-off script in Plan 03-06 (pg_cron weekly job scheduling also lives there). For now, the migration just documents the cron schema. Content:

    ```sql
    -- Phase 3 cluster assignment cron registration (the actual cron job + first batch ship in Plan 03-06)
    -- This migration is a placeholder so the migration sequence is contiguous.
    SELECT 1;
    ```

    (Alternative: skip this migration file. If migration numbering allows skipping, omit Task 3's migration creation entirely. Decide based on the repo's migration tooling — `drizzle-kit` typically requires contiguous numbering.)
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- cluster</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/swap/cluster.ts`
    - `grep -q "computeClusters" packages/core/src/swap/cluster.ts` returns 0
    - `grep -q "cosineDistance" packages/core/src/swap/cluster.ts` returns 0
    - `grep -q "export \* from './swap'" packages/core/src/index.ts` returns 0
    - `pnpm --filter @cited/core test -- cluster` exits 0
  </acceptance_criteria>
  <done>computeClusters callable from Plan 03-06's cron registration; pure function with deterministic tests.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @cited/core test` passes (all three libs)
- `pnpm --filter @cited/core typecheck` passes
- All three libs (retrieval, recommendations, swap) export from `@cited/core` barrel
</verification>

<success_criteria>
Retrieval, citation grounding, and cluster libs are pure, tested, drizzle-free, and ready for route handlers in Plans 03-03 and 03-06.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-02-SUMMARY.md` listing: hybridRetrieve signature + verbatim SQL block (so 03-03 can paste it), validateCitations signature, computeClusters signature.
</output>
