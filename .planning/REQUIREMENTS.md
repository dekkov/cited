# Requirements: Hdiary (working title)

**Defined:** 2026-05-07
**Core Value:** Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip with a clear claim and credentialed speaker.

## v1 Requirements

### Foundation & Repo

- [x] **FND-01**: Monorepo (pnpm + Turborepo) with `apps/web`, `packages/db`, `packages/core`, `packages/ui`, `packages/config`, `packages/api-contracts`; `apps/worker/` as doc-only stub
- [x] **FND-02**: Strict TypeScript, Biome (lint+format), Husky + lint-staged pre-commit
- [x] **FND-03**: One-command local dev (`pnpm dev`) and `docker compose up` self-host path
- [x] **FND-04**: docker-compose CI smoke test passes from clean checkout
- [x] **FND-05**: Vitest + React Testing Library + Playwright wired in CI
- [x] **FND-06**: Drizzle schema with full table set: `profiles`, `podcasts`, `episodes`, `clips`, `clip_edits` (audit log for ADMN-11), `transcript_chunks` (RAG-able transcript fragments per ADMN-13), `habit_templates`, `habit_template_clips`, `user_habits`, `check_ins`, `streaks`, `streak_freezes`, `extraction_jobs`, `clips_pending` (Phase 5 placeholders)
- [x] **FND-07**: drizzle-kit migrations + co-located RLS policy SQL; RLS policy on every user-data table
- [x] **FND-08**: `packages/api-contracts` zod schemas mirrored for the deferred Python worker contract
- [x] **FND-09**: gitleaks secrets scan in CI

### Authentication & Consent

- [x] **AUTH-01**: User can sign up via Supabase email magic link
- [x] **AUTH-02**: User can sign up / sign in via Google OAuth
- [x] **AUTH-03**: User session persists across browser refresh; sign-out works from any page
- [x] **AUTH-04**: User must acknowledge medical disclaimer modal before onboarding completes (recorded in `profiles.disclaimer_accepted_at`)
- [x] **AUTH-05**: Granular GDPR Art. 9 consent toggles at signup: (a) account creation, (b) health-adjacent data processing, (c) AI/LLM analysis of free-text answers — each independently togglable, recorded with timestamps
- [x] **AUTH-06**: Date-of-birth gate enforces ≥13 (US) / ≥16 (EU jurisdictions); refusal blocks signup with clear messaging

### Profile

- [x] **PROF-01**: User has a profile with display name, timezone, goals (jsonb)
- [x] **PROF-02**: User can edit display name, timezone, privacy mode (`public` / `private`)
- [x] **PROF-03**: User can request one-click JSON export of all their data (account, habits, check-ins, streaks, consent records)
- [x] **PROF-04**: User can request account deletion; cascade-deletes all their rows including pgvector embeddings within 30 days; integration test verifies cascade

### Curation Admin (DOAC corpus)

