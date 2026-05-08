# Cited (working name)

> Working name: **Cited** — "Habits backed by people who study this for a living."
> Alternates under consideration in [.planning/NAMING.md](./NAMING.md).
> Final lock pending trademark + domain availability checks; renames in Phase 4 (NAME-02/03).

## What This Is

An open-source, evidence-backed health habit tracker. Each recommended habit is grounded in a short, deep-linked clip from a credentialed health podcast — at MVP, exclusively *The Diary of a CEO* (DOAC) — so users can see the *why* behind every habit in 90 seconds. AI conducts a personalized onboarding interview, recommends habits with podcast-clip citations, and offers an "equivalent-benefit swap" when a habit doesn't fit a user's life. Target user: health-podcast listeners who consume hours of expert content but rarely operationalize anything.

## Core Value

**Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker.** If the evidence layer fails or feels generic, the project has no differentiator. Everything else (community, mobile polish, AI extraction pipeline) is downstream of this working.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Auth & profile**
- [ ] User can sign up via email magic link or Google OAuth (Supabase Auth)
- [ ] User has a profile with timezone, display name, and goals JSON
- [ ] One-time medical disclaimer must be acknowledged before onboarding completes

**Curated DOAC clip library (manual at MVP)**
- [ ] Admin UI to add/edit/approve clips (claim, rationale, speaker, start/end seconds, domain, evidence strength, risk flags, primary YouTube video ID)
- [ ] **Admin AI co-pilot**: chat-with-AI alongside the clip editor to refine start/end timestamps, claim wording, rationale phrasing — AI suggestions are previews, admin explicitly accepts; audit log of AI vs accepted changes
- [ ] **Document ingestion**: admin can paste a YouTube URL or upload a transcript document; system fetches metadata + indexes transcript text into the RAG corpus even if no clips are extracted yet
- [ ] **Manual clip cutter**: admin scrubs through ingested transcript to mark clip boundaries; created clips enter the same `pending → approved` lifecycle
- [ ] Trusted-curator role exists in schema from MVP (single curator at launch; designed to expand)
- [ ] Clips are stored as metadata only — no audio/video re-hosting; playback via YouTube iframe deep-link
- [ ] At least 30 hand-curated DOAC clips across the 4 health domains by alpha launch
- [ ] Clip length is "as detailed as needed to convey the claim" — no hard cap, but editorial policy favors brevity where the claim is short

**AI onboarding interview**
- [ ] LLM-driven adaptive interview (6–10 turns) that asks about sleep, nutrition, exercise, mental health, gut health, longevity
- [ ] Interview uses RAG over the curated clip library (pgvector cosine + tsvector hybrid) so questions are grounded in real DOAC content
- [ ] Interview output: structured user profile + identified gap domains
- [ ] LLM proposes 3–5 personalized habit candidates, each with 2–3 evidence clip citations
- [ ] User selects which habits to adopt (1, several, or all)

**Habit cards & daily check-in**
- [ ] Each habit card displays: title, frequency, time-of-day, embedded YouTube clip (start/end timestamps), claim, speaker attribution
- [ ] User can check in daily with status (`done` / `skipped` / `partial`)
- [ ] Streak counter with **grace-day mechanic** (1 miss/week tolerated, or banked skip tokens — exact rule TBD in design)
- [ ] Consistency view (e.g., "18/21 last 3 weeks") alongside streak

**Habit swap**
- [ ] User can request a swap with a reason (too hard / dislike / schedule conflict)
- [ ] System retrieves substantively-different clip from same domain (cluster-based) and proposes alternative habit

**Public habit pages (pitch leverage)**
- [ ] Each habit has a shareable, public URL (`/h/[slug]`) showing the habit + its DOAC evidence clip
- [ ] Pages are SEO-friendly and render the embedded YouTube player with attribution
- [ ] Strong "Watch on Diary of a CEO" CTA driving traffic back to the source

**Compliance & legal posture**
- [ ] Prominent health disclaimer on every habit card and onboarding flow
- [ ] DMCA contact + 48-hour takedown SLA documented
- [ ] No clips touching prescription drugs, dosing, or treatment of diagnosed conditions
- [ ] GDPR-ready: one-click data export (JSON), one-click delete (cascade), DPA published
- [ ] DOB gate (≥13, with EU jurisdictions handled)

