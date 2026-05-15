# Roadmap: Hdiary (working title)

**Created:** 2026-05-07
**Granularity:** coarse (5 phases)
**Coverage:** 107/107 v1 requirements mapped (note: REQUIREMENTS.md header said "86 total" — actual count is 107 across 15 categories; header to be corrected)
**Strategic frame:** OSS traction + DOAC pitch readiness. Solo dev, ~25 hrs/week. Demo-first sequencing.

## Critical Path Reminder

The DOAC pitch demo follows: T1 → T17 → D2 → D5 → D1 → D15 → T2 → T4 → D3 → D7 → T3 → T5/D9 → D6 → D4. This roadmap orders phases so the demo path is end-to-end working at the close of Phase 3, with Phase 4 adding the polish, re-engagement loop, and alpha launch surface required to *record* the pitch with real metrics.

## Hard Dependencies / Gates

- **Schema + RLS + auth shells** must exist before any curation tooling is built (Phase 1 → Phase 2).
- **≥30 approved DOAC clips** must exist before the AI interview is demoed (Phase 2 → Phase 3).
- **Naming (NAME-01..03)** hard-blocks Phase 4 alpha launch. NAME-01 produces ≥3 candidate names by end of Phase 1; NAME-02/03 must complete before Phase 4 ships publicly.
- **Phase 4 alpha metrics** (signups, retention, click-through) gate the Phase 5 pitch (PITCH-05).

## Phases

- [x] **Phase 1: Foundation** — Repo, schema, RLS, auth, granular GDPR consent, three-layer legal posture, OSS hygiene scaffolding, license + DCO, name candidates produced (completed 2026-05-09)
- [x] **Phase 2: Curation Tooling + DOAC Corpus** — Admin clip CRUD, AI co-pilot, document ingestion, manual cutter, embed-on-approve, ≥30 approved clips × 4 domains (~15 editorial hours, lowered by AI co-pilot to ~10–12) (completed 2026-05-12)
- [ ] **Phase 3: User AI Loop (the Demo)** — Hybrid RAG, 6–10 turn interview with citation grounding, habit recommendations, habit cards with `<YouTubeEmbed>`, tri-state check-in, consistency-view-primary + Streak Freeze (demoted), public `/h/[slug]`, swap
- [ ] **Phase 4: Re-engagement + OSS Polish + Alpha Launch** — Email reminders + weekly compassionate digest + `.ics`, GDPR export + cascade-delete, Fumadocs site, hosted demo, rename to chosen name, sponsorship live, alpha metrics flowing
- [ ] **Phase 5: DOAC Pitch + v0.5 Extraction Worker** — Pitch deck pre-empting 5 concerns, one-page MoU, soft outreach (named contact, non-objection), `apps/worker/` Python promotion via existing job-table contract

## Phase Details

### Phase 1: Foundation

**Goal:** A solo dev (the user) and a future contributor can `pnpm dev` or `docker compose up` the project, sign up under granular GDPR Article 9 consent, hit a complete Drizzle schema with RLS on every user-data table, and see a public repo whose legal/OSS posture is defensible from the first push.

**Depends on:** Nothing (first phase)

**Requirements** (34): FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, FND-09, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, PROF-01, PROF-02, ADMN-01, ADMN-02, AION-09, OSS-01, OSS-02, OSS-03, OSS-04, OSS-05, OSS-07, OSS-09, NAME-01, LGL-04, LGL-05, LGL-06, LGL-07, PROF-03 (plumbing only — full UX in Phase 4), PROF-04 (cascade design only — integration test in Phase 4)

