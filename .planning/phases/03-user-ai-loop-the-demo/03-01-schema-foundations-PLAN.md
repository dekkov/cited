---
phase: 03-user-ai-loop-the-demo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/db/src/schema/enums.ts
  - packages/db/src/schema/user-habits.ts
  - packages/db/src/schema/habit-templates.ts
  - packages/db/src/schema/interview-runs.ts
  - packages/db/src/schema/index.ts
  - packages/db/migrations/0008_phase3_schema_additions.sql
  - packages/core/src/retrieval/types.ts
  - packages/core/src/retrieval/index.ts
  - packages/core/src/interview/schemas.ts
  - packages/core/src/index.ts
  - packages/core/package.json
  - apps/web/package.json
  - pnpm-lock.yaml
autonomous: true
requirements:
  - AION-01
  - AION-02
  - AION-05
  - REC-04
  - REC-06
  - SWAP-02
  - HAB-09
user_setup: []
must_haves:
  truths:
    - "user_habits.status column exists with values active|archived|graduated and archivedAt/graduatedAt timestamps"
    - "habit_templates.cluster_id column exists (nullable INT)"
    - "interview_runs table exists with id, userId, runIndex, profileJson, candidatesJson, startedAt, completedAt"
    - "ai@^6 and @ai-sdk/react are installed in apps/web; ai@^6 + @ai-sdk/{openai,anthropic} installed in packages/core"
    - "packages/core/src/retrieval/ exists with type exports and a barrel index"
    - "packages/core/src/interview/schemas.ts exports HabitCandidateSchema, CitationSchema, SynthesisOutputSchema, InterviewTurnOutputSchema"
  artifacts:
    - path: "packages/db/src/schema/interview-runs.ts"
      provides: "Drizzle schema for interview_runs"
      contains: "export const interviewRuns = pgTable"
    - path: "packages/db/migrations/0008_phase3_schema_additions.sql"
      provides: "Migration adding user_habits.status enum, archivedAt, graduatedAt, habit_templates.cluster_id, interview_runs table, HNSW index check, GIN tsvector index on clips"
      contains: "ALTER TABLE user_habits"
    - path: "packages/core/src/interview/schemas.ts"
      provides: "Zod schemas for interview/synthesis structured output"
      contains: "HabitCandidateSchema"
    - path: "packages/core/src/retrieval/types.ts"
      provides: "Shared retrieval types (ClipRetrievalFilters, RankedClip)"
      contains: "export type RankedClip"
  key_links:
    - from: "packages/db/src/schema/index.ts"
      to: "interview-runs.ts"
      via: "barrel re-export"
      pattern: "export \\* from './interview-runs'"
    - from: "packages/core/src/index.ts"
      to: "retrieval and interview subpaths"
      via: "barrel re-exports"
      pattern: "export \\* from './retrieval'"
---

<objective>
Land all schema migrations and library skeletons that downstream plans depend on. This is the blocking foundation: Plans 03-02..03-06 cannot start until this completes.

Purpose: Add `user_habits.status` (D-09 graduation), `habit_templates.cluster_id` (SWAP-02), `interview_runs` table (AION-05, REC-06). Install AI SDK v6 across the monorepo. Stand up `packages/core/src/retrieval/` and `packages/core/src/interview/schemas.ts` as the contract surfaces other plans implement against.

Output: Migrated DB, locked Zod schemas, library skeletons, ai@6 installed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@packages/db/src/schema/user-habits.ts
@packages/db/src/schema/habit-templates.ts
@packages/db/src/schema/enums.ts
@packages/db/src/schema/index.ts
@packages/core/src/llm/grounding/similarityCheck.ts

<interfaces>
Current `userHabits` (packages/db/src/schema/user-habits.ts) has: id, userId, habitTemplateId, frequency, customDays, timeOfDay, active (boolean), createdAt, updatedAt. **Missing: status, archivedAt, graduatedAt.**

Current `habitTemplates` (packages/db/src/schema/habit-templates.ts) has: id, slug, title, description, domain, trigger, tinyAction, defaultFrequency, createdAt, updatedAt. **Missing: cluster_id.**

