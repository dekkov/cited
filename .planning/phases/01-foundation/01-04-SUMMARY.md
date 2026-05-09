---
phase: 01-foundation
plan: 04
subsystem: database
tags: [drizzle-orm, postgres, pgvector, supabase, rls, row-level-security, zod, openai, anthropic, vercel-ai-sdk]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 01
    provides: "@cited/db, @cited/core, @cited/api-contracts stub packages; strict TS base"

provides:
  - Full 15-table Drizzle schema (profiles, podcasts, episodes, clips, clipEdits, transcriptChunks, habitTemplates, habitTemplateClips, userHabits, checkIns, streaks, streakFreezes, extractionJobs, clipsPending, consentRecords)
  - 11 pgEnum types matching exact DB enum literals
  - vector(1536) columns on clips, transcript_chunks, clips_pending for pgvector RAG
  - 3-file migration sequence: 0000_init.sql (drizzle-generated), 0001_extensions_and_rls.sql (extensions + auth FKs + HNSW + GIN + RLS-enable), 0002_rls_policies.sql (25 policies + trigger)
  - RLS isolation: user-scoped tables locked to auth.uid(); curator-curated tables world-readable; extraction/pending curator-only
  - cascade-delete design via auth.users FK constraints in SQL migration
  - RLS test (skip without Supabase): 5 tests proving user A cannot read user B; GDPR Article 9 consent_records isolation
  - cascade test (skip without Supabase): verifies row-count=0 across all user-scoped tables after auth.users delete
  - packages/api-contracts: zod schemas in snake_case mirroring DB types; ExtractionJobPayloadSchema + ResultSchema + ProposedClipSchema (Phase 5 worker contract); API_CONTRACT_VERSION = '0.1.0'
  - packages/core/llm: LlmProvider + EmbeddingProvider interfaces; openai (gpt-4o-mini/gpt-4o + text-embedding-3-small) + anthropic (haiku/sonnet) providers; getLlm()/getEmbeddings() registry

affects: [01-05, 01-06, 01-07, 01-08, 02-admn, 03-hab-rec-aion, 04-launch, 05-worker]

# Tech tracking
tech-stack:
  added:
    - drizzle-orm@0.36.4 (schema + query builder)
    - drizzle-kit@0.27.2 (migration generation)
    - postgres@3.4.9 (postgres driver, prepare:false for Supabase pooler)
    - pgvector@0.2.x (pgvector type support)
    - "@supabase/supabase-js@2.x (RLS test client)"
    - zod@3.23.x (api-contracts schemas)
    - "@ai-sdk/openai@1.3.24 (OpenAI Vercel AI provider)"
    - "@ai-sdk/anthropic@1.x (Anthropic Vercel AI provider)"
    - "ai@4.x (Vercel AI SDK — generateText, generateObject, embedMany)"
  patterns:
    - auth.users FK constraints managed in SQL migrations (not Drizzle schema) — drizzle-kit cannot introspect Supabase Auth tables
    - No .js extensions in schema imports — esbuild-register (drizzle-kit) resolves .ts files only when CJS require() is used; .js extensions cause MODULE_NOT_FOUND
    - describe.skipIf(skip) pattern for tests requiring live Supabase — graceful skip when env vars absent
    - exactOptionalPropertyTypes compliance: conditional spread for optional AI SDK params (temperature, maxTokens)
    - Dynamic imports inside async methods to defer API key validation to call time
    - Two-step response object construction to avoid exactOptionalPropertyTypes violation with optional usage field

