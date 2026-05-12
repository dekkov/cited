---
phase: 02-curation-tooling-doac-corpus
plan: 01
subsystem: db-schema
tags: [drizzle, postgres, pgvector, rls, migrations, transcripts, deepgram, shadcn]
requires:
  - "Phase 1 schema (clips, clip_edits, episodes, profiles, is_curator_or_admin helper)"
provides:
  - "transcripts table with tsvector GIN index for hybrid search"
  - "clip_edit_action enum (11 values) + clip_edits.action notNull + payload jsonb"
  - "clips removal columns (removed_at, removal_reason, removal_notes, takedown_ref_url)"
  - "episodes.source_unavailable_at + oembed_404_count for flap suppression"
  - "episode_blacklist table for LGL-03 takedown re-ingest prevention"
  - "aion10_fixture_candidates dev-only staging table (feeds Plan 06)"
  - "DEEPGRAM_API_KEY + CRON_SECRET env contract"
  - "shadcn primitives: dialog/tabs/select/textarea/checkbox/tooltip/badge/dropdown-menu/form/sonner"
affects:
  - "All subsequent Phase 2 plans depend on this schema (02-02 transcripts, 02-03 admin UI, 02-04 AI co-pilot, 02-05 removal)"
tech-stack:
  added:
    - "react-resizable-panels ^4.11 (admin layout split panes)"
    - "@dnd-kit/{core,sortable,utilities} (clip reorder UI)"
    - "@tanstack/react-virtual ^3.13 (transcript scrubber virtualization)"
    - "diff ^9 + @types/diff (AI suggestion diff view)"
    - "youtube-transcript-plus ^2 (captions fetch)"
    - "@deepgram/sdk ^5.1 (transcription fallback)"
    - "subtitle ^4.2 (WebVTT parsing)"
  patterns:
    - "tsvector GENERATED ALWAYS column — column not modeled in Drizzle TS; GIN index in migration SQL"
    - "RLS via helper function public.is_curator_or_admin() (profiles.id = auth.uid()) — reused, no new helper"
    - "Idempotent migrations: IF NOT EXISTS + DO $$ EXCEPTION WHEN duplicate_object$$ on enums + FKs"
    - "Backfill enum column before SET NOT NULL (Phase 1 rows defaulted to action='updated')"
key-files:
  created:
    - "packages/db/src/schema/transcripts.ts"
    - "packages/db/src/schema/episode-blacklist.ts"
    - "packages/db/src/schema/aion10-fixture-candidates.ts"
    - "packages/db/migrations/0003_phase2_transcripts.sql"
    - "packages/db/migrations/0004_phase2_clip_edits_extensions.sql"
    - "packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql"
    - "packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql"
    - "apps/web/components/ui/{dialog,tabs,select,textarea,checkbox,tooltip,badge,dropdown-menu,form,sonner}.tsx"
  modified:
    - "packages/db/src/schema/index.ts"
    - "packages/db/src/schema/enums.ts"
    - "packages/db/src/schema/clip-edits.ts"
    - "packages/db/src/schema/clips.ts"
    - "packages/db/src/schema/episodes.ts"
    - "packages/db/src/schema/schema.test.ts"
    - "apps/web/.env.example"
    - "apps/web/lib/env.ts"
    - "apps/web/package.json"
    - "packages/core/package.json"
decisions:
  - "Used sonner instead of deprecated shadcn toast (upstream guidance during install)"
  - "RLS policies use existing public.is_curator_or_admin() helper rather than inline EXISTS subqueries — matches Phase 1 contract, avoids duplicating the curator-role check across migrations"
  - "tsv column lives in SQL only (not in Drizzle TS schema) — drizzle-kit cannot model GENERATED ALWAYS columns; comment in transcripts.ts documents this"
  - "DEEPGRAM_API_KEY / CRON_SECRET marked optional in zod env schema (build-time absence allowed); runtime startup throw is left for the Plan 02 transcript-fetch implementation that actually needs the key"
metrics:
  duration: "~25 min"
  completed: "2026-05-12"
  tasks: 4
  commits: 4
---

# Phase 02 Plan 01: Data Model + Phase 2 Dependencies Summary