**Success Criteria** (what must be TRUE):
  1. A fresh contributor can clone the repo, run `pnpm dev` in under 60 seconds and hit a working login page; alternatively `docker compose up` boots the same stack and a CI job verifies this on every PR.
  2. A user can sign up via magic link or Google OAuth, encounter granular Article 9 consent toggles (account / health-adjacent processing / AI free-text analysis) recorded with timestamps, pass the DOB gate (≥13 US / ≥16 EU), and acknowledge the medical disclaimer — and the database has RLS on every user-data table such that user A cannot read user B's rows even with a leaked anon key.
  3. The repo is publicly viewable with `LICENSE` (MIT), `CONTRIBUTING.md` (DCO + relicense-reservation + clip-submission template), `CODE_OF_CONDUCT.md`, `MEDICAL_REVIEW.md`, issue/PR templates, DCO bot enforcing `Signed-off-by`, gitleaks scan in CI, Open Collective + GitHub Sponsors set up with $0 goal, and a maintainer-bandwidth statement in the README.
  4. The Drizzle schema includes the full v1 table set plus `extraction_jobs` and `clips_pending` Phase-5 placeholders, and `packages/api-contracts` has zod schemas mirrored for the deferred Python worker — so Phase 5 integration is purely additive.
  5. The user has produced ≥3 candidate project names (neutral, not DOAC-anchored) so Phase 4 rename is unblocked.

**Risks Mitigated:**
- **Pitfall 1** (three-layer legal posture): Editorial & Attribution Policy stub published; Referer-Policy guidance in self-host docs (LGL-07); right-of-publicity stance documented (LGL-06).
- **Pitfall 2** (GDPR Article 9): Granular separable consent (AUTH-05); explicit Article 9 language; cascade-delete *design* lands in schema (full integration test deferred to Phase 4).
- **Pitfall 3** (disclaimer theater — partial): Disclaimer ack gate (AUTH-04) + `MEDICAL_REVIEW.md` published with teeth (LGL-05); enforcement at clip-approval lands Phase 2.
- **Pitfall 6** (license picked late / wrong): MIT + DCO + relicense-reservation locked before first public push (OSS-01..03).
- **Pitfall 7** (solo-maintainer triage spiral): Issue/PR templates, stale-bot wiring (OSS-06 implementation in Phase 4 but config decided here), maintainer-bandwidth statement (OSS-07), Open Collective live from day one (OSS-09).
- **Pitfall 9** (premature monorepo / phantom worker): Monorepo retained but `apps/admin` ships as `(admin)` route group inside `apps/web`; `apps/worker/` is doc-only stub (FND-01); docker-compose CI smoke test enforced (FND-04).

**Plans:** 8/8 plans complete

Plans:
- [ ] 01-foundation/01-01-monorepo-bootstrap-PLAN.md — pnpm + Turborepo + Biome + Husky + vitest/playwright + gitleaks CI [Wave 1]
- [ ] 01-foundation/01-02-oss-legal-posture-PLAN.md — LICENSE (MIT) + CONTRIBUTING (DCO + relicense) + CoC + MEDICAL_REVIEW + legal docs + DCO Action + FUNDING [Wave 1]
- [ ] 01-foundation/01-03-naming-candidates-PLAN.md — produce ≥3 candidate project names (NAME-01) [Wave 1]
- [ ] 01-foundation/01-04-database-schema-rls-PLAN.md — full Drizzle schema + pgvector HNSW + RLS on every user-data table + cascade FKs + zod api-contracts + LLM provider interface [Wave 2]
- [ ] 01-foundation/01-05-nextjs-app-skeleton-PLAN.md — Next.js 16 + Tailwind v4 + shadcn/ui + (marketing)/(auth)/(app)/(admin) route groups + auth-guard stubs + PROF-02 settings stub [Wave 2]
- [ ] 01-foundation/01-06-docker-compose-ci-PLAN.md — Postgres+pgvector+GoTrue compose stack + db migrate scripts + CI compose-smoke job + self-host doc [Wave 2]
- [ ] 01-foundation/01-07-supabase-auth-PLAN.md — @supabase/ssr wiring + magic link + Google OAuth server actions + real getSessionUser + PROF-02 settings server action [Wave 3]
- [ ] 01-foundation/01-08-consent-dob-disclaimer-PLAN.md — /onboarding/legal-gate route + DOB gate (US ≥13 / EU ≥16) + 3 separable Article 9 consents + disclaimer ack + PROF-03 export stub [Wave 3]

---

### Phase 2: Curation Tooling + DOAC Corpus

**Goal:** A curator (the user, single curator at MVP) can ingest a YouTube URL or transcript document, use an AI co-pilot inside the clip editor to refine timestamps and claim wording, manually scrub-and-cut clips from ingested transcripts, and approve ≥30 clips across the 4 domains — every approval triggers an embedding write, mandatory risk flags, and an audit-log entry. The corpus is the binding constraint; this phase exists to dissolve it.