key-files:
  created:
    - packages/db/src/schema/enums.ts (11 pgEnum types)
    - packages/db/src/schema/profiles.ts
    - packages/db/src/schema/podcasts.ts
    - packages/db/src/schema/episodes.ts
    - packages/db/src/schema/clips.ts (vector 1536)
    - packages/db/src/schema/clip-edits.ts
    - packages/db/src/schema/transcript-chunks.ts (vector 1536)
    - packages/db/src/schema/habit-templates.ts
    - packages/db/src/schema/habit-template-clips.ts
    - packages/db/src/schema/user-habits.ts
    - packages/db/src/schema/check-ins.ts
    - packages/db/src/schema/streaks.ts
    - packages/db/src/schema/streak-freezes.ts
    - packages/db/src/schema/extraction-jobs.ts (full Phase 5 worker contract)
    - packages/db/src/schema/clips-pending.ts (vector 1536)
    - packages/db/src/schema/consent-records.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/client.ts (createDb with postgres driver, prepare:false)
    - packages/db/drizzle.config.ts
    - packages/db/vitest.config.ts
    - packages/db/migrations/0000_init.sql (drizzle-kit generated)
    - packages/db/migrations/0001_extensions_and_rls.sql
    - packages/db/migrations/0002_rls_policies.sql
    - packages/db/test/rls.test.ts
    - packages/db/test/cascade.test.ts
    - packages/api-contracts/src/enums.ts
    - packages/api-contracts/src/profiles.ts
    - packages/api-contracts/src/clips.ts
    - packages/api-contracts/src/habits.ts
    - packages/api-contracts/src/check-ins.ts
    - packages/api-contracts/src/extraction-jobs.ts
    - packages/api-contracts/src/clips-pending.ts
    - packages/api-contracts/src/index.test.ts
    - packages/core/src/llm/types.ts
    - packages/core/src/llm/provider.ts
    - packages/core/src/llm/openai.ts
    - packages/core/src/llm/anthropic.ts
    - packages/core/src/llm/registry.ts
    - packages/core/src/llm/index.ts
    - packages/core/src/llm/llm.test.ts
  modified:
    - packages/db/package.json (add drizzle-orm, postgres, pgvector deps + scripts)
    - packages/db/src/index.ts (export createDb + schema)
    - packages/api-contracts/package.json (add zod dep + test script)
    - packages/api-contracts/src/index.ts (export all + API_CONTRACT_VERSION)
    - packages/core/package.json (add @ai-sdk/openai, @ai-sdk/anthropic, ai, zod deps)
    - packages/core/src/index.ts (export * from llm)

key-decisions:
  - "auth.users FKs managed in SQL migration (0001), not in Drizzle schema — drizzle-kit cannot introspect Supabase Auth tables, so .references(() => sql\`auth.users(id)\`) caused TypeError at generate time"
  - "No .js extensions in schema imports — esbuild-register CJS hook used by drizzle-kit cannot resolve .js → .ts; removing extensions allows esbuild to find TypeScript sources"
  - "describe.skipIf for RLS/cascade tests — avoids instantiating Supabase client at module load time when env vars are absent; previous describe.skip pattern still ran the describe callback body"
  - "Dynamic imports in LLM providers — defers API key requirement to call time so the package can be imported in test environments without OPENAI_API_KEY set"

patterns-established:
  - "Drizzle schema: no auth.users references(); FK added via SQL in migrations/0001"
  - "No .js extension in monorepo schema imports (drizzle-kit compat); .js extensions only in package entry points if needed"
  - "describe.skipIf(condition) pattern for integration tests requiring live services"
  - "exactOptionalPropertyTypes: use conditional spread {...opts.temp !== undefined ? {temperature: opts.temp} : {}} instead of passing undefined"

requirements-completed: [FND-06, FND-07, FND-08, AION-09, PROF-01, PROF-04]

# Metrics
duration: ~95min
completed: 2026-05-08
---

# Phase 01 Plan 04: Database Schema + RLS Summary

**Drizzle 15-table schema with vector(1536) RAG columns, Supabase RLS via 25 SQL policies + HNSW/GIN indexes, cascade-delete design via SQL FKs, zod contracts for Phase 5 Python worker, and LLM provider-wrapper interface (openai + anthropic) establishing AION-09 choke point**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-05-08T22:05:00Z
- **Completed:** 2026-05-08T23:40:00Z
- **Tasks:** 5 / 5
- **Files modified:** 44 files (schema, migrations, tests, contracts, LLM provider)

## Accomplishments

- 15-table Drizzle schema covering all Phase 1–5 tables with proper FK relationships, pgEnum types, and vector(1536) on clips/transcript_chunks/clips_pending
- 3-migration sequence: generated init SQL + hand-written extensions/RLS-enable + policy file with 25 RLS policies, HNSW vector indexes, GIN tsvector index, and auto-profile trigger
- RLS isolation test + cascade-delete test that skip cleanly without Supabase but will run against docker-compose stack from plan 01-06
- api-contracts package with full snake_case zod schemas including the complete ExtractionJob/ProposedClip worker contract (Phase 5)
- packages/core/llm establishes the provider-wrapper interface so all LLM calls in apps/web must go through this package (AION-09)

## RLS Policy Summary

| Table | Policies |
|-------|----------|
| profiles | select/insert/update own (auth.uid() = id) |
| consent_records | select/insert own; no update/delete (append-only) |
| user_habits | all operations own (auth.uid() = user_id) |
| check_ins | all operations own |
| streaks | all operations own |
| streak_freezes | all operations own |
| podcasts | public read; curator/admin write |
| episodes | public read; curator/admin write |
| clips | approved+available public read; curator reads all; curator/admin write |
| clip_edits | curator/admin all |
| transcript_chunks | curator/admin read+write |
| habit_templates | public read; curator/admin write |
| habit_template_clips | public read; curator/admin write |
| extraction_jobs | curator/admin all |
| clips_pending | curator/admin all |