**OSS-ready repo**
- [ ] Monorepo (pnpm + Turborepo): `apps/web`, `apps/admin`, `apps/worker` (stub), `packages/db`, `packages/ui`
- [ ] `LICENSE` (working assumption: MIT or Apache-2.0; final call before public release)
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `MEDICAL_REVIEW.md`, clip-submission template
- [ ] `make dev` (or `pnpm dev`) one-command local setup; `docker compose up` self-host path
- [ ] Docs site (Astro Starlight) with quickstart, self-host, clip-curation guide, architecture overview

**Hosted demo**
- [ ] Polished hosted instance at a real domain (Vercel + Supabase + small Hetzner box) for the DOAC pitch and tire-kickers

### Out of Scope (v1)

- **Community feed, posts, reactions, leaderboards** — Cut. Goal is OSS traction + DOAC pitch, not user-driven engagement loops. Public shareable habit pages are the only "social" surface in v1.
- **Full AI clip-extraction pipeline (Whisper + pyannote + claim extraction + admin review queue)** — Deferred to v0.5/Phase 2. MVP relies on hand-curated DOAC clips. Validate the user loop before investing 4–6 weeks in extraction infrastructure.
- **Additional podcasts (Huberman, Attia, ZOE, FoundMyFitness)** — Deferred to post-DOAC pitch. DOAC-only signals focus and gives the pitch maximum leverage.
- **Native mobile app + Capacitor wrapper** — Deferred. Web-first MVP; PWA is a post-v1 enhancement, native wrapper only if iOS push becomes critical.
- **Mood tracking, body-changes structured posts, weekly digest** — Deferred to v2.
- **Voice onboarding, wearable integrations (Oura/Apple Health/Google Fit)** — Out of scope for v1; possible v2+.
- **Self-hostable local LLM mode (Ollama / bge-small)** — Deferred. v1 ships with hosted-API LLMs only; local-mode config switch is a v2 contributor-friendly add.
- **Bring-your-own-API-key mode** — Deferred. Adds onboarding friction; revisit once cost pressure is real.
- **VC funding, paid tiers** — Out of scope. If hosting cost grows, "supporter tier" via Open Collective is the model (Plausible / Standard Notes pattern).

## Context

**Builder context**
- Solo developer, ~20–30 hrs/week, treating this as a portfolio + OSS-traction project (not a startup, not a personal habit tool — though those are valid side benefits).
- Strong shipped Next.js / TypeScript experience; previous Python ML / RAG pipeline experience. Tech-stack risk is therefore low; **execution-time risk is the dominant constraint.**
- 12-month success metric: OSS traction (stars, contributors, self-hosters) + a meaningful DOAC interaction (endorsement / public co-sign).

**Strategic frame**
- This is *also* a pitch deck disguised as a product. The MVP must be demoable to DOAC's team in a single Loom video and survive a click-around without embarrassment.
- DOAC framing: "We drive listeners *to* your show, attribute every clip, and operationalize the wisdom your audience already pays attention to." Permissive license + zero hosted re-distribution = DOAC-friendly.

**Concept lineage (from market validation research)**
- Adjacent winners: Habitica/Streaks (millions of users; pure habit tracking, no science) and Snipd (hundreds of thousands of users; user-driven podcast clipping, no habit/health behavioral layer).
- Concrete white space: (a) AI-curated short clips from the credentialed health-podcast canon, (b) habit recommendations grounded in those clips via RAG, (c) free + open-source positioning vs. Noom/Fay ($60–200/mo).
- Open habit trackers (uHabits ~9k stars, BeaverHabits, Habo) prove the self-host audience exists but lack any evidence/science layer — direct white space.

**Domain coverage at MVP**: sleep, nutrition, exercise, mental health, gut health, longevity. *Note for review:* gut health and longevity overlap heavily with nutrition and exercise; consider consolidating to 4 primary domains during phase planning if curation work proves redundant.

**Tech stack (working assumption — to be validated by research phase)**
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- DB & Auth: Supabase (Postgres + pgvector + RLS + Auth)
- ORM: Drizzle
- Hosting: Vercel (frontend) + Supabase (db/auth) + Hetzner CX22 (~€4/mo, AI worker)
- AI worker: Python FastAPI + faster-whisper + pyannote + Claude/OpenAI APIs (deferred to v0.5)
- Object storage: Cloudflare R2 (transcripts cache when extraction pipeline lands)
- Embeddings: OpenAI `text-embedding-3-small`
- Primary LLM: Anthropic Claude Sonnet (extraction); GPT-4o-mini / Claude Haiku (interview, swap)
- Video: YouTube IFrame Player API + timestamp deep links — **never re-host**
- Background jobs: Inngest free tier or Supabase pg_cron