**Depends on:** Phase 1 (schema + RLS + curator role + admin route group must exist)

**Requirements** (19): ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, ADMN-11, ADMN-12, ADMN-13, ADMN-14, ADMN-15, ADMN-16, LGL-01, LGL-02, LGL-03, LGL-08, AION-10

**Curation hours line item (first-class, not bundled into engineering):**
- Baseline estimate (no tooling): ~15 editorial hours for 30 clips × ~30 min/clip
- With AI co-pilot (ADMN-10) + manual cutter (ADMN-14) + ingestion (ADMN-12/13): revised estimate **~10–12 editorial hours** for 30 clips. AI suggests timestamps and claim phrasing; curator accepts/refines. Schedule as ~3–4 dedicated curation sessions, distinct from engineering blocks. **Weekly progress check** — if curation slips past week 2 of Phase 2, re-evaluate domain consolidation or clip-count target before extending the phase.

**Success Criteria** (what must be TRUE):
  1. The curator can paste a YouTube URL OR upload a transcript document; the system fetches metadata, persists the transcript (R2 if provisioned, else text-blob in Postgres), and chunks + embeds it into the RAG corpus *even before any clips are extracted from it* — so AION-03 onboarding RAG can already cite source material from ingested-but-unclipped episodes.
  2. The curator can scrub through an ingested transcript, mark clip start/end, and the resulting clip enters `pending → approved` lifecycle with mandatory risk flags; the AI co-pilot can be invited inline to refine timestamps and claim/rationale wording, and every AI suggestion + accept/reject decision is recorded in `clip_edits`.
  3. ≥30 clips are approved across the 4 domains (sleep / nutrition+gut / exercise+longevity / mental health) with embeddings populated, speaker_status set per clip (verified | unverified | host), and zero clips touching prescription drugs / dosing / diagnosed-condition treatment (hard-blocked at approval).
  4. A daily pg_cron job pings YouTube oEmbed for each linked episode and flags clips whose source video is no longer available; admin can one-click `removed_from_source` an episode and cascade-flag its clips.
  5. `/legal/dmca` is published with 48-hour SLA, the one-click admin "remove episode + clips + blacklist" workflow exists, and `MEDICAL_REVIEW.md` enumerates clip-length editorial guidance (LGL-08) per the no-cap-but-favor-brevity policy. Health disclaimer renders on every habit card and onboarding flow shell.
  6. A 20-transcript hand-graded hallucination eval set exists and CI runs it against current prompts (AION-10) — eval scaffolding lives here even though the interview itself ships in Phase 3, because the eval design must precede the prompts it evaluates.

**Risks Mitigated:**
- **Pitfall 3** (disclaimer theater enforcement): Mandatory risk flags at approval (ADMN-05); hard-block on prescription/dosing/condition clips (ADMN-06); enumerated exclusions in `MEDICAL_REVIEW.md` (LGL-05/LGL-08).
- **Pitfall 4** (single-podcaster brand entanglement): `speaker_status` field on every clip (ADMN-03); curate to named credentialed *guest* not host; podcast-agnostic schema exercised by ADMN-16 inline-add-podcast form so the multi-podcast path is real, not theoretical.
- **Pitfall 10** (orphaned clips): Daily oEmbed availability cron (ADMN-08); admin one-click cascade-flag (ADMN-07); transcript snapshot at curation time (via ADMN-12).
- **Pitfall 11** (sponsor-read contamination, quote-mining): Editorial guidance in `MEDICAL_REVIEW.md` (LGL-08) — sponsor-read offset rule; qualifier-must-be-in-window rule; curator-facing prompt at approve. Curation is the discipline gate.
- **Pitfall 17** (domain over-coverage): 4 domains locked (per PROJECT.md Key Decisions); ADMN-09 enforces the 30-clip × 4-domain target.

**Plans:** 6/6 plans complete

