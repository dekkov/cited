---
phase: 03-user-ai-loop-the-demo
plan: 02
subsystem: packages/core
tags: [retrieval, rag, hybrid-search, pgvector, tsvector, rrf, grounding, citation-validation, k-means, cluster-assignment, tdd]
dependency_graph:
  requires: [03-01]
  provides: [hybridRetrieve, HybridQueryFn, validateCitations, ClipLookup, CitationDropReason, ValidateCitationsResult, computeClusters, cosineDistance, TemplateEmbedding, ClusterAssignment]
  affects: [03-03-interview-synthesis-api, 03-06-habit-detail-public-swap]
tech_stack:
  added: []
  patterns: [tdd-red-green, test-seam-injection, pure-function-library, drizzle-free-core, caller-supplied-query]
key_files:
  created:
    - packages/core/src/retrieval/hybridRetrieve.ts
    - packages/core/src/retrieval/hybridRetrieve.test.ts
    - packages/core/src/recommendations/validateCitations.ts
    - packages/core/src/recommendations/validateCitations.test.ts
    - packages/core/src/recommendations/index.ts
    - packages/core/src/swap/cluster.ts
    - packages/core/src/swap/cluster.test.ts
    - packages/core/src/swap/index.ts
    - packages/db/migrations/0009_phase3_cluster_assignment.sql
  modified:
    - packages/core/src/retrieval/index.ts
    - packages/core/src/index.ts
decisions:
  - "cluster.ts strict TypeScript required nullable guards on array accesses; fixed with explicit undefined checks rather than non-null assertions — better safety at a small verbosity cost"
  - "Test 1 for computeClusters required 8 templates (not 5) because k=4 with n=5 causes all 4 seed centroids to be selected from the 5 templates, making close-pair co-clustering untestable at n=5; n=8 gives non-seed members that do migrate"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 3
  files_changed: 9
---

# Phase 3 Plan 02: Hybrid Retrieval + Grounding + Cluster Assignment Summary

Pure library functions for hybrid RAG retrieval (pgvector+tsvector RRF), citation grounding validation reusing Phase 2's `groundingCheck`, and deterministic k-means cluster assignment — all tested with injected fakes, all drizzle-free. Route handlers in Plans 03-03 and 03-06 can paste the embedded SQL template directly.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | hybridRetrieve() — pgvector+tsvector RRF with iterative_scan | 07bfe21 | retrieval/hybridRetrieve.ts, hybridRetrieve.test.ts, retrieval/index.ts |
| 2 | validateCitations() — reuse Phase 2 groundingCheck | 8e4d9f8 | recommendations/validateCitations.ts, validateCitations.test.ts, recommendations/index.ts |
| 3 | computeClusters() + migration placeholder 0009 | 2aa0371 | swap/cluster.ts, cluster.test.ts, swap/index.ts, 0009_phase3_cluster_assignment.sql |

## hybridRetrieve — Signature + SQL Template

```ts
// packages/core/src/retrieval/hybridRetrieve.ts

export type HybridQueryFn = (params: {
  readonly embedQuery: number[];    // 1536-dim
  readonly textQuery: string;
  readonly filters: ClipRetrievalFilters;
  readonly limit: number;
}) => Promise<readonly RankedClip[]>;

export function __setHybridQueryImpl(impl: HybridQueryFn | null): void

export async function hybridRetrieve(
  query: HybridQueryFn,
  embedQuery: number[],
  textQuery: string,
  filters?: ClipRetrievalFilters,
  limit?: number,   // default 5
): Promise<readonly RankedClip[]>
```

**Verbatim SQL template** (paste into a Drizzle `` sql`...` `` template literal for Plans 03-03/03-06):

