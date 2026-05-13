---
phase: 03-user-ai-loop-the-demo
plan: 01
subsystem: db-schema, packages/core
tags: [schema, migration, ai-sdk, zod, interview, retrieval, contracts]
dependency_graph:
  requires: [phase-02-complete]
  provides: [user_habits.status, habit_templates.cluster_id, interview_runs, HabitCandidateSchema, SynthesisOutputSchema, InterviewTurnOutputSchema, RankedClip, ClipRetrievalFilters, ai@6]
  affects: [03-02-hybrid-retrieval, 03-03-interview-synthesis-api, 03-04-onboarding-ui, 03-05-dashboard-checkin-graduation, 03-06-habit-detail-public-swap]
tech_stack:
  added: [ai@^6, @ai-sdk/react@^3, @ai-sdk/openai@^3, @ai-sdk/anthropic@^3]
  patterns: [drizzle-pgEnum, drizzle-jsonb, zod-structured-output, barrel-export, tdd-red-green]
key_files:
  created:
    - packages/db/src/schema/interview-runs.ts
    - packages/db/migrations/0008_phase3_schema_additions.sql
    - packages/core/src/retrieval/types.ts
    - packages/core/src/retrieval/index.ts
    - packages/core/src/interview/schemas.ts
    - packages/core/src/interview/schemas.test.ts
    - packages/core/src/interview/index.ts
  modified:
    - packages/db/src/schema/enums.ts
    - packages/db/src/schema/user-habits.ts
    - packages/db/src/schema/habit-templates.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/schema/schema.test.ts
    - packages/core/src/index.ts
    - packages/core/src/llm/openai.ts
    - packages/core/src/llm/anthropic.ts
    - packages/core/package.json
    - apps/web/package.json
    - CLAUDE.md
decisions:
  - "@ai-sdk/openai and @ai-sdk/anthropic bumped to ^3 (not ^2 as plan suggested) — plan was written when v2 was current; ^3 is the correct peer for ai@6"
  - "retrieval/types.ts Domain type re-exports from interview/schemas.ts to avoid barrel-level name collision — single source of truth for domain values"
  - "ai@6 usage field names changed: promptTokens->inputTokens, completionTokens->outputTokens — auto-fixed in openai.ts + anthropic.ts; values are number|undefined in v6, defaulted with ??"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-05-13"
  tasks_completed: 3
  files_changed: 11
---

# Phase 3 Plan 01: Schema Foundations Summary

Drizzle schema migrations, AI SDK v6 install, and typed contract surfaces (retrieval types + interview Zod schemas) committed. Wave 2 plans (03-02 through 03-06) can import `HabitCandidateSchema`, `SynthesisOutputSchema`, `RankedClip`, and `ClipRetrievalFilters` from `@cited/core` without writing them.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Drizzle migration + schema files | e608021 | interview-runs.ts, 0008_phase3_schema_additions.sql, enums.ts, user-habits.ts, habit-templates.ts |
| 2 | Install AI SDK v6 | 6b502a2 | packages/core/package.json, apps/web/package.json, CLAUDE.md |
| 3 | Stand up retrieval/ + interview/schemas.ts | 4a155f1 | retrieval/types.ts, interview/schemas.ts, interview/schemas.test.ts |

## Migration Filename

`packages/db/migrations/0008_phase3_schema_additions.sql`

## New Schema Files

- `packages/db/src/schema/interview-runs.ts` — Drizzle table for `interview_runs` (AION-05, REC-06)

## New Package Versions

| Package | Before | After |
|---------|--------|-------|
| `ai` (packages/core) | ^4 | ^6.0.182 |
| `@ai-sdk/openai` | ^1 | ^3.0.63 |
| `@ai-sdk/anthropic` | ^1 | ^3.0.77 |
| `ai` (apps/web) | (not installed) | ^6 |
| `@ai-sdk/react` (apps/web) | (not installed) | ^3.0.184 |

## New Zod Schemas Exported from @cited/core

- `DomainSchema` — z.enum of 4 health domains
- `CitationSchema` — clipId (uuid), claim, speaker
- `HabitCandidateSchema` — enforces min 2 citations (REC-02), trigger + tinyAction required (REC-04)
- `SynthesisOutputSchema` — enforces min 3 candidates (REC-01), non-empty gapDomains
- `InterviewTurnOutputSchema` — per-turn LLM output with questionText, choices (2–4), domain, citedClipIds, doneSignal

## New TypeScript Types Exported from @cited/core

- `ClipRetrievalFilters` — domains, excludeRiskFlags, excludeClipIds, speakerStatus
- `RankedClip` — clipId, similarityScore, vectorScore, textScore, claim, speaker, domain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ai@6` renamed usage token fields**
- **Found during:** Task 2
- **Issue:** `ai@6` SDK renamed `result.usage.promptTokens` → `inputTokens` and `completionTokens` → `outputTokens`; also changed types from `number` to `number | undefined`
- **Fix:** Updated both `openai.ts` and `anthropic.ts` to use `inputTokens ?? 0` and `outputTokens ?? 0`
- **Files modified:** `packages/core/src/llm/openai.ts`, `packages/core/src/llm/anthropic.ts`
- **Commit:** 6b502a2

**2. [Rule 1 - Bug] `@ai-sdk/openai` and `@ai-sdk/anthropic` are at `^3`, not `^2`**
- **Found during:** Task 2
- **Issue:** Plan specified `@ai-sdk/openai@^2` and `@ai-sdk/anthropic@^2` but the current pairing with `ai@6` is `^3` (npm registry confirmed)
- **Fix:** Installed `^3` versions — the correct peer dependency resolution
- **Files modified:** `packages/core/package.json`
- **Commit:** 6b502a2

**3. [Rule 1 - Bug] TypeScript barrel-level `Domain` name collision**
- **Found during:** Task 3
- **Issue:** Both `retrieval/types.ts` and `interview/schemas.ts` defined `Domain` type; re-exporting both via `src/index.ts` caused `TS2308: Module has already exported a member named 'Domain'`
- **Fix:** `retrieval/types.ts` imports `Domain` from `interview/schemas.ts` and re-exports it — single source of truth
- **Files modified:** `packages/core/src/retrieval/types.ts`
- **Commit:** 4a155f1

## Test Results

| Package | Tests |
|---------|-------|
| @cited/db | 17 passed (6 skipped — integration tests require Postgres) |
| @cited/core | 47 passed (10 test files) |
| @cited/web | typecheck clean |

## Known Stubs

None — all schema objects and Zod schemas are fully implemented. `hybridRetrieve.ts` and `stateMachine.ts` are correctly deferred to Plan 03-02 per the plan spec.

## Self-Check: PASSED