Plans:
- [ ] 02-curation-tooling-doac-corpus/01-PLAN.md — DB schema: transcripts + clip_edits extension + clip removal + episode_blacklist + AION-10 fixture candidates + RLS [Wave 1]
- [ ] 02-curation-tooling-doac-corpus/02-PLAN.md — packages/core/transcripts TranscriptProvider (YouTube + Deepgram + manual VTT/SRT) [Wave 2]
- [ ] 02-curation-tooling-doac-corpus/03-PLAN.md — Ingestion route + chunking + batched embeddings + ADMN-16 inline add-podcast [Wave 3]
- [ ] 02-curation-tooling-doac-corpus/04-PLAN.md — Three-pane clip editor + AI co-pilot + approveClip + AION-10 grounding check [Wave 4]
- [ ] 02-curation-tooling-doac-corpus/05-PLAN.md — Kanban board + ingestion form + removal cascade + oEmbed pg_cron [Wave 5]
- [ ] 02-curation-tooling-doac-corpus/06-PLAN.md — AION-10 eval CI + LGL-01 disclaimer + LGL-02 /legal/dmca + LGL-08 MEDICAL_REVIEW.md + curation tracker [Wave 1]

---

### Phase 3: User AI Loop (the Demo)

**Goal:** A new user finishes signup, completes a 6–10 turn AI onboarding interview that is RAG-grounded in real DOAC clips, sees 3–5 personalized habit candidates each backed by 2–3 *validated* clip citations, adopts some, checks in tri-state from a dashboard whose primary progress UI is the consistency view (Streak Freeze demoted), can swap any habit for a substantively-different alternative in the same domain, and shares a public `/h/[slug]` page with embedded YouTube clip + DOAC CTA. **This phase ends with a Loom-recordable demo.**

**Depends on:** Phase 2 (≥30 approved clips with embeddings); Phase 1 (auth + schema + LLM provider wrappers)

**Requirements** (33): AION-01, AION-02, AION-03, AION-04, AION-05, AION-06, AION-07, AION-08, REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, HAB-01, HAB-02, HAB-03, HAB-04, HAB-05, HAB-06, HAB-07, HAB-08, HAB-09, HAB-10, SWAP-01, SWAP-02, SWAP-03, SWAP-04, PUB-01, PUB-02, PUB-03, PUB-04, PUB-05

**Success Criteria** (what must be TRUE):
  1. A user completes the onboarding interview in <5 minutes; each turn is grounded in real DOAC content via hybrid pgvector + tsvector retrieval; cheap turn model (Haiku 4.5 / GPT-4o-mini) handles interim turns and Sonnet 4.x handles final synthesis; if the user opted out of AUTH-05(c), the interview falls back to structured choices instead of free-text.
  2. The interview output is a structured profile + 3–5 habit candidates each with 2–3 *validated* clip citations (post-generation grounding check; broken citations dropped, recommendation regenerated if <2 valid); each habit includes a `trigger` (when/where) and `tiny_action` (BJ Fogg-style minimum); at least one habit per identified-gap domain.
  3. The habit dashboard's largest, primary visual element is the consistency view ("18/21 last 3 weeks"); the streak counter is secondary, smaller, and shows freezes-available; Streak Freezes (2/month, max 4 banked) auto-apply on first miss with a gain-frame message; streaks ≥30 days hide from daily view; missed days render as muted neutral (no red, no flame, no shame).
  4. The habit detail page renders a `<YouTubeEmbed>` (lite-embed, start/end timestamps, never disables player chrome), the named credentialed guest attribution, the prominent "Watch on Diary of a CEO" CTA, and a swap button that proposes a substantively-different clip (cosine >0.7 distance from current AND from a different cluster) in the same domain with 2 validated citations.
  5. Each `habit_templates` row is publicly accessible at `/h/[slug]` with auto-generated OG image, structured data, sitemap entry, "Adopt this habit" CTA — and an integration test proves no private user data leaks via the public route (PUB-05 RLS check).