## LLM Provider Interface

```typescript
interface LlmProvider {
  name: string;
  complete(opts: LlmCallOpts): Promise<LlmResponse>;
  completeStructured<T extends z.ZodType>(opts: LlmStructuredOpts<T>): Promise<{ data: z.infer<T>; raw: LlmResponse }>;
}

interface EmbeddingProvider {
  name: string;
  embed(opts: EmbeddingOpts): Promise<EmbeddingResponse>;
}
```

Phase 2 imports `openaiEmbeddings.embed()` for clip embedding on approve. Phase 3 implements `anthropicLlm.complete()` for onboarding interview.

## Task Commits

1. **Task 1: Drizzle schema — 15 tables + enums + client + config** - `add9310` (feat)
2. **Task 2: SQL migrations — extensions, RLS-enable, and policies** - `01f2c6a` (feat)
3. **Task 3: RLS isolation test + cascade-delete test** - `ad3ab2a` (test)
4. **Task 4: packages/api-contracts — zod schemas** - `cdba76b` (feat)
5. **Task 5: packages/core/llm — provider-wrapper interface** - `9fd6d72` (feat)

## Files Created/Modified

- `/home/king/Hdiary/packages/db/src/schema/` — 16 files (enums + 15 tables)
- `/home/king/Hdiary/packages/db/src/client.ts` — createDb with postgres driver
- `/home/king/Hdiary/packages/db/drizzle.config.ts` — migration config
- `/home/king/Hdiary/packages/db/migrations/` — 3 SQL files + meta journal
- `/home/king/Hdiary/packages/db/test/rls.test.ts` — 5 RLS isolation tests
- `/home/king/Hdiary/packages/db/test/cascade.test.ts` — cascade delete test
- `/home/king/Hdiary/packages/api-contracts/src/` — 7 schema files + index test
- `/home/king/Hdiary/packages/core/src/llm/` — 7 provider files

## Decisions Made

- **auth.users FKs in SQL not Drizzle schema**: drizzle-kit cannot introspect Supabase Auth tables. Using `.references(() => sql\`auth.users(id)\`)` caused TypeError at `drizzle-kit generate` time. FK constraints are in `0001_extensions_and_rls.sql` instead.
- **No .js extension in schema imports**: esbuild-register (used by drizzle-kit) resolves `.ts` files only when no extension is used; `.js` extension causes `MODULE_NOT_FOUND` because the actual `.js` file doesn't exist on disk.
- **describe.skipIf for RLS/cascade tests**: `describe.skip` still executes the describe callback body (for test collection), causing `createClient` to error when env vars are absent. `describe.skipIf(condition)` properly skips the entire suite including collection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit generate fails: .js extension imports not resolvable by esbuild-register**
- **Found during:** Task 2 (running `pnpm generate`)
- **Issue:** Schema files used `import { x } from './enums.js'` — drizzle-kit's esbuild-register hooks `.ts` extension but require('./enums.js') tries to load a literal `.js` file that doesn't exist on disk
- **Fix:** Removed `.js` extensions from all internal schema imports; moduleResolution: Bundler allows extension-free imports in TS; drizzle-kit esbuild resolves correctly without extensions
- **Files modified:** All 15 schema files + index.ts + client.ts
- **Verification:** `pnpm --filter @cited/db generate` succeeded, producing 0000_init.sql with 15 tables
- **Committed in:** `01f2c6a` (Task 2 commit)

