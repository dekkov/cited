# Project Research Summary

**Project:** Hdiary (working title — rename pre-launch)
**Domain:** Open-source, evidence-backed health habit tracker grounded in podcast clips (DOAC-only at MVP)
**Researched:** 2026-05-07
**Confidence:** HIGH on stack/features/architecture; HIGH on pitfalls; MEDIUM on DOAC pitch dynamics

## Executive Summary

Hdiary is a Next.js 16 + Supabase + Drizzle + pgvector web app whose differentiator is a curated, deep-linked podcast-clip evidence layer (DOAC-only at MVP) attached to AI-recommended health habits. Research converges strongly on the working tech stack with five forced bumps from PROJECT.md's working assumption: **Next.js 16 (not 15), Tailwind v4, Biome (not ESLint+Prettier), Fumadocs (not Astro Starlight), and lite-youtube-embed via `@next/third-parties`**. Supabase Auth stays at MVP because RLS-via-JWT is the deciding feature; Better Auth is the documented v2 migration target. Background jobs default to Supabase pg_cron at MVP; defer Inngest/Trigger.dev until the Phase 2 Python extraction worker actually lands.

The dual goal — OSS traction plus a DOAC pitch — reshapes priority away from behavior-change-at-scale toward demo polish, legal posture, and contributor onramps. The strict critical path to a Loom-able demo: auth + disclaimer → seeded clip corpus (people-time, ~15 hours editorial) → RAG service → AI onboarding interview → habit cards with embedded clip + DOAC CTA → daily check-in + Streak-Freeze → public `/h/[slug]` pages → habit swap. Everything else (history view, email digest, OSS hygiene polish, GDPR export) is necessary for the *product* but not for the *demo recording* — this is the lever for sequencing.

The sharpest risks are not technical: (1) GDPR Article 9 special-category-data treatment must be designed in from Phase 1, not retrofitted; (2) "deep-link only" is not a complete legal defense — three layers (copyright, YouTube ToS, right-of-publicity) all apply; (3) the DOAC pitch dies on strategic mismatch unless framed as *non-objection* not *endorsement*; (4) streak mechanics implemented as Duolingo-style loss-frame counters cause measurable churn in health apps — adopt "Streak Freeze" framing and demote streak from primary UI; (5) solo-maintainer triage death spiral is the dominant post-launch failure mode — automation and templates land *before* the repo is public.

## Top 5 Actionable Findings (Highest Leverage)

1. **Curated DOAC corpus is the binding constraint, not code.** ~30 clips × ~30 min curation = ~15 editorial hours. Schedule as a first-class roadmap line item, not bundled into engineering. Without a populated corpus, the AI interview demo has nothing to RAG against.
2. **Pitch *non-objection*, not *endorsement* — and have a Plan B corpus ready.** PROJECT.md's "endorsement / public co-sign" carries lawyer-killing liability for DOAC. Two-step ladder: non-objection first (easy yes), endorsement aspirational. Maintain a private expansion bench (Attia, FoundMyFitness, ZOE, Sigma Nutrition).
3. **Three-layer legal posture, not one.** Copyright/fair-use (transcripts + claim summaries), YouTube ToS (never disable player chrome, keep Watch-on-YouTube affordance, document Referer-Policy for self-hosters), right-of-publicity (attribute the named credentialed guest, never imply endorsement). Bake into Phase 1.
4. **GDPR Article 9 explicit, granular consent from day one.** App processes special-category data the moment it asks about sleep, anxiety, or gut symptoms. Single "I accept" checkbox = violation. Separate consent toggles for (a) account, (b) health-adjacent processing, (c) AI/LLM analysis of free-text. Cascade erasure must include pgvector embeddings.
5. **Streak Freeze framing + demote streak from primary UI.** 2025 retention data: >2 streak notifications/week = +41% abandonment. Lead with consistency view ("18/21 last 3 weeks"); streak is secondary. Gain-frame ("1 freeze available") not loss-frame. No red, no flame, no shame UI for missed days.