## Constraints

- **Capacity**: Solo, ~25 hrs/week — every scope decision is a time decision. Strict v1 cuts are non-negotiable.
- **Budget**: Free-tier-feasible MVP target (~$5/mo), beta target ~$45/mo. **No paid tiers, no VC**, but sponsorship is in scope to cover hosting + LLM costs as the project grows. Open Collective + GitHub Sponsors from launch with transparent burn-rate.
- **Legal/copyright**: Deep-link only. Never store or serve audio/video. Transcripts stored privately as analysis input. Clip length is **as detailed as needed to convey the claim, not more** — no hard cap, but editorial guidance favors brevity where the claim is short. Fair-use posture rests on factors 1 (transformative — habit operationalization with commentary) and 4 (no market harm — drives traffic back to DOAC), since factor 3 (amount) is weaker without a length cap. Active DMCA process + 48h SLA.
- **Health/medical**: Not medical advice. No prescription-drug or dosing content. Mandatory disclaimer + risk-flag system. Editorial policy documented.
- **Privacy/data**: GDPR-ready from v1 (export, delete, DPA, COPPA gate). Supabase TDE encrypts at rest.
- **DOAC-friendly**: License must not lock DOAC out of using/forking/integrating without copyleft burden. License default leans MIT/Apache-2.0 over AGPL-3.0.
- **OSS contributor-friendly**: One-command local dev, monorepo, conventional commits, "good first issue" path, clip-submission template for non-coders.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **Goal = OSS traction + DOAC pitch-readiness** (not behavior-change at scale, not personal use) | User explicitly chose OSS/portfolio framing; reshapes priority stack toward demo polish, docs, and DOAC-friendliness | — Pending |
| **MVP corpus: DOAC-only** | Maximum pitch leverage; show DOAC team a tailored experience; expand to Huberman/Attia/etc. only after DOAC engages or politely passes. Schema stays podcast-agnostic; brand identity stays neutral. | — Pending |
| **AI extraction pipeline deferred to v0.5 (Phase 5)** | Protects ~4–6 weeks of solo time; doc itself recommends this; hand-curated 30+ clips at MVP is sufficient demo material. `apps/worker/` ships as doc-only stub in Phase 1. | — Pending |
| **Community features cut from v1** (no feed, posts, reactions, leaderboards) | Goal is OSS traction (stars/contributors), not engagement loops; community without users is dead space; replaced by public shareable `/h/[slug]` habit pages | — Pending |
| **Habit-swap kept in v1** | Most concrete differentiator vs Habitica/Streaks/Loop; works fine with hand-curated clips | — Pending |
| **License: MIT + DCO bot + relicense-reservation clause** *(LOCKED)* | MIT for OSS reach + DOAC pitch friendliness; DCO over CLA (no corporate-feel barrier to drive-by contributors); relicense-reservation in CONTRIBUTING.md preserves future optionality. Must land before first public push. | ✓ Locked |
| **Streak design: "Streak Freeze" framing, 2 freezes/month banked, max 4** *(LOCKED)* | UI says "freeze," not "grace day" — gain-frame outperforms loss-frame in 2025 retention data. Banking gives users predictable agency. Streak demoted from primary UI; consistency view ("18/21 last 3 weeks") leads. | ✓ Locked |
| **Web-first, defer PWA** | Smaller scope risk; user accepts the tradeoff vs. "phones are where habits live" | ⚠️ Revisit if alpha feedback flags mobile pain |
| **Hosted demo at real domain (not self-host-only)** | DOAC won't `git clone`; click-through demo is a pitch hard requirement; cheap (~$5–25/mo) | — Pending |
| **Trusted-curator role designed in from MVP** | Single curator at launch (user); avoids future schema migration when contributors arrive | — Pending |
| **Working name: "Cited"** (alternates: Receipts, Lodestar, Margin, Practice — see `.planning/NAMING.md`) | Single word, one syllable, exactly describes the product, neutral (no medical mistakability), credible register. Final lock pending trademark + domain checks; rename hard-blocks Phase 4 alpha launch. | ⚠️ Revisit pre-launch |
| **Domain coverage: 4 domains** *(LOCKED)* — sleep / nutrition+gut / exercise+longevity / mental health | 6 domains was redundant (gut ⊂ nutrition; longevity ⊂ exercise+nutrition); 4 domains × ~7–8 clips each at MVP feels curated rather than thin | ✓ Locked |
| **Disclaimer modal must be acknowledged before onboarding completes** | Legal posture + record-keeping; cheap to build, painful to retrofit | — Pending |
| **DOAC pitch ladder: non-objection first, endorsement aspirational** *(LOCKED)* | Endorsement carries brand-control + liability fear at media businesses → high refusal rate. Non-objection ("OK to keep using clips with attribution + 48h takedown") is an easy yes and gets ~90% of the legal/social value. Endorsement is the bonus outcome if non-objection lands. | ✓ Locked |
| **Stack version bumps from artifact** *(LOCKED)* — Next.js 16 + Tailwind v4 + Biome + Fumadocs + `<YouTubeEmbed>` (lite-embed) | Stack research surfaced these as 2026-current; no reason to ship on prior majors. AGPL is explicitly avoided. | ✓ Locked |
| **Monorepo retained, admin as route group initially** *(LOCKED)* | pnpm + Turborepo monorepo from day 1 (cheap, OSS-credible, future-friendly). `apps/admin` = `apps/web/app/(admin)/...` route group with separate auth-gate layout. Split into dedicated `apps/admin` only when bundle size or independent-deploy needs warrant. `apps/worker/` = doc-only stub. | ✓ Locked |
| **Three-layer legal posture** *(LOCKED)* | "Deep-link only" is incomplete; must address (a) copyright/fair-use, (b) YouTube ToS (no chrome disable, Watch-on-YouTube affordance, Referer-Policy for self-hosters), (c) right-of-publicity (attribute named credentialed guest, never imply endorsement) | ✓ Locked |
| **GDPR Art. 9 granular consent** *(LOCKED)* | Habit data feeding sleep/anxiety/gut recs = special-category data. Separate consent toggles for: account, health-adjacent processing, AI/LLM analysis of free-text. Cascade erasure must include pgvector embeddings. | ✓ Locked |
| **No clip length cap; "as detailed as needed to convey the claim"** *(LOCKED)* | User wants depth over brevity. Trade-off: weakens fair-use factor 3 (amount). Mitigation: lean harder on factors 1 (transformative — habit operationalization with commentary) and 4 (drives traffic to DOAC, no market harm). Editorial guidance still favors brevity where the claim is short. | ✓ Locked |
| **Admin AI co-pilot for clip editing + manual cutter + document ingestion** *(LOCKED)* | Three admin-side accelerators: (a) chat-with-AI alongside clip editor to refine timestamps/wording, (b) paste YouTube URL or upload transcript to ingest into RAG corpus before any clips are extracted, (c) manual clip-cutter UI on ingested transcripts. Effectively a lightweight v1 stand-in for Phase 5's automated extraction pipeline; lets the corpus expand to non-DOAC sources without waiting for the Whisper worker. | ✓ Locked |
| **Sponsorship in scope, not paid tiers** *(LOCKED)* | No VC, no subscriptions, no paywall. Open Collective + GitHub Sponsors from launch with transparent burn-rate; one-page sponsorship deck explaining cost model and what each tier funds. Sponsorship is the sustainability path. | ✓ Locked |

