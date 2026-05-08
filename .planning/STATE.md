# Project State: Hdiary (working title — rename pre-launch)

**Initialized:** 2026-05-07
**Last updated:** 2026-05-07

## Project Reference

**Core Value:** Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker. If the evidence layer fails or feels generic, the project has no differentiator.

**Strategic Goal:** OSS traction (stars, contributors, self-hosters) + DOAC pitch readiness (non-objection ladder, endorsement aspirational). 12-month success metric: meaningful DOAC interaction + active OSS community.

**Current Focus:** Phase 1 — Foundation. Goal is repo + schema + RLS + auth + granular GDPR consent + three-layer legal posture + OSS hygiene scaffolding live before any clip or user-facing feature is built.

## Current Position

**Phase:** 1 — Foundation
**Plan:** None yet (awaiting `/gsd:plan-phase 1`)
**Status:** Roadmap approved; planning not started
**Progress:** ▱▱▱▱▱ 0% (0/5 phases complete)

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases complete | 0 / 5 |
| v1 requirements mapped | 107 / 107 ✓ |
| v1 requirements completed | 0 / 107 |
| Curated clips approved | 0 / 30 |
| Editorial hours spent (curation) | 0 / ~10–12 (with AI co-pilot) |

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

**Last session:** Initialization. PROJECT.md → REQUIREMENTS.md → research artifacts (STACK / FEATURES / ARCHITECTURE / PITFALLS / SUMMARY) → ROADMAP.md created with 5 phases mapping all 107 v1 requirements.

**Next session:** Begin Phase 1 planning via `/gsd:plan-phase 1`. Phase 1 should decompose into plans covering: (a) repo bootstrap + monorepo + Biome + Husky + docker-compose CI smoke, (b) Drizzle schema + RLS policies + extraction_jobs/clips_pending placeholders + api-contracts zod schemas, (c) Supabase Auth integration with magic-link + Google OAuth + granular GDPR consent UI + DOB gate + disclaimer ack, (d) OSS hygiene: LICENSE / CONTRIBUTING / DCO bot / CODE_OF_CONDUCT / MEDICAL_REVIEW / issue templates / gitleaks / Open Collective.

**Key context for resuming:**
- Phase 1 must complete before any user-facing feature can be built (schema + RLS + auth shells).
- Phase 2 cannot start until Phase 1 schema is locked (curation tools depend on the table set).
- Phase 3 cannot demo until Phase 2 has ≥30 approved clips with embeddings.
- Phase 4 cannot launch publicly until naming (NAME-02/03) completes.
- Phase 5 (DOAC pitch) needs Phase 4 alpha metrics to be credible.

---
*State initialized: 2026-05-07 by gsd-roadmapper*