## Stack Decisions (Locked at MVP)

**Core:** Next.js 16 + React 19 + TS 5.6+ strict; Tailwind v4 + shadcn/ui; Postgres 17.3+ + pgvector 0.8.2 (HNSW cosine); Supabase (Auth + Postgres + RLS + Storage); Drizzle 0.36+; OpenAI `text-embedding-3-small` (abstract for Voyage swap); Anthropic Claude Sonnet 4.x (extraction/synthesis) + Haiku 4.5/GPT-4o-mini (interview turns); `<YouTubeEmbed>` from `@next/third-parties` (lite-embed).

**Tooling:** pnpm + Turborepo + Biome + Husky + lint-staged; Vitest + RTL + Playwright; Vercel + Hetzner CX22 (Phase 2) + Docker Compose; Fumadocs; drizzle-kit migrations + co-located RLS policy SQL.

**Avoid:** Next.js Pages Router; Prisma with pgvector (Unsupported escape hatch); Pinecone/Weaviate (second datastore for <10K vectors); Auth.js v5 (security-patch only since Sept 2025); Clerk/Auth0 (kills self-host); raw YouTube `<iframe>` (~500KB/video); IVFFlat for pgvector; AGPL-3.0 (kills DOAC pitch + adoption).

## Phase 1 / Phase 2 Split Clarity

| Concern | Phase 1 (MVP foundation) | Phase 2 (curation + tooling) | Phase 3 (user AI loop) | Phase 4 (re-engagement + alpha) | Phase 5 (pitch + v0.5 worker) |
|---|---|---|---|---|---|
| Apps | Single Next.js app, `(admin)` route group | — | — | Hosted demo + rename | `apps/worker/` Python (FastAPI + faster-whisper + pyannote) |
| Schema | Drizzle full schema incl. `extraction_jobs` + `clips_pending` placeholders; RLS policies on every table | — | — | — | Worker writes `clips_pending` |
| Auth/Consent | Magic-link + Google OAuth; explicit granular GDPR Article 9 consent; disclaimer ack; ≥16 EU age gate | — | — | — | — |
| Legal/OSS | LICENSE (MIT), DCO bot, CONTRIBUTING.md w/ relicense-reservation, MEDICAL_REVIEW.md (teeth-bearing), issue templates, stale bot, gitleaks, docker-compose CI smoke, Editorial & Attribution Policy | — | — | Fumadocs site + Open Collective + maintainer-bandwidth statement | One-page MoU template |
| Curation | Curator role schema | Admin clip CRUD; embed-on-approve; speaker_status; mandatory risk flags; ≥30 hand-curated DOAC clips × 4 domains; daily oembed availability cron | — | Clip-submission template | — |
| AI/RAG | LLM provider wrapper interfaces (`packages/core/llm`) | — | Hybrid pgvector + tsvector RAG; 6–10 turn adaptive interview (Haiku turns + Sonnet final); strict citation grounding + post-gen validation; habit candidates with 2–3 validated citations; tiny-habit + implementation-intention `trigger`; AI voice spec | — | v0.5 extraction pipeline scoped (zero web rewrites — uses existing job-table contract) |
| User UX | — | — | Habit dashboard; tri-state check-in; consistency view PRIMARY; Streak Freeze (demoted); habit detail w/ `<YouTubeEmbed>` + DOAC CTA; swap; public `/h/[slug]` w/ OG images; loading/empty/error polish | History calendar; email reminders + weekly compassionate digest; `.ics` calendar invite; opt-in Web Push | — |
| GDPR | Schema + cascade design | — | — | One-click JSON export; cascade-delete integration test (incl. pgvector) | — |
| DOAC outreach | — | — | — | Pitch deck draft | Soft outreach to named partnerships person; ask non-objection |

## Reconciliations (6 Tensions Resolved)

### 1. Monorepo + two apps (ARCHITECTURE) vs. defer monorepo + single app (PITFALLS)