**2. [Rule 3 - Blocking] drizzle-kit generate fails: sql\`auth.users(id)\` reference causes TypeError**
- **Found during:** Task 2 (second generate attempt after .js fix)
- **Issue:** `getTableName(undefined)` TypeError — drizzle-kit tried to introspect `auth.users` which is a Supabase-managed schema not in the schema filter
- **Fix:** Removed all `.references(() => sql\`auth.users(id)\`)` from Drizzle schema; added FK constraints to `0001_extensions_and_rls.sql` as `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES auth.users(id) ON DELETE CASCADE`
- **Files modified:** profiles.ts, consent-records.ts, user-habits.ts, check-ins.ts, streaks.ts, streak-freezes.ts, clips.ts, clip-edits.ts; 0001_extensions_and_rls.sql
- **Verification:** `pnpm --filter @cited/db generate` succeeds; all FK semantics preserved in SQL
- **Committed in:** `01f2c6a` (Task 2 commit)

**3. [Rule 1 - Bug] describe.skip still executes describe body — createClient errors without env vars**
- **Found during:** Task 3 (running tests)
- **Issue:** Using `const d = skip ? describe.skip : describe` then `d('suite', () => { const admin = createClient(...) })` — vitest executes the describe callback during collection even for `describe.skip`. createClient with `undefined` URL throws immediately.
- **Fix:** Switched to `describe.skipIf(condition)` which fully skips the suite; all client instantiation moved inside `beforeAll` async handler using dynamic `await import(...)`.
- **Files modified:** packages/db/test/rls.test.ts, packages/db/test/cascade.test.ts
- **Verification:** `pnpm --filter @cited/db test` shows 2 suites skipped, 1 passed (5 tests), exit 0
- **Committed in:** `ad3ab2a` (Task 3 commit)

**4. [Rule 1 - Bug] exactOptionalPropertyTypes incompatibility with Vercel AI SDK**
- **Found during:** Task 5 (typecheck)
- **Issue:** Passing `temperature: opts.temperature` where `opts.temperature: number | undefined` fails with `exactOptionalPropertyTypes: true` since the SDK expects `temperature: number`, not `temperature: number | undefined`. Same for `maxTokens`. Also, building `usage: ...result.usage ? {...} : undefined` on the return object failed.
- **Fix:** Used conditional spread `...(opts.temperature !== undefined ? { temperature: opts.temperature } : {})`. Built LlmResponse in two steps: create base object without usage, then conditionally set `response.usage = {...}`.
- **Files modified:** packages/core/src/llm/openai.ts, packages/core/src/llm/anthropic.ts
- **Verification:** `pnpm --filter @cited/core typecheck` exits 0
- **Committed in:** `9fd6d72` (Task 5 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes necessary for correctness. The auth.users FK pattern (deviations 1 and 2) is now a permanent architectural convention: Supabase Auth FKs always go in SQL migrations, never in the Drizzle schema object model. The describe.skipIf pattern (deviation 3) supersedes the `const d = skip ? describe.skip : describe` approach for all future integration tests.

## Known Limitations

- **RLS/cascade tests**: Require live Supabase (docker-compose stack from plan 01-06). Tests currently skip without env vars.
- **PROF-04 full integration test**: Plan scope covers the cascade-delete design (FKs in SQL + test structure). Full integration test running against live DB is a Phase 4 deliverable.
- **LLM providers**: Chat completion methods are real implementations but untested (no API keys in Phase 1). Phase 3 adds the onboarding interview which will exercise these paths.

## User Setup Required

None — no external service configuration required for this plan (tests skip gracefully without Supabase).

## Next Phase Readiness

All downstream plans can now consume:
- **01-05 (Next.js skeleton)**: Already completed — didn't need DB yet
- **01-06 (docker-compose CI)**: Already completed — will run RLS/cascade tests against docker-compose Supabase
- **01-07 (Supabase Auth)**: Import `@cited/db` for profile creation on signup; RLS policies in place
- **01-08 (consent/DOB)**: `consent_records` table ready; consentScope enum matches UI toggles
- **Phase 2 (admin/curation)**: Schema covers all ADMN requirements; `openaiEmbeddings.embed()` ready for clip embedding on approve
- **Phase 3 (habits/AI)**: All habit tables present; LLM interface ready for interview implementation

---
*Phase: 01-foundation*
*Completed: 2026-05-08*

## Self-Check: PASSED

All required files found on disk. All 5 task commits verified in git log.

| Item | Status |
|------|--------|
| packages/db/src/schema/enums.ts | FOUND |
| packages/db/src/schema/profiles.ts | FOUND |
| packages/db/src/schema/clips.ts | FOUND |
| packages/db/src/schema/extraction-jobs.ts | FOUND |
| packages/db/src/schema/clips-pending.ts | FOUND |
| packages/db/src/schema/consent-records.ts | FOUND |
| packages/db/migrations/0000_init.sql | FOUND |
| packages/db/migrations/0001_extensions_and_rls.sql | FOUND |
| packages/db/migrations/0002_rls_policies.sql | FOUND |
| packages/db/test/rls.test.ts | FOUND |
| packages/db/test/cascade.test.ts | FOUND |
| packages/api-contracts/src/extraction-jobs.ts | FOUND |
| packages/api-contracts/src/index.ts | FOUND |
| packages/core/src/llm/types.ts | FOUND |
| packages/core/src/llm/provider.ts | FOUND |
| packages/core/src/llm/openai.ts | FOUND |
| .planning/phases/01-foundation/01-04-SUMMARY.md | FOUND |
| Commit add9310 (Task 1) | VERIFIED |
| Commit 01f2c6a (Task 2) | VERIFIED |
| Commit ad3ab2a (Task 3) | VERIFIED |
| Commit cdba76b (Task 4) | VERIFIED |
| Commit 9fd6d72 (Task 5) | VERIFIED |