Locked the Phase 2 data model — `transcripts` (JSONB + tsvector GIN), extended `clip_edits` audit shape (`action` enum + `payload` jsonb), clip removal columns, `episodes.oembed_404_count` flap suppression, `episode_blacklist`, and the `aion10_fixture_candidates` dev-only staging table — plus published the Phase 2 npm dependency surface (transcript libs in `@cited/core`, UI libs + shadcn primitives in `apps/web`) and the `DEEPGRAM_API_KEY` / `CRON_SECRET` env contract. All four migrations carry curator/admin RLS via the existing `public.is_curator_or_admin()` helper.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Three new schema files + barrel exports | `2db0f44` | transcripts.ts, episode-blacklist.ts, aion10-fixture-candidates.ts, index.ts |
| 2 | Extend clip_edits/clips/episodes + clip_edit_action enum + tests | `e1d974a` | enums.ts, clip-edits.ts, clips.ts, episodes.ts, schema.test.ts |
| 3 | Four SQL migrations (transcripts/tsv GIN, clip_edits ext, clips removal + blacklist + oembed, fixtures) with RLS | `b0fa0a1` | migrations/0003–0006 |
| 4 | Install Phase 2 npm deps + shadcn primitives + DEEPGRAM_API_KEY / CRON_SECRET env contract | `7d05468` | apps/web/package.json, packages/core/package.json, apps/web/.env.example, lib/env.ts, components/ui/*.tsx |

## Verification

- `pnpm --filter @cited/db exec tsc --noEmit` — exits 0
- `pnpm --filter @cited/db exec vitest run schema.test.ts` — 13/13 tests pass (7 new phase-2-extensions assertions)
- All four migration files present with `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` clauses
- `pnpm install` from repo root — clean (lockfile up to date, no peer-dep errors)
- 10 shadcn primitives present in `apps/web/components/ui/`

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 — Adaptation] RLS policies use existing helper function instead of inline EXISTS subqueries**
- **Found during:** Task 3
- **Issue:** Plan SQL referenced `public.profiles` with `p.user_id = auth.uid()`, but Phase 1's `profiles` table keys on `id` (joined to `auth.users.id`) — the plan's Task 3 §note flagged this exact case and instructed the executor to mirror the Phase 1 reference style.
- **Fix:** All three RLS policies (`transcripts_*`, `episode_blacklist_curator_all`, `aion10_fixture_candidates_curator_all`) call the existing `public.is_curator_or_admin()` helper defined in `0002_rls_policies.sql`. Same security boundary, no duplicated subquery logic.
- **Files modified:** `0003_phase2_transcripts.sql`, `0005_phase2_clips_removal_episode_blacklist.sql`, `0006_phase2_aion10_fixture_candidates.sql`
- **Commit:** `b0fa0a1`

**2. [Rule 2 — Tooling guidance] Substituted `sonner` for deprecated `toast` shadcn primitive**
- **Found during:** Task 4
- **Issue:** `pnpm dlx shadcn@latest add … toast` printed "The toast component is deprecated. Use the sonner component instead." and silently produced no toast.tsx file.
- **Fix:** Re-ran with `sonner` in place of `toast`. `apps/web/components/ui/sonner.tsx` now exists; consumers in later plans import `Toaster` from sonner.
- **Files modified:** `apps/web/components/ui/sonner.tsx` (new)
- **Commit:** `7d05468`

**3. [Rule 3 — Workspace naming] Plan referenced `@hdiary/*` workspace package names; actual is `@cited/*`**
- **Found during:** All tasks
- **Issue:** Plan filter flag was `--filter @hdiary/db` and `--filter @hdiary/core`; actual `package.json` names are `@cited/db` and `@cited/core` (project was renamed from "Hdiary" to "Cited" before Phase 1 lock).
- **Fix:** Used `@cited/*` filters in all pnpm + verify commands.
- **No source change** — name-only adjustment in CI/exec commands.

## Auth Gates

None — Deepgram API key provisioning is documented in `.env.example` as a contributor-side step; no live key needed to land this schema-only plan. Plan 02 (transcript fetch) is where the key is actually required at runtime.

## Out-of-Scope Discoveries (Deferred)

- `Cited-design-reference/` directory and `compass_artifact_…markdown.md` exist as untracked at repo root — pre-existing, not part of this plan; left for the user/orchestrator.
- `apps/web/app/legal/`, `apps/web/components/disclaimer/`, `apps/web/e2e/legal-dmca.spec.ts`, `vitest.config.ts` modification — pre-existing untracked/modified files from prior phase 1 work, untouched by this plan.

## Known Stubs

None. Schema additions are fully wired (Drizzle TS + SQL + tests). The `tsv` column is documented as living in SQL only because Drizzle does not model `GENERATED ALWAYS` columns — this is by design, not a stub.

## Self-Check: PASSED

Verified files exist:
- `packages/db/src/schema/transcripts.ts` — FOUND
- `packages/db/src/schema/episode-blacklist.ts` — FOUND
- `packages/db/src/schema/aion10-fixture-candidates.ts` — FOUND
- `packages/db/migrations/0003_phase2_transcripts.sql` — FOUND
- `packages/db/migrations/0004_phase2_clip_edits_extensions.sql` — FOUND
- `packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql` — FOUND
- `packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql` — FOUND
- All 10 shadcn ui components — FOUND

Verified commits exist:
- `2db0f44` — FOUND
- `e1d974a` — FOUND
- `b0fa0a1` — FOUND
- `7d05468` — FOUND