**Direction:** pnpm + Turborepo monorepo retained, but `apps/admin` ships initially as a route group inside `apps/web` (`app/(admin)/...` with separate auth-gate layout). Split into dedicated `apps/admin` only when bundle-size or independent-deploy needs warrant. `packages/db`, `packages/core`, `packages/ui`, `packages/config`, `packages/api-contracts` all created Phase 1. `apps/worker/` is **doc-only stub** (`README.md` only — no `pyproject.toml`, no CI hook, no `pnpm dev` wiring) until v0.5. Removes the "phantom limb" failure mode while keeping monorepo + cross-app forward-compat.

### 2. DOAC ask: "endorsement" (PROJECT.md) vs. "non-objection" (PITFALLS)

**Direction:** Two-step pitch ladder. Phase 5 *operational* ask is non-objection ("OK to keep using DOAC clips with attribution + 48hr takedown?"). Endorsement is the *aspirational* outcome if non-objection goes well. **Action for user:** update PROJECT.md Key Decisions 12-month success metric line.

### 3. Streak design: "grace day" (PROJECT.md) vs. "Streak Freeze" framing (PITFALLS)

**Direction:** Adopt "Streak Freeze" framing in UI/copy; keep grace-day as the underlying rule (1 miss/week tolerated, banked tokens TBD); demote streak from largest UI element — replace prime real estate with consistency view. Underlying mechanic identical; only naming + visual hierarchy change. Streaks ≥30 days hide from daily view.

### 4. Single-podcaster brand entanglement (PITFALLS) vs. DOAC-only MVP (PROJECT.md)

**Direction:** Not actually a conflict. DOAC-only at MVP for corpus content is fine; brand identity stays separate. Schema podcast-agnostic from day one (already designed: `podcast_id` FK, `speaker_status` field). App name must be neutral — never "DOAC Habits" or similar. Curate to the named credentialed *guest*, not the host. Maintain private expansion bench. **Action for user:** rename "Hdiary" pre-launch with a neutral-not-DOAC name.

### 5. AI extraction pipeline timing

**Direction:** Confirmed deferred to Phase 5 / v0.5 across all files. No conflict. `apps/worker/` is doc-only stub; `extraction_jobs` + `clips_pending` schema placeholders + `packages/api-contracts` zod schemas exist from Phase 1 = zero-rewrite Phase 2 integration via `SELECT ... FOR UPDATE SKIP LOCKED` job table (not webhooks).

### 6. License: MIT or Apache-2.0 (PROJECT.md) vs. MIT + DCO + relicense-reservation (PITFALLS)

**Direction:** Adopt MIT + DCO bot + explicit relicense-reservation clause in CONTRIBUTING.md as working stance. MIT for DOAC-pitch friendliness + max self-host adoption. DCO over CLA: `Signed-off-by` line via single GitHub Action (CLA scares casual contributors, signals corporate intent). CONTRIBUTING.md clause: "Contributions licensed inbound under project's license (MIT). Maintainer reserves the right to relicense future versions." Decision deadline: **before first public push, before star #1.** Final user yes/no required.

## Open Decisions Still Needed From User Before Roadmap

1. **License confirmation** — adopt MIT + DCO + relicense-reservation? (Recommendation: yes; needed before Phase 1 repo setup.)
2. **Project name** — current "Hdiary" must not be DOAC-anchored. User produces 3 candidate names by end of Phase 1 so domain/handles can be reserved early. Hard-blocks Phase 4 public launch.
3. **Domain coverage: 4 vs. 6** — recommendation is 4 (sleep / nutrition+gut / exercise+longevity / mental health) so 30 clips × 4 = 7–8 clips/domain feels curated. Pick before Phase 2 curation begins.
4. **Streak rule specifics** — Streak Freeze framing adopted; underlying rule still TBD: 1 miss/week vs. banked tokens (e.g., 2 freezes/month, max 4) vs. other. Pick during Phase 3 design before any pixels ship.
5. **DOAC pitch frame confirmation** — confirm two-step ladder (non-objection in Phase 5, endorsement aspirational). Update PROJECT.md Key Decisions 12-month success metric. Required before Phase 5 outreach drafting.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Multiple 2026-dated official sources converge |
| Features | HIGH | Derived from explicit PROJECT.md decisions + competitor public behavior; complexity estimates MEDIUM (un-spiked) |
| Architecture | HIGH for Next.js + Supabase + Drizzle; MEDIUM for Phase 2 worker integration shape (forward-compat, not yet exercised) |
| Pitfalls | HIGH for legal/OSS/habit-app categories (ICO, EHDS, opensource.guide, peer-reviewed habit literature); MEDIUM for DOAC-specific pitch dynamics (extrapolated from comparable media-IP deals) |