## Open Questions / Recommendations to Revisit

These were surfaced during questioning and deserve explicit attention during research/planning:

1. **License final call** — MIT vs Apache-2.0 vs AGPL. Decide before any public push. Recommendation: **MIT** for max reach, **Apache-2.0** if patent grant matters.
2. **Curation throughput plan** — Even hand-curating 30 DOAC clips is real work. Estimate hours and bake into Phase 1 timeline.
3. **Streak grace-day exact rule** — 1 miss/week vs banked tokens vs other. Pick during UI/design phase.
4. **Domain consolidation** — 6 → 4 domains? Decide during requirements scoping.
5. **DOAC outreach timing** — Reach out *before* MVP ships? Risk: they say no, you've narrowed scope. Reward: aligned messaging + possibly assets/access. Recommendation: soft outreach at week 6 (post-alpha), formal pitch at week 12+ with metrics.
6. **iOS push notifications** — Web-first means weak push on iOS. Acceptable for MVP (the demo is desktop-friendly anyway), but flag this for v2.
7. **Mobile-first responsive design even without PWA** — Build the web app mobile-responsive from week 1 even if no PWA shell; cheap insurance.
8. **Cold-start retention risk** — A habit tracker without notifications and without community needs *some* re-engagement loop. Email digest? Calendar invite per habit? Decide during planning.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-07 after initialization*