- [x] **ADMN-01**: `(admin)` route group inside `apps/web` with separate auth-gate layout, gated by `profiles.role = 'curator' | 'admin'`
- [x] **ADMN-02**: Trusted-curator role exists in schema from MVP (single curator at launch — the user)
- [x] **ADMN-03**: Admin UI to create/edit/approve/reject clips with fields: claim, rationale, speaker (named guest), `speaker_status` (verified | unverified | host), domain (one of 4), start/end seconds, evidence_strength, risk_flags (mandatory), youtube_video_id, episode_id
- [x] **ADMN-04**: Approving a clip triggers OpenAI `text-embedding-3-small` write to the `clips.embedding` vector column (embed-on-approve, not on read)
- [x] **ADMN-05**: Risk flags are mandatory on approval; clips with `risk_flags @> '{medical_advice,supplement,contraindication}'` show a banner in user UI: "Consult a doctor before trying this."
- [x] **ADMN-06**: Hard-block approval of clips touching prescription drugs, dosing, or treatment of diagnosed conditions
- [x] **ADMN-07**: Admin can mark an episode as `removed_from_source` (one-click); cascade-flags all linked clips as unavailable in user-facing surfaces
- [x] **ADMN-08**: Daily pg_cron job pings YouTube oEmbed for each linked episode; flags clips whose source video is no longer available
- [x] **ADMN-09**: Curated DOAC corpus reaches **≥30 approved clips across the 4 domains** (sleep / nutrition+gut / exercise+longevity / mental health) before alpha launch
- [x] **ADMN-10**: Admin clip editor exposes a chat-with-AI co-pilot that can suggest start/end timestamp adjustments, refine claim/rationale wording, and propose alternative phrasings — suggestions are previews; admin must explicitly accept each change
- [x] **ADMN-11**: Audit log records every AI suggestion + accept/reject decision per clip (`clip_edits` table) for transparency and to allow rollback
- [x] **ADMN-12**: Admin can ingest source material into the RAG corpus by (a) pasting a YouTube URL — system fetches metadata + auto-captions if available, or (b) uploading a transcript document (md / txt / vtt / srt). Ingested transcript stored at `episodes.transcript_uri` (Cloudflare R2 in v1 simplified to text-blob in Postgres if R2 not yet provisioned)
- [x] **ADMN-13**: Ingested transcripts are indexed into the RAG corpus (chunked + embedded) even before any clips are extracted, so the AI interview can reference the source material in onboarding RAG retrieval
- [x] **ADMN-14**: Admin manual clip cutter UI: scrubs through ingested transcript with timestamp anchors; admin selects start/end; clip enters `pending` lifecycle and goes through normal approve flow (ADMN-04..06)
- [x] **ADMN-15**: Clip length is not capped; editorial guidance is "as detailed as needed to convey the claim, not more" — surface this guideline inline in the clip editor as a non-blocking hint
- [x] **ADMN-16**: When admin ingests a podcast that is NOT in `podcasts` table yet, an inline form lets admin add the podcast (name, host, trust_tier) — keeps schema podcast-agnostic in practice, not just on paper

### AI Onboarding Interview

- [ ] **AION-01**: After signup + consent + disclaimer, user enters AI-driven onboarding interview
- [ ] **AION-02**: Interview is a 6–10 turn adaptive conversation covering 4 domains (sleep / nutrition+gut / exercise+longevity / mental health)
- [ ] **AION-03**: Each turn is grounded in real DOAC content via hybrid RAG (pgvector cosine + tsvector full-text) over the curated clip corpus
- [ ] **AION-04**: After turn 3, the agent prioritizes the largest identified gap domain
- [ ] **AION-05**: Interview output is a structured user profile (jsonb) with identified gap domains and one-sentence summaries
- [ ] **AION-06**: LLM never gives medical advice; if user mentions symptoms, the agent suggests seeing a doctor and continues
- [ ] **AION-07**: Free-text user answers are only sent to the LLM if AUTH-05 toggle (c) was opted in; otherwise interview falls back to structured choices
- [ ] **AION-08**: Cheap turn model (Haiku 4.5 / GPT-4o-mini) for interim turns; Sonnet 4.x for final habit synthesis
- [x] **AION-09**: All LLM provider calls go through `packages/core/llm` provider-wrapper interfaces (not direct SDK calls in routes)
- [x] **AION-10**: A 20-transcript hand-graded hallucination eval set exists; CI runs eval against current prompts; regressions fail the build

### Habit Recommendations & Adoption