Current `enums.ts` includes clipDomain enum: ['sleep','nutrition_gut','exercise_longevity','mental_health'] — reuse verbatim in Zod.

Phase 2 grounding (packages/core/src/llm/grounding/similarityCheck.ts) exports:
```typescript
export const GROUNDING_THRESHOLD = 0.85;
export type NearestChunkQuery = (vec: number[], clipId: string) => Promise<number | null>;
export async function groundingCheck(nearest, quotedSpan, clipId): Promise<number>;
```
Reuse this in plan 03-03 — do not duplicate.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Drizzle migration + schema files for user_habits.status, habit_templates.cluster_id, interview_runs</name>
  <read_first>
    - packages/db/src/schema/user-habits.ts (current shape)
    - packages/db/src/schema/habit-templates.ts (current shape)
    - packages/db/src/schema/enums.ts (existing pgEnum patterns)
    - packages/db/src/schema/index.ts (barrel export pattern)
    - packages/db/migrations/ (look at most recent migration file to mirror naming + style)
    - packages/db/src/schema/transcripts.ts and clips.ts (RLS comments + how userId/cascade is documented)
  </read_first>
  <behavior>
    - Test 1: `pnpm --filter @cited/db test` passes — schema.test.ts continues to pass after additions
    - Test 2: New test in packages/db/src/schema/schema.test.ts asserts userHabits has columns `status`, `archivedAt`, `graduatedAt`
    - Test 3: New test asserts habitTemplates has column `clusterId`
    - Test 4: New test asserts interviewRuns has columns id, userId, runIndex, profileJson, candidatesJson, startedAt, completedAt
  </behavior>
  <action>
    1. Add new pgEnum to `packages/db/src/schema/enums.ts`:
       ```ts
       export const userHabitStatus = pgEnum('user_habit_status', ['active', 'archived', 'graduated']);
       ```

    2. Modify `packages/db/src/schema/user-habits.ts` — add three columns (preserve immutability: new object via spread of existing definition is not applicable; add columns to the `pgTable` object literal):
       ```ts
       status: userHabitStatus('status').notNull().default('active'),
       archivedAt: timestamp('archived_at', { withTimezone: true }),
       graduatedAt: timestamp('graduated_at', { withTimezone: true }),
       ```
       Import `userHabitStatus` from './enums'.

    3. Modify `packages/db/src/schema/habit-templates.ts` — add:
       ```ts
       clusterId: integer('cluster_id'),  // nullable; computed weekly by pg_cron (Plan 03-06 will run first batch)
       ```
       Import `integer` from 'drizzle-orm/pg-core'.

    4. Create `packages/db/src/schema/interview-runs.ts`:
       ```ts
       import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

       // userId references auth.users(id) on delete cascade — FK managed in migration SQL (auth schema not introspectable).
       export const interviewRuns = pgTable('interview_runs', {
         id: uuid('id').primaryKey().defaultRandom(),
         userId: uuid('user_id').notNull(),
         runIndex: integer('run_index').notNull(), // 1-based; user's nth interview
         profileJson: jsonb('profile_json'),       // SynthesisOutputSchema.profileSummary; null while in-progress
         candidatesJson: jsonb('candidates_json'), // HabitCandidate[]; null while in-progress
         startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
         completedAt: timestamp('completed_at', { withTimezone: true }), // null = still running (D-03 "tell me more" pending)
       });
       ```

    5. Update `packages/db/src/schema/index.ts` to add `export * from './interview-runs';`.

    6. Create migration `packages/db/migrations/0008_phase3_schema_additions.sql` (use next sequential number — check existing migrations dir for actual N):
       ```sql
       -- Phase 3 schema additions
       CREATE TYPE user_habit_status AS ENUM ('active', 'archived', 'graduated');

       ALTER TABLE user_habits
         ADD COLUMN status user_habit_status NOT NULL DEFAULT 'active',
         ADD COLUMN archived_at TIMESTAMPTZ,
         ADD COLUMN graduated_at TIMESTAMPTZ;

       ALTER TABLE habit_templates
         ADD COLUMN cluster_id INTEGER;

       CREATE TABLE interview_runs (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
         run_index INTEGER NOT NULL,
         profile_json JSONB,
         candidates_json JSONB,
         started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         completed_at TIMESTAMPTZ,
         UNIQUE (user_id, run_index)
       );

       -- RLS: owner-only
       ALTER TABLE interview_runs ENABLE ROW LEVEL SECURITY;
       CREATE POLICY interview_runs_owner_select ON interview_runs FOR SELECT USING (user_id = auth.uid());
       CREATE POLICY interview_runs_owner_insert ON interview_runs FOR INSERT WITH CHECK (user_id = auth.uid());
       CREATE POLICY interview_runs_owner_update ON interview_runs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

       -- Hybrid retrieval indexes (verify existence; create if missing)
       CREATE INDEX IF NOT EXISTS clips_embedding_hnsw_idx ON clips USING hnsw (embedding vector_cosine_ops);
       CREATE INDEX IF NOT EXISTS clips_claim_fts_gin_idx ON clips USING gin (to_tsvector('english', coalesce(claim, '') || ' ' || coalesce(rationale, '')));
       CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_hnsw_idx ON transcript_chunks USING hnsw (embedding vector_cosine_ops);
       ```
       (If migration numbering differs in repo, use the next available number — check `ls packages/db/migrations/` first.)

    7. Add tests to `packages/db/src/schema/schema.test.ts` per the behavior block — assert column names exist via `Object.keys(userHabits)` / `habitTemplates` / `interviewRuns`.

    Constraints: Immutable style — append fields to pgTable definitions, do not mutate existing field shapes. Per D-09 we want `status='graduated'` set by check-in server action when streak hits 21; user choice to archive flips to `'archived'` + sets `archivedAt`. Per HAB-09, hide-streak rule reads `streak.currentLength >= 30` — no schema change needed.
  </action>
  <verify>
    <automated>pnpm --filter @cited/db test &amp;&amp; pnpm --filter @cited/db typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "userHabitStatus" packages/db/src/schema/enums.ts` returns 0
    - `grep -q "status: userHabitStatus" packages/db/src/schema/user-habits.ts` returns 0
    - `grep -q "clusterId: integer" packages/db/src/schema/habit-templates.ts` returns 0
    - `test -f packages/db/src/schema/interview-runs.ts`
    - `grep -q "export \* from './interview-runs'" packages/db/src/schema/index.ts` returns 0
    - `ls packages/db/migrations/*phase3* 2>/dev/null` finds the migration file
    - `grep -q "CREATE TYPE user_habit_status" packages/db/migrations/*phase3*.sql` returns 0
    - `grep -q "CREATE TABLE interview_runs" packages/db/migrations/*phase3*.sql` returns 0
    - `grep -q "USING hnsw" packages/db/migrations/*phase3*.sql` returns 0
    - `grep -q "USING gin" packages/db/migrations/*phase3*.sql` returns 0
    - `pnpm --filter @cited/db test` exits 0
  </acceptance_criteria>
  <done>Schema migration committed; downstream plans can import userHabits.status, habitTemplates.clusterId, interviewRuns.</done>
</task>

<task type="auto">
  <name>Task 2: Install AI SDK v6 in apps/web and packages/core; verify provider wrappers compile</name>
  <read_first>
    - apps/web/package.json (current deps — note: `ai` is NOT listed; needs add)
    - packages/core/package.json (currently has ai@^4, @ai-sdk/openai@^1, @ai-sdk/anthropic@^1 — must bump)
    - packages/core/src/llm/openai.ts and anthropic.ts (current SDK usage — verify it tolerates a bump or wrap behind provider interface)
    - packages/core/src/llm/provider.ts and types.ts (the provider interface that must not change)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Standard Stack" (verified versions)
  </read_first>
  <action>
    1. In `apps/web`, add deps (workspace, latest within v6 major):
       ```
       pnpm --filter @cited/web add ai@^6 @ai-sdk/react
       ```

    2. In `packages/core`, bump:
       ```
       pnpm --filter @cited/core add ai@^6 @ai-sdk/openai@^2 @ai-sdk/anthropic@^2
       ```
       (Verify exact major of `@ai-sdk/openai` / `@ai-sdk/anthropic` paired with `ai@6` via `npm view @ai-sdk/openai peerDependencies` first; if peer requires v1 with ai@6, leave at ^1.)

    3. If `packages/core/src/llm/openai.ts` or `anthropic.ts` breaks against new SDK versions, adapt them — but the EXTERNAL `LlmProvider` interface in `packages/core/src/llm/provider.ts` MUST remain byte-identical. Re-run `pnpm --filter @cited/core test` to catch regressions.

    4. Update `CLAUDE.md` — find the line `**Vercel AI SDK 5.x** (..., 5.x or 5.x ...)` in the Supporting Libraries table and the bullet under "Recommended Stack". Change `5.x` to `6.x`. Add a one-line note: "v6 introduces `UIMessage.parts` array (was `content` string in v5) and `convertToModelMessages` / `DefaultChatTransport`."

    5. Do NOT introduce direct `@ai-sdk/*` imports in `apps/web` routes — that's reserved for Plan 03-02 inside the existing `packages/core/src/llm/*` wrapper. This task only installs; usage lands in Wave 2.
  </action>
  <verify>
    <automated>pnpm install --frozen-lockfile=false &amp;&amp; pnpm --filter @cited/core test &amp;&amp; pnpm --filter @cited/web typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q '"ai": "\^6' apps/web/package.json` returns 0
    - `grep -q '"@ai-sdk/react"' apps/web/package.json` returns 0
    - `grep -q '"ai": "\^6' packages/core/package.json` returns 0
    - `grep -r "Vercel AI SDK 5" CLAUDE.md` returns 1 (no matches — bumped to 6.x)
    - `grep -q "Vercel AI SDK.*6\.x" CLAUDE.md` returns 0
    - `pnpm --filter @cited/core test` exits 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>ai@6 installed monorepo-wide; existing tests still pass; CLAUDE.md reflects v6.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Stand up packages/core/src/retrieval/ + packages/core/src/interview/schemas.ts contract surfaces</name>
  <read_first>
    - packages/core/src/llm/grounding/similarityCheck.ts (existing pattern: thin types + test-seam + caller-supplied DB query)
    - packages/core/src/index.ts (barrel pattern)
    - packages/db/src/schema/enums.ts (clipDomain values — reuse for Zod enums)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 1: Retrieval-as-a-library" and "Habit-candidate Zod schema"
  </read_first>
  <behavior>
    - Test 1: schemas.test.ts — `HabitCandidateSchema.parse({...})` rejects when `citations.length < 2` (REC-02)
    - Test 2: `HabitCandidateSchema.parse({...})` rejects when `trigger` missing or `tinyAction` missing (REC-04)
    - Test 3: `SynthesisOutputSchema.parse({...})` rejects when `candidates.length < 3` (REC-01 floor)
    - Test 4: `SynthesisOutputSchema.parse({...})` rejects when `gapDomains` empty
    - Test 5: retrieval types — `RankedClip` and `ClipRetrievalFilters` are exported from `packages/core/src/retrieval/index.ts`
  </behavior>
  <action>
    1. Create `packages/core/src/retrieval/types.ts`:
       ```ts
       export type Domain = 'sleep' | 'nutrition_gut' | 'exercise_longevity' | 'mental_health';

       export type ClipRetrievalFilters = {
         readonly domains?: readonly Domain[];
         readonly excludeRiskFlags?: readonly string[];   // e.g. ['supplement','medical_advice','contraindication']
         readonly excludeClipIds?: readonly string[];     // for swap
         readonly speakerStatus?: readonly ('verified' | 'unverified' | 'host')[];
       };

       export type RankedClip = {
         readonly clipId: string;
         readonly similarityScore: number;  // RRF-combined
         readonly vectorScore: number;
         readonly textScore: number;
         readonly claim: string;
         readonly speaker: string;
         readonly domain: Domain;
       };
       ```

    2. Create `packages/core/src/retrieval/index.ts`:
       ```ts
       export * from './types';
       // hybridRetrieve.ts ships in Plan 03-02.
       ```

    3. Create `packages/core/src/interview/schemas.ts` (full contract used by Plans 03-02..03-06):
       ```ts
       import { z } from 'zod';

       export const DomainSchema = z.enum([
         'sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health',
       ]);
       export type Domain = z.infer<typeof DomainSchema>;

       export const CitationSchema = z.object({
         clipId: z.string().uuid(),
         claim: z.string().min(1),       // model-quoted; revalidated by groundingCheck
         speaker: z.string().min(1),
       });
       export type Citation = z.infer<typeof CitationSchema>;

       export const HabitCandidateSchema = z.object({
         templateSlug: z.string().min(1),
         title: z.string().min(8).max(80),
         rationale: z.string().min(20).max(280),
         domain: DomainSchema,
         trigger: z.string().min(8),                    // REC-04: implementation-intention (when/where)
         tinyAction: z.string().min(4).max(80),         // REC-04: BJ Fogg minimum
         citations: z.array(CitationSchema).min(2).max(3),  // REC-02
       });
       export type HabitCandidate = z.infer<typeof HabitCandidateSchema>;

       export const SynthesisOutputSchema = z.object({
         profileSummary: z.object({
           gapDomains: z.array(DomainSchema).min(1),
           summaries: z.record(DomainSchema, z.string()),  // per-domain one-sentence summary
         }),
         candidates: z.array(HabitCandidateSchema).min(3).max(5),  // REC-01
       });
       export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

       // Per-turn structured output emitted by interview turn LLM
       export const InterviewTurnOutputSchema = z.object({
         questionText: z.string().min(3),                              // ≤3-sentence discipline enforced at prompt level
         choices: z.array(z.object({
           id: z.string(),
           label: z.string().min(1).max(80),
         })).min(2).max(4),                                            // D-01: 3–4 chips (allow 2 for yes/no)
         domain: DomainSchema.optional(),                              // the domain this turn explores
         citedClipIds: z.array(z.string().uuid()).default([]),         // grounding evidence
         doneSignal: z.boolean().default(false),                       // model thinks interview is done
       });
       export type InterviewTurnOutput = z.infer<typeof InterviewTurnOutputSchema>;
       ```

    4. Create `packages/core/src/interview/index.ts`:
       ```ts
       export * from './schemas';
       // stateMachine.ts, voiceSpec.ts, tools.ts ship in Plan 03-02.
       ```

    5. Update `packages/core/src/index.ts` — add:
       ```ts
       export * from './retrieval';
       export * from './interview';
       ```

    6. Write `packages/core/src/interview/schemas.test.ts` covering all 5 behaviors. Use Vitest patterns mirroring `packages/core/src/llm/grounding/similarityCheck.test.ts`.
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test &amp;&amp; pnpm --filter @cited/core typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/retrieval/types.ts`
    - `test -f packages/core/src/retrieval/index.ts`
    - `test -f packages/core/src/interview/schemas.ts`
    - `test -f packages/core/src/interview/schemas.test.ts`
    - `grep -q "HabitCandidateSchema" packages/core/src/interview/schemas.ts` returns 0
    - `grep -q "citations: z.array(CitationSchema).min(2).max(3)" packages/core/src/interview/schemas.ts` returns 0
    - `grep -q "export \* from './retrieval'" packages/core/src/index.ts` returns 0
    - `grep -q "export \* from './interview'" packages/core/src/index.ts` returns 0
    - `pnpm --filter @cited/core test -- schemas` exits 0
  </acceptance_criteria>
  <done>Contract surfaces locked: Plans 03-02..03-06 import HabitCandidateSchema, SynthesisOutputSchema, RankedClip from @cited/core without ambiguity.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @cited/db test` passes
- `pnpm --filter @cited/core test` passes
- `pnpm --filter @cited/web typecheck` passes
- Migration SQL applies cleanly against a fresh local Postgres (manual: `pnpm db:migrate` or `psql -f packages/db/migrations/0008_phase3_schema_additions.sql`)
- CLAUDE.md says "Vercel AI SDK 6.x"
</verification>

<success_criteria>
All schema additions, AI SDK v6 install, and contract surfaces (retrieval types + interview schemas) committed. Wave 2 plans can import these without writing them.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-01-SUMMARY.md` listing: migration filename, new schema files, new package versions, new Zod schemas exported.
</output>
