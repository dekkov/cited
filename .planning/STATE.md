---
gsd_state_version: 1.0
milestone: v0.5
milestone_name: Extraction Worker
status: Phase 03 complete; ready to plan Phase 04
stopped_at: "Phase 03 (user-ai-loop-the-demo) complete. All 6 plans shipped + SUMMARYs written. UAT passed 13/13 on 2026-05-24. Ready to plan Phase 04: re-engagement + OSS polish + alpha launch."
last_updated: "2026-05-24T00:00:00Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 20
  completed_plans: 20
---

# Project State: Hdiary (working title — rename pre-launch)

**Initialized:** 2026-05-07
**Last updated:** 2026-05-07

## Project Reference

**Core Value:** Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker. If the evidence layer fails or feels generic, the project has no differentiator.

**Strategic Goal:** OSS traction (stars, contributors, self-hosters) + DOAC pitch readiness (non-objection ladder, endorsement aspirational). 12-month success metric: meaningful DOAC interaction + active OSS community.

**Current Focus:** Phase 03 — user-ai-loop-the-demo

## Current Position

Phase: 03 (user-ai-loop-the-demo) — EXECUTING
Plan: 1 of 6

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases complete | 0 / 5 |
| v1 requirements mapped | 107 / 107 ✓ |
| v1 requirements completed | 0 / 107 |
| Curated clips approved | 0 / 30 |
| Editorial hours spent (curation) | 0 / ~10–12 (with AI co-pilot) |
| Phase 01-foundation P01 | 56 | 3 tasks | 34 files |
| Phase 01-foundation P06 | 2 | 3 tasks | 11 files |
| Phase 01 P05 | 7 | 3 tasks | 27 files |
| Phase 01-foundation P04 | 95 | 5 tasks | 44 files |
| Phase 01-foundation P08 | 6 | 3 tasks | 12 files |
| Phase 01-foundation P07 | 30 | 5 tasks | 18 files |
| Phase 02-curation-tooling-doac-corpus P01 | 25 | 4 tasks | 21 files |
| Phase 02-curation-tooling-doac-corpus P06 | 232 | 3 tasks | 16 files |
| Phase 02-curation-tooling-doac-corpus P02 | 30 | 3 tasks | 13 files |
| Phase 02-curation-tooling-doac-corpus P03 | 30 | 3 tasks | 14 files |
| Phase 02-curation-tooling-doac-corpus P04 | 12 | 4 tasks | 32 files |
| Phase 02-curation-tooling-doac-corpus P05 | 60 | 4 tasks | 20 files |
| Phase 03-user-ai-loop-the-demo P01 | 375 | 3 tasks | 11 files |
| Phase 03 P02 | 5 | 3 tasks | 9 files |
| Phase 03-user-ai-loop-the-demo P03 | 10 | 3 tasks | 21 files |
| Phase 03 P04 | 8 | 2 tasks | 15 files |
| Phase 03-user-ai-loop-the-demo P04 | 66 | 2 tasks | 16 files |

## Accumulated Context

### Locked Decisions (from PROJECT.md Key Decisions — do not relitigate)

- **License:** MIT + DCO bot + relicense-reservation clause; lands before first public push.
- **Streak design:** "Streak Freeze" framing, 2 freezes/month banked max 4; streak demoted from primary UI; consistency view leads.
- **Domain coverage:** 4 domains (sleep / nutrition+gut / exercise+longevity / mental health).
- **DOAC pitch ladder:** Non-objection first (operational ask); endorsement aspirational only.
- **Stack:** Next.js 16 + React 19 + Tailwind v4 + Biome + Fumadocs + `<YouTubeEmbed>` (lite-embed via `@next/third-parties`); Supabase Auth at MVP (Better Auth as v2 target); Drizzle 0.36+; pgvector 0.8.2 with HNSW; OpenAI text-embedding-3-small; Claude Sonnet (synthesis) + Haiku 4.5 / GPT-4o-mini (interview turns).
- **Monorepo:** pnpm + Turborepo. `apps/web` with `(admin)` route group inside it (NOT a separate `apps/admin` app at MVP). `apps/worker/` is doc-only stub until v0.5/Phase 5.
- **Three-layer legal posture:** Copyright/fair-use + YouTube ToS + right-of-publicity — all addressed, not just "deep-link only."
- **GDPR Article 9 granular consent:** Separate toggles for account / health-adjacent / AI free-text analysis. Cascade erasure includes pgvector embeddings.
- **No clip length cap:** "as detailed as needed to convey the claim, not more" — fair-use rests harder on factors 1 (transformative) and 4 (drives traffic to DOAC).
- **Admin AI co-pilot + manual cutter + document ingestion:** In v1 (Phase 2). Lightweight stand-in for Phase 5's automated extraction pipeline; lets corpus expand to non-DOAC sources without waiting for the Whisper worker.
- **Sponsorship in scope:** Open Collective + GitHub Sponsors from launch with transparent burn-rate. No paid tiers, no VC.

### Open Decisions Still Needed

1. **Project name** — User produces ≥3 candidate names by end of Phase 1 (NAME-01). Hard-blocks Phase 4 alpha launch.
2. **Streak rule specifics** — Adopted: 2 freezes/month, max 4 banked. Confirm during Phase 3 design before any pixels ship.
3. **DOAC pitch frame confirmation** — Two-step ladder confirmed in Key Decisions; verify before Phase 5 outreach drafting.

### Pending Curation Hours

**Phase 2 line-item:** ~10–12 editorial hours for 30 clips × 4 domains (lowered from baseline ~15h by AI co-pilot ADMN-10). Scheduled as ~3–4 dedicated curation sessions distinct from engineering blocks. Weekly progress check: if curation slips past week 2 of Phase 2, re-evaluate clip-count target before extending the phase.

### Active Blockers

None — ready to begin Phase 1 planning.

### Active Todos

- [ ] User: produce ≥3 candidate project names (NAME-01) by end of Phase 1
- [ ] Run `/gsd:plan-phase 1` to decompose Phase 1 into executable plans

## Session Continuity

**Last session:** 2026-05-17 — Plan 03-04 closed. Pivot documented in SUMMARY addendum.

**Stopped at:** Plan 03-04 complete (Task 3 verified 2026-05-17). Wave 3 pending: plans 03-05 + 03-06.

**Next:** Execute Wave 3 — `/gsd:execute-phase 03` to run plans 03-05 (dashboard + check-in + graduation) and 03-06 (habit detail + swap + public page).

**Key context for resuming:**

- Phase 1 must complete before any user-facing feature can be built (schema + RLS + auth shells).
- Phase 2 cannot start until Phase 1 schema is locked (curation tools depend on the table set).
- Phase 3 cannot demo until Phase 2 has ≥30 approved clips with embeddings.
- Phase 4 cannot launch publicly until naming (NAME-02/03) completes.
- Phase 5 (DOAC pitch) needs Phase 4 alpha metrics to be credible.

---
*State initialized: 2026-05-07 by gsd-roadmapper*