- [ ] **REC-01**: After interview, LLM proposes 3–5 personalized habit candidates ranked by expected impact
- [ ] **REC-02**: Each habit candidate has 2–3 evidence clip citations validated against the actual `clips` table (post-generation citation grounding check; broken citations dropped, recommendation regenerated if <2 valid)
- [ ] **REC-03**: At least one habit per identified-gap domain
- [ ] **REC-04**: Each habit candidate includes a `trigger` (when/where — implementation-intention) and an `tiny_action` (BJ Fogg-style minimum)
- [ ] **REC-05**: User can adopt 1, several, or all proposed habits; adoption creates `user_habits` rows linked to a `habit_templates` row + clip citations
- [ ] **REC-06**: User can re-run the interview at any time from settings (creates a new run, doesn't overwrite history)

### Habit Cards & Daily Check-In

- [ ] **HAB-01**: Habit dashboard lists active habits with: title, frequency, time-of-day, primary clip thumbnail, today's check-in state
- [ ] **HAB-02**: Tri-state daily check-in: `done` / `skipped` / `partial`; one tap from dashboard
- [ ] **HAB-03**: Optional mood (1–5) and free-text note on check-in (note text only stored if AUTH-05(c) is opted in)
- [ ] **HAB-04**: Habit detail page shows: full claim, speaker attribution (named credentialed guest, never implied endorsement), embedded `<YouTubeEmbed>` (lite-embed, start/end timestamps from clip — length is whatever the curator set, no client-side cap), prominent "Watch on Diary of a CEO" CTA, swap button
- [ ] **HAB-05**: YouTube embed never disables player chrome; preserves Watch-on-YouTube affordance per YouTube ToS
- [ ] **HAB-06**: Consistency view ("18/21 last 3 weeks") is the **primary** progress UI element on the dashboard
- [ ] **HAB-07**: Streak counter is a **secondary** UI element (not largest on page); displays current streak and freezes-available
- [ ] **HAB-08**: Streak Freeze rule: 2 freezes/month, max 4 banked; auto-applied on the first miss of a week if available; user sees gain-frame message ("1 freeze used — streak preserved")
- [ ] **HAB-09**: Streaks ≥30 days hide from the daily view to reduce loss-aversion pressure
- [ ] **HAB-10**: No red, no flame, no shame UI for missed days; missed days render as muted neutral

### Habit Swap

- [ ] **SWAP-01**: User can request a swap with reason (too hard / dislike / schedule conflict / other free-text)
- [ ] **SWAP-02**: System retrieves substantively-different clip in same domain (cosine similarity > 0.7 to current AND from a different cluster), proposes alternative habit
- [ ] **SWAP-03**: Alternative habit includes 2 evidence citations validated as in REC-02
- [ ] **SWAP-04**: User can accept the swap (replaces user_habit) or keep current

### Public Habit Pages (Pitch Leverage)

- [ ] **PUB-01**: Each `habit_templates` row has a public, shareable URL `/h/[slug]`
- [ ] **PUB-02**: Public page renders: claim, speaker attribution, embedded YouTube clip, "Watch on Diary of a CEO" CTA, "Adopt this habit" CTA (links to signup or auto-adopts if logged in)
- [ ] **PUB-03**: Open Graph image is auto-generated per habit (og:image route handler)
- [ ] **PUB-04**: Public pages are SEO-friendly (server-rendered, structured data, sitemap)
- [ ] **PUB-05**: No private user data leaks via public pages (RLS policy + integration test)

### Re-engagement

- [ ] **REM-01**: User can opt in to email reminders per habit (cadence: daily | weekday | custom days)
- [ ] **REM-02**: Email reminders include the habit's clip thumbnail + tap-through `?t=START` deep link
- [ ] **REM-03**: Weekly compassionate digest email summarizing consistency + spotlighting 1 clip from a domain user is light on (opt-out)
- [ ] **REM-04**: Each habit emits an `.ics` calendar invite the user can subscribe to
- [ ] **REM-05**: Disclaimer footer in every notification email

### Compliance & Legal Posture

- [x] **LGL-01**: Health disclaimer prominent on every habit card, public habit page, and onboarding flow
- [x] **LGL-02**: DMCA takedown contact email + 48-hour response SLA published in `/legal/dmca`
- [x] **LGL-03**: One-click admin "remove episode + clips + blacklist" workflow when takedown received
- [ ] **LGL-04**: Privacy policy + Data Processing Addendum + sub-processor list (Supabase, Vercel, OpenAI/Anthropic) published
- [ ] **LGL-05**: Editorial & Attribution Policy published (`MEDICAL_REVIEW.md`); reviewer credentials documented; supplement/fasting topics require reviewer with MD/RD/PhD before merge
- [ ] **LGL-06**: Right-of-publicity stance: clips attribute the named credentialed guest only; never imply endorsement of the app by host or guest; published in legal page
- [ ] **LGL-07**: Self-host docs include Referer-Policy guidance for YouTube embed compatibility
- [x] **LGL-08**: Editorial policy in `MEDICAL_REVIEW.md` includes clip-length guidance: "as much as needed to convey the claim, not more — transformative purpose + link-back to source carry the fair-use posture, since amount-used (factor 3) is weaker without a hard length cap"

### OSS Hygiene

- [ ] **OSS-01**: `LICENSE` file = MIT
- [ ] **OSS-02**: `CONTRIBUTING.md` includes DCO sign-off requirement + relicense-reservation clause + clip-submission template + dev setup
- [ ] **OSS-03**: DCO bot enforces `Signed-off-by` on every PR via GitHub Action
- [ ] **OSS-04**: `CODE_OF_CONDUCT.md` based on Contributor Covenant
- [ ] **OSS-05**: Issue and PR templates, "good first issue" labeling convention documented
- [ ] **OSS-06**: Stale-bot configured to auto-close stale issues/PRs after 60d inactivity with friendly message
- [ ] **OSS-07**: Public maintainer-bandwidth statement in README ("solo maintainer, expect ~2h/week triage")
- [ ] **OSS-08**: Docs site (Fumadocs) deployed at `docs.<domain>` with: Quickstart, Self-host guide, Clip curation guide, Architecture overview, Privacy/legal page
- [ ] **OSS-09**: Open Collective + GitHub Sponsors set up with transparent burn-rate from launch
- [ ] **OSS-10**: 5-minute "self-host in 10 commands" Loom in README
- [ ] **OSS-11**: One-page sponsorship deck (publicly hosted) covering: monthly cost breakdown (Vercel + Supabase + Hetzner + LLM API), suggested sponsorship tiers (e.g., $5/$25/$100/mo), what each tier funds (e.g., "1 sponsor at $25/mo covers our LLM bill at current usage"), recognition (README logo wall, optional)
- [ ] **OSS-12**: Sponsor recognition table in README auto-renders from Open Collective data (no manual upkeep)

### Hosted Demo

- [ ] **DEMO-01**: Polished hosted instance at a real domain (Vercel + Supabase free + Hetzner CX22 if needed)
- [ ] **DEMO-02**: Demo seeded with the curated DOAC corpus (≥30 approved clips)
- [ ] **DEMO-03**: Demo signup is open (rate-limited); test users have isolated data via RLS
- [ ] **DEMO-04**: Demo includes "tour mode" auto-walkthrough OR a Loom recording of the full happy path

### DOAC Pitch (Phase 5)

- [ ] **PITCH-01**: Pitch deck pre-empts 5 concerns: IP optionality (MIT license), brand control (no DOAC-named branding, attribution to guest), endorsement liability (asking non-objection not endorsement), deal shape (no monetization, Open Collective), bandwidth (no ongoing commitment requested)
- [ ] **PITCH-02**: One-page MoU template ready for non-objection sign-off
- [ ] **PITCH-03**: Plan-B corpus expansion list (Attia, FoundMyFitness, ZOE, Sigma Nutrition) maintained privately for pivot
- [ ] **PITCH-04**: Outreach to a named partnerships contact (not press@), avoiding any DOAC news weeks
- [ ] **PITCH-05**: Pitch is delivered with concrete alpha metrics (signups, retention, click-through to DOAC YouTube)

### Pre-Launch Naming

- [ ] **NAME-01**: User produces ≥3 candidate names (neutral, not DOAC-anchored, not health-service-mistakable) by end of Phase 1
- [ ] **NAME-02**: Domain + GitHub org/handles reserved for chosen name before Phase 4 alpha launch
- [ ] **NAME-03**: Repo, package names, hosted-demo URL all renamed pre-launch

## v2 Requirements

### Mobile / PWA

- **MOB-01**: PWA shell with Add-to-Home-Screen + offline check-in cache
- **MOB-02**: Web Push notifications (Android primary, iOS best-effort)
- **MOB-03**: Capacitor wrapper evaluated if iOS push is critical for retention

### Mood / Body / Insights

- **INS-01**: Mood tracking dashboard with trends over time
- **INS-02**: Structured "body changes" inputs (sleep hours, energy 1–10, weight delta) with charts
- **INS-03**: AI-generated weekly review summarizing user's check-ins with relevant clip suggestions

### Community

- **COMM-01**: Public profiles + follow system + privacy controls
- **COMM-02**: Community feed (posts + reactions)
- **COMM-03**: Streak leaderboards
- **COMM-04**: Moderation tools, report-post flow

### Voice & Wearables

- **EXT-01**: Voice onboarding (Whisper STT + agent)
- **EXT-02**: Apple Health / Google Fit / Oura ring integrations for objective verification

### Self-Hostable Local AI

- **LOCAL-01**: Config switch for fully-local stack: Ollama (Llama 3.1 8B / Qwen 2.5 7B) + bge-small-en-v1.5 embeddings
- **LOCAL-02**: Bring-your-own-key mode for hosted users wanting privacy

### Corpus Expansion

- **CORP-01**: Add Huberman Lab, Peter Attia's Drive, ZOE, FoundMyFitness, Sigma Nutrition (post-DOAC engagement or polite pass)
- **CORP-02**: Crowdsourced clip submission via PR template, gated by trusted-curator review

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| Community feed, posts, reactions, leaderboards | Goal is OSS traction + DOAC pitch, not engagement loops; community without users is dead space |
| Full AI clip-extraction pipeline (Whisper + pyannote + claim extraction) | Deferred to v0.5/Phase 5; ≥30 hand-curated DOAC clips is sufficient demo material; protects ~4–6 weeks of solo time |
| Additional podcasts beyond DOAC | Deferred until DOAC pitch outcome known; broader corpus dilutes pitch leverage |
| Native mobile app or Capacitor wrapper | Deferred; web-first MVP, evaluate during alpha based on feedback |
| Mood-trend dashboards, body-changes structured posts, weekly AI review | Deferred to v2; not on the demo critical path |
| Voice onboarding, wearable integrations | Out of scope for v1; v2+ |
| Local-LLM mode (Ollama / bge-small) | Deferred to v2; hosted-API LLMs sufficient for MVP |
| Bring-your-own-API-key mode | Adds onboarding friction; revisit when cost pressure is real |
| VC funding, paid tiers, subscriptions | Out of scope; supporter tier via Open Collective only if hosting cost grows (Plausible / Standard Notes pattern) |
| Real-time push notifications via WebSocket / Pusher / Ably | Out of scope; email + opt-in Web Push is sufficient |
| Free-text custom habits without clip evidence | Anti-feature; protects Core Value (every habit must have clip evidence) |
| Streak as largest UI element / red shame state / loss-frame messaging | Anti-feature; 2025 retention research shows it accelerates abandonment |
| AGPL-3.0 license | Repels enterprise contributors and DOAC pitch optionality |
| Pinecone / Weaviate (separate vector DB) | Pgvector handles >>10K vectors; second datastore is operational overhead with no benefit at MVP scale |

## Traceability

Populated by gsd-roadmapper on 2026-05-07. Every v1 REQ-ID maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| PROF-01 | Phase 1 | Complete |
| PROF-02 | Phase 1 | Complete |
| PROF-03 | Phase 4 | Pending (schema plumbing in Phase 1) |
| PROF-04 | Phase 4 | Pending (cascade design in Phase 1) |
| ADMN-01 | Phase 1 | Complete |
| ADMN-02 | Phase 1 | Complete |
| ADMN-03 | Phase 2 | Complete |
| ADMN-04 | Phase 2 | Complete |
| ADMN-05 | Phase 2 | Complete |
| ADMN-06 | Phase 2 | Complete |
| ADMN-07 | Phase 2 | Complete |
| ADMN-08 | Phase 2 | Complete |
| ADMN-09 | Phase 2 | Complete |
| ADMN-10 | Phase 2 | Complete |
| ADMN-11 | Phase 2 | Complete |
| ADMN-12 | Phase 2 | Complete |
| ADMN-13 | Phase 2 | Complete |
| ADMN-14 | Phase 2 | Complete |
| ADMN-15 | Phase 2 | Complete |
| ADMN-16 | Phase 2 | Complete |
| AION-01 | Phase 3 | Pending |
| AION-02 | Phase 3 | Pending |
| AION-03 | Phase 3 | Pending |
| AION-04 | Phase 3 | Pending |
| AION-05 | Phase 3 | Pending |
| AION-06 | Phase 3 | Pending |
| AION-07 | Phase 3 | Pending |
| AION-08 | Phase 3 | Pending |
| AION-09 | Phase 1 | Complete |
| AION-10 | Phase 2 | Complete |
| REC-01 | Phase 3 | Pending |
| REC-02 | Phase 3 | Pending |
| REC-03 | Phase 3 | Pending |
| REC-04 | Phase 3 | Pending |
| REC-05 | Phase 3 | Pending |
| REC-06 | Phase 3 | Pending |
| HAB-01 | Phase 3 | Pending |
| HAB-02 | Phase 3 | Pending |
| HAB-03 | Phase 3 | Pending |
| HAB-04 | Phase 3 | Pending |
| HAB-05 | Phase 3 | Pending |
| HAB-06 | Phase 3 | Pending |
| HAB-07 | Phase 3 | Pending |
| HAB-08 | Phase 3 | Pending |
| HAB-09 | Phase 3 | Pending |
| HAB-10 | Phase 3 | Pending |
| SWAP-01 | Phase 3 | Pending |
| SWAP-02 | Phase 3 | Pending |
| SWAP-03 | Phase 3 | Pending |
| SWAP-04 | Phase 3 | Pending |
| PUB-01 | Phase 3 | Pending |
| PUB-02 | Phase 3 | Pending |
| PUB-03 | Phase 3 | Pending |
| PUB-04 | Phase 3 | Pending |
| PUB-05 | Phase 3 | Pending |
| REM-01 | Phase 4 | Pending |
| REM-02 | Phase 4 | Pending |
| REM-03 | Phase 4 | Pending |
| REM-04 | Phase 4 | Pending |
| REM-05 | Phase 4 | Pending |
| LGL-01 | Phase 2 | Complete |
| LGL-02 | Phase 2 | Complete |
| LGL-03 | Phase 2 | Complete |
| LGL-04 | Phase 1 | Pending |
| LGL-05 | Phase 1 | Pending |
| LGL-06 | Phase 1 | Pending |
| LGL-07 | Phase 1 | Pending |
| LGL-08 | Phase 2 | Complete |
| OSS-01 | Phase 1 | Pending |
| OSS-02 | Phase 1 | Pending |
| OSS-03 | Phase 1 | Pending |
| OSS-04 | Phase 1 | Pending |
| OSS-05 | Phase 1 | Pending |
| OSS-06 | Phase 4 | Pending |
| OSS-07 | Phase 1 | Pending |
| OSS-08 | Phase 4 | Pending |
| OSS-09 | Phase 1 | Pending |
| OSS-10 | Phase 4 | Pending |
| OSS-11 | Phase 4 | Pending |
| OSS-12 | Phase 4 | Pending |
| DEMO-01 | Phase 4 | Pending |
| DEMO-02 | Phase 4 | Pending |
| DEMO-03 | Phase 4 | Pending |
| DEMO-04 | Phase 4 | Pending |
| PITCH-01 | Phase 5 | Pending |
| PITCH-02 | Phase 5 | Pending |
| PITCH-03 | Phase 5 | Pending |
| PITCH-04 | Phase 5 | Pending |
| PITCH-05 | Phase 5 | Pending |
| NAME-01 | Phase 1 | Pending |
| NAME-02 | Phase 4 | Pending |
| NAME-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: **107 total** (note: prior header said "86" — recount shows 107 across 15 categories: FND 9 + AUTH 6 + PROF 4 + ADMN 16 + AION 10 + REC 6 + HAB 10 + SWAP 4 + PUB 5 + REM 5 + LGL 8 + OSS 12 + DEMO 4 + PITCH 5 + NAME 3 = 107)
- Mapped to phases: **107 / 107 ✓**
- Unmapped: 0
- Phase distribution: Phase 1 = 34, Phase 2 = 19, Phase 3 = 33, Phase 4 = 16, Phase 5 = 5

---
*Requirements defined: 2026-05-07*
*Traceability populated: 2026-05-07 by gsd-roadmapper*
*Last updated: 2026-05-07*