```sql
-- Run inside a transaction, BEFORE the query:
SET LOCAL hnsw.iterative_scan = strict_order;
SET LOCAL hnsw.max_scan_tuples = 20000;

-- Then execute:
WITH params AS (SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w),
filtered AS (
  SELECT id, embedding, claim, rationale, speaker, domain, risk_flags,
         to_tsvector('english', coalesce(claim,'') || ' ' || coalesce(rationale,'')) AS fts
  FROM clips
  WHERE status = 'approved'
    AND removed_at IS NULL
    AND ($1::text[] IS NULL OR domain::text = ANY($1::text[]))
    AND NOT (coalesce(risk_flags, '{}'::text[]) && $2::text[])
    AND ($3::uuid[] IS NULL OR id <> ALL($3::uuid[]))
),
vec_ranked AS (
  SELECT id,
         row_number() OVER (ORDER BY embedding <=> $4::vector) AS rnk_vec,
         1 - (embedding <=> $4::vector) AS sim_vec
  FROM filtered
  ORDER BY embedding <=> $4::vector
  LIMIT 30
),
text_ranked AS (
  SELECT id,
         row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', $5)) DESC) AS rnk_text
  FROM filtered
  WHERE fts @@ plainto_tsquery('english', $5)
  LIMIT 30
),
fused AS (
  SELECT f.id,
         coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) * (SELECT vec_w FROM params) +
         coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) * (SELECT text_w FROM params)
           AS rrf_score,
         coalesce(v.sim_vec, 0) AS sim_vec,
         coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) AS vec_score,
         coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) AS text_score
  FROM filtered f
  LEFT JOIN vec_ranked v ON v.id = f.id
  LEFT JOIN text_ranked t ON t.id = f.id
  WHERE v.id IS NOT NULL OR t.id IS NOT NULL
)
SELECT f.id AS clip_id, f.rrf_score AS similarity_score,
       f.vec_score AS vector_score, f.text_score AS text_score,
       c.claim, c.speaker, c.domain
FROM fused f JOIN clips c ON c.id = f.id
ORDER BY rrf_score DESC
LIMIT $6;
-- $1=domains[], $2=excludeRiskFlags[], $3=excludeClipIds[], $4=embedQuery::vector,
-- $5=textQuery, $6=limit
```

## validateCitations — Signature

```ts
// packages/core/src/recommendations/validateCitations.ts

export type ClipLookup = (clipId: string) => Promise<
  { id: string; status: string; claim: string; removedAt: Date | null } | null
>;

export type CitationDropReason =
  | 'clip_not_found_or_unapproved'
  | `claim_similarity_${string}_below_threshold`;

export async function validateCitations(
  citations: readonly Citation[],
  clipLookup: ClipLookup,
  nearest: NearestChunkQuery,
): Promise<ValidateCitationsResult>
// Returns { valid: readonly Citation[], dropped: ReadonlyArray<{ citation, reason }> }
```

**Note for Plan 03-03:** Regeneration policy (`if valid.length < 2`, regenerate once) belongs in the route handler — NOT in this function. `validateCitations` is a pure validator.

## computeClusters — Signature

```ts
// packages/core/src/swap/cluster.ts

export type TemplateEmbedding = {
  readonly templateId: string;
  readonly domain: Domain;
  readonly centroid: readonly number[];  // mean of template's clip embeddings, 1536-dim
};

export type ClusterAssignment = {
  readonly templateId: string;
  readonly clusterId: number | null;  // null = no clips
};

export function cosineDistance(a: readonly number[], b: readonly number[]): number

export function computeClusters(
  templates: readonly TemplateEmbedding[],
  k?: number,  // default 4
): readonly ClusterAssignment[]
```

**Determinism guarantees:** Seed = 42 (mulberry32 PRNG, reserved for future use). Primary determinism from lexicographic templateId sort. Same input → same output across any JS runtime.

## Test Results

| Package | Tests |
|---------|-------|
| @cited/core | 64 passed (13 test files) |
| @cited/core typecheck | clean (tsc --noEmit) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode rejected array element accesses in cluster.ts centroid recomputation loop**
- **Found during:** Task 3 (typecheck after implementation)
- **Issue:** `counts[c]` and `sums[c]` typed as `number | undefined` under `noUncheckedIndexedAccess` — plan's verbatim scaffold used direct arithmetic without null guards
- **Fix:** Added explicit `?? 0` and `!== undefined` guards; kept same algorithm semantics
- **Files modified:** `packages/core/src/swap/cluster.ts` (centroid recomputation section)
- **Commit:** 2aa0371

**2. [Rule 1 - Bug] Test 1 for computeClusters was untestable at n=5 with k=4**
- **Found during:** Task 3 (TDD RED→GREEN)
- **Issue:** With n=5 and k=4, seed indices are [0,1,2,4] → s-a and s-b (the two "close" templates) both become initial centroids → they are assigned to different clusters by definition, not by proximity
- **Fix:** Revised test to use n=8 templates (4 pole pairs at 0°/5°, 90°/91°, 180°/181°, 270°/271°). Non-seed templates (t-b, t-d, t-f, t-h at the near angles) correctly migrate to the same cluster as their pole seed
- **Files modified:** `packages/core/src/swap/cluster.test.ts`
- **Commit:** 2aa0371

## Known Stubs

None — all three library functions are fully implemented and tested. Migration 0009 is an intentional placeholder per the plan spec (actual cron + first batch lands in Plan 03-06).

## Self-Check: PASSED