**Risks Mitigated:**
- **Pitfall 5** (streak punishment / loss-frame): Consistency view primary (HAB-06); streak demoted (HAB-07); Streak Freeze gain-frame (HAB-08); long streaks hide (HAB-09); no shame UI (HAB-10).
- **Pitfall 12** (AI hallucinated citations): Strict citation-grounding prompt (REC-02); post-generation re-fetch validation (REC-02); conservative candidate count when citations short; eval set running in CI (AION-10 from Phase 2 covers this phase's prompts).
- **Pitfall 14** (insight as substitute for action): Check-in is the daily atom (HAB-02); tiny_action required at habit setup (REC-04); implementation-intention `trigger` required (REC-04); behavior-change measured separately from engagement.
- **Pitfall 15** (flat / generic AI voice): Voice spec in system prompt (AION-08 model tiering plus prompt discipline); ≤3-sentence turn discipline; no emoji; A/B test with 5–10 alpha users in early Phase 4.
- **Pitfall 18** (public habit page SEO without canonical discipline): `noindex` on dosing/supplement-touching pages; canonical link points back to YouTube source for clip-driven pages; robots.txt restricts `/h/*` until editorial policy mature (PUB-04 + LGL-08 interaction).

**Plans:** 4/6 plans executed

Plans:
- [ ] 03-user-ai-loop-the-demo/03-01-schema-foundations-PLAN.md — Drizzle migration (user_habits.status, habit_templates.cluster_id, interview_runs), AI SDK v6 install, retrieval+interview schema skeletons [Wave 1]
- [ ] 03-user-ai-loop-the-demo/03-02-hybrid-retrieval-grounding-PLAN.md — hybridRetrieve (pgvector+tsvector RRF), validateCitations (reuse Phase 2 groundingCheck), computeClusters k-means [Wave 2]
- [ ] 03-user-ai-loop-the-demo/03-03-interview-synthesis-api-PLAN.md — /api/interview streaming + tool calling, /api/synthesize Sonnet generateObject + citation grounding + interview_runs persistence [Wave 2]
- [ ] 03-user-ai-loop-the-demo/03-04-onboarding-ui-PLAN.md — Interview UI (chips, progress, free-text gate), synthesis loader, swipe-stack adoption, settings re-run [Wave 2]
- [ ] 03-user-ai-loop-the-demo/03-05-dashboard-checkin-graduation-PLAN.md — Dashboard with consistency-primary HabitCard, tri-state check-in sheet, streak freeze auto-apply, graduation at 21 [Wave 3]
- [ ] 03-user-ai-loop-the-demo/03-06-habit-detail-public-swap-PLAN.md — Habit detail + swap panel, public /h/[slug] + opengraph-image.tsx + sitemap + RLS Playwright test + CONTEXT/CLAUDE amendments [Wave 3]
**UI hint:** yes

---

### Phase 4: Re-engagement + OSS Polish + Alpha Launch

**Goal:** The demo from Phase 3 becomes a publicly-hostable alpha at a real domain under the chosen name (rename complete), with email reminders + weekly compassionate digest + `.ics` calendar invites as the v1 re-engagement loop, GDPR export + cascade-delete proven by integration test, the Fumadocs docs site live at `docs.<domain>` with quickstart / self-host / clip-curation / architecture pages, and alpha metrics flowing (signups, retention, click-through to DOAC YouTube) so Phase 5 has data to pitch with.

**Depends on:** Phase 3 (full user loop working); Phase 1 (NAME-01 candidates produced)

**Requirements** (16): REM-01, REM-02, REM-03, REM-04, REM-05, OSS-06, OSS-08, OSS-10, OSS-11, OSS-12, DEMO-01, DEMO-02, DEMO-03, DEMO-04, NAME-02, NAME-03, PROF-03 (full UX), PROF-04 (cascade integration test)

**Success Criteria** (what must be TRUE):
  1. Domain + GitHub org/handles are reserved under the chosen name; repo, package names, and hosted demo URL are renamed pre-public-launch; no DOAC-named branding anywhere in shared components.
  2. A user can opt in to email reminders per habit (daily | weekday | custom days), receive a weekly compassionate digest (consistency summary + 1 spotlighted clip from a light domain, opt-out), subscribe to an `.ics` per habit, and every notification email carries the disclaimer footer.
  3. A user can one-click JSON-export all their data (account, habits, check-ins, streaks, consent records) and one-click delete their account — an integration test verifies cascade-delete includes pgvector embeddings of free-text inputs, with row-count = 0 across all user-scoped tables 30 days after request.
  4. The hosted demo at the real domain is open for rate-limited signup, seeded with the ≥30-clip DOAC corpus, RLS-isolates test users, and includes a Loom recording of the full happy path; alpha metrics dashboard tracks signups, 7/30-day retention, and YouTube click-through.
  5. The Fumadocs site at `docs.<domain>` ships Quickstart, Self-host guide (with Referer-Policy guidance), Clip-curation guide, Architecture overview, and Privacy/legal page; the README links a 5-minute self-host Loom (OSS-10), the one-page sponsorship deck (OSS-11), and an auto-rendered sponsor recognition table from Open Collective data (OSS-12); stale-bot is configured (OSS-06).

**Risks Mitigated:**
- **Pitfall 7** (solo-maintainer triage death spiral): Stale-bot live (OSS-06); auto-rendered sponsor table avoids manual upkeep (OSS-12); Self-host docs robust enough that deploy questions move to docs not DMs (OSS-08, OSS-10).
- **Pitfall 13** (cold-start retention without push or community): Email reminders + weekly compassionate digest (REM-01..03); `.ics` calendar invites (REM-04) are the differentiating low-cost re-engagement workaround; opt-in Web Push left as v2.
- **Pitfall 16** (renaming "Hdiary" too late): Hard-blocked: NAME-02/03 must complete before public alpha launch.

**Plans:** TBD
**UI hint:** yes

---

### Phase 5: DOAC Pitch + v0.5 Extraction Worker

**Goal:** Deliver a non-objection pitch to a named DOAC partnerships contact backed by Phase 4 alpha metrics, with a deck pre-empting the 5 strategic concerns and a one-page MoU template ready for sign-off; in parallel (or sequentially, depending on outreach response time), promote `apps/worker/` from doc-only stub to a working Python (FastAPI + faster-whisper + pyannote) extraction worker via the existing `extraction_jobs` + `clips_pending` job-table contract — zero web rewrites required. Maintain a private Plan-B corpus list (Attia / FoundMyFitness / ZOE / Sigma Nutrition) for pivot if DOAC declines.

**Depends on:** Phase 4 (alpha metrics required for PITCH-05; `extraction_jobs` schema + `packages/api-contracts` already in place from Phase 1)

**Requirements** (5): PITCH-01, PITCH-02, PITCH-03, PITCH-04, PITCH-05

**Success Criteria** (what must be TRUE):
  1. The pitch deck pre-empts all 5 strategic concerns: IP optionality (MIT license, no exclusivity), brand control (48-hour takedown SLA, no DOAC branding in components), endorsement liability (asking *non-objection* not endorsement), deal shape (no monetization, Open Collective burn-rate transparent), and bandwidth (no ongoing commitment requested).
  2. A one-page MoU template is ready: scope, attribution, takedown SLA, no-warranty, term-and-termination, no-payment — drafted to convert a partnerships-team yes into a sign-off without a multi-week legal cycle.
  3. Outreach is delivered to a *named* partnerships contact (not press@), avoiding any week DOAC is in the news (positive or negative); the deck includes concrete alpha metrics (signups, retention, top-3 most-watched clips by users — a data gift, not a request).
  4. A private Plan-B corpus expansion list is maintained (Attia / FoundMyFitness / ZOE / Sigma Nutrition) so a "no" from DOAC does not require a roadmap rewrite — the product works without DOAC co-sign.
  5. `apps/worker/` is promoted from doc-only stub to a working Python service that pulls jobs from `extraction_jobs` via `SELECT ... FOR UPDATE SKIP LOCKED`, transcribes via faster-whisper, diarizes via pyannote, proposes claims via Claude, writes to `clips_pending`, and the curator reviews proposals in admin — with **zero changes** to `apps/web`, `packages/core`, or `packages/db` schema. Prompt-injection defense on transcript content is in place.

**Risks Mitigated:**
- **Pitfall 8** (DOAC pitch dies of "interesting but not strategic"): Ask is *non-objection* not endorsement (PITCH-01); deck pre-empts 5 concerns (PITCH-01); MoU template ready (PITCH-02); plan-B corpus exists (PITCH-03); outreach is named-contact and news-week-aware (PITCH-04); metrics in deck (PITCH-05).
- **Pitfall 4** (single-podcaster brand entanglement, structural): Plan-B corpus (PITCH-03) is the structural mitigation — the project survives a "no" without a brand pivot.
- **Pitfall 12** (hallucination, extended to extraction): Worker writes to `clips_pending`, not `clips` — every extracted clip still passes through the curator's `pending → approved` lifecycle with mandatory risk flags. Human-in-the-loop is preserved.

**Plans:** TBD

---

## Coverage Summary

| Phase | Requirements (count) |
|-------|----------------------|
| 1 — Foundation | 34 |
| 2 — Curation Tooling + DOAC Corpus | 19 |
| 3 — User AI Loop | 33 |
| 4 — Re-engagement + OSS Polish + Alpha | 16 |
| 5 — DOAC Pitch + v0.5 Worker | 5 |
| **Total** | **107** |

Note: PROF-03 and PROF-04 appear in both Phase 1 (schema + cascade *design*) and Phase 4 (full UX + integration test) for tracking visibility; primary phase is Phase 4, where they are completed and verified. Counted once (in Phase 4) for the 107 total.

## Pitfall Coverage Index

Every numbered pitfall from PITFALLS.md is addressed:

| Pitfall | Severity | Phase(s) |
|---------|----------|----------|
| 1. Three-layer legal posture | HIGH | Phase 1 (LGL-04..07), Phase 2 (LGL-01..03, LGL-08), Phase 3 (PUB-04 SEO discipline) |
| 2. GDPR Article 9 misclassification | HIGH | Phase 1 (AUTH-05, schema cascade design), Phase 4 (PROF-03/04 integration test) |
| 3. Disclaimer theater | HIGH | Phase 1 (AUTH-04, LGL-05), Phase 2 (ADMN-05/06, LGL-08) |
| 4. Single-podcaster brand entanglement | HIGH | Phase 2 (ADMN-03 speaker_status, ADMN-16), Phase 5 (PITCH-03 plan-B) |
| 5. Streak punishment / loss-frame | HIGH | Phase 3 (HAB-06..10) |
| 6. License late / wrong / no CLA decision | HIGH | Phase 1 (OSS-01..03 — locked before first public push) |
| 7. Solo-maintainer triage death spiral | HIGH | Phase 1 (OSS-04/05/07/09), Phase 4 (OSS-06/12, OSS-08/10) |
| 8. DOAC pitch dies of strategic mismatch | HIGH | Phase 5 (PITCH-01..05) |
| 9. Premature monorepo / phantom worker | HIGH | Phase 1 (FND-01 admin-as-route-group, worker-as-doc-stub, FND-04 docker-compose CI smoke) |
| 10. Source video taken down → orphaned clips | MEDIUM | Phase 2 (ADMN-07/08) |
| 11. Sponsor-read contamination / quote-mining | MEDIUM | Phase 2 (LGL-08 editorial guidance) |
| 12. AI hallucinated citations | MEDIUM | Phase 2 (AION-10 eval set), Phase 3 (REC-02 grounding + validation), Phase 5 (worker proposals stay in pending) |
| 13. Cold-start retention | MEDIUM | Phase 4 (REM-01..05) |
| 14. Insight as substitute for action | MEDIUM | Phase 3 (HAB-02 check-in primary, REC-04 tiny_action + trigger) |
| 15. Flat / generic AI voice | MEDIUM | Phase 3 (AION-08 model tiering + prompt voice spec) |
| 16. Renaming "Hdiary" too late | LOW | Phase 1 (NAME-01), Phase 4 (NAME-02/03 hard-block alpha) |
| 17. Domain over-coverage (6 vs 4) | LOW | Phase 2 (ADMN-09 — 4 domains locked) |
| 18. Public-page SEO without canonical discipline | LOW | Phase 3 (PUB-04 implementation) |

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/0 | Not started | - |
| 2. Curation Tooling + DOAC Corpus | 0/0 | Not started | - |
| 3. User AI Loop | 0/0 | Not started | - |
| 4. Re-engagement + OSS Polish + Alpha | 0/0 | Not started | - |
| 5. DOAC Pitch + v0.5 Worker | 0/0 | Not started | - |

---
*Roadmap created: 2026-05-07 by gsd-roadmapper*
*Next: `/gsd:plan-phase 1` to decompose Phase 1 into executable plans*