**Overall confidence:** HIGH. Sharpest uncertainty: DOAC pitch dynamics + un-spiked complexity estimates.

### Gaps to Address During Planning

- Curation hours scheduling — ~15 editorial hours for 30 clips is an estimate; weekly progress check.
- Streak rule specifics — open decision #4.
- DOAC named partnerships contact — research during Phase 4 (not press@).
- Hallucination eval set — 20 hand-graded onboarding transcripts must be built during Phase 3.
- iOS push trigger metric for revisit during Phase 4 alpha (e.g., >30% mobile-engagement friction reports).
- **Drizzle pgvector HNSW gotcha** — order by raw `cosineDistance(...)` ASC; apply `1 -` only in SELECT projection. Inline-comment in `packages/core/rag/search.ts` to prevent regression.

## Roadmap Implications — Suggested Phases

1. **Phase 1: Foundation** — legal posture (3-layer YouTube/copyright, GDPR Art. 9 consent, MIT+DCO+relicense), schema (incl. Phase-2 placeholders), RLS, auth, disclaimer, repo hygiene + automation, docker-compose CI smoke. Avoids Pitfalls 1, 2, 3, 6, 7, 9.
2. **Phase 2: Curation tooling + corpus seeding** — admin clip CRUD, embed-on-approve, mandatory risk flags, speaker_status, daily oembed availability cron, ≥30 hand-curated DOAC clips × 4 domains. Avoids Pitfalls 3, 4, 10, 11.
3. **Phase 3: User AI loop + habit cards + check-in (the demo)** — hybrid RAG, 6–10 turn interview with strict citation grounding, habit cards w/ DOAC CTA, tri-state check-in, consistency view PRIMARY + Streak Freeze (demoted), public `/h/[slug]`, swap, polished empty/loading/error states, AI voice spec. Avoids Pitfalls 5, 12, 14, 15, 18.
4. **Phase 4: Re-engagement + OSS hygiene + alpha launch** — email reminders + weekly compassionate digest + `.ics` invites + opt-in Web Push, history calendar, GDPR export + cascade-delete test, Fumadocs docs site, clip-submission template, hosted demo + rename, Open Collective from day one, maintainer-bandwidth statement. Avoids Pitfalls 7, 13, 16.
5. **Phase 5: Pitch + v0.5 extraction worker** — pitch deck pre-empting 5 concerns w/ alpha metrics, one-page MoU, soft outreach (named contact, non-objection ask, avoid news weeks); v0.5 Python worker via existing job-table contract (zero web rewrites). Avoids Pitfall 8.

### Research Flags

- **Phase 3** — `/gsd:research-phase` recommended: prompt-engineering for citation grounding, hallucination eval design, Vercel AI SDK 5.x streaming UX, AI voice spec A/B test design.
- **Phase 5** — `/gsd:research-phase` recommended when v0.5 starts: faster-whisper vs whisper.cpp current benchmarks, pyannote diarization on podcast audio, prompt-injection defense on transcript content, Hetzner deployment + secrets.
- **Standard patterns (skip research-phase):** Phase 1 (foundation), Phase 2 (curation CRUD), Phase 4 (email + docs + OSS hygiene).

---
*Synthesized from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
