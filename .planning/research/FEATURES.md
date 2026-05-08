# Feature Research

**Domain:** Evidence-backed health habit tracker (podcast-clip-grounded), OSS-forward, DOAC pitch-ready
**Researched:** 2026-05-07
**Confidence:** HIGH (synthesized from explicit PROJECT.md scope, well-known competitor feature sets, and habit-science / OSS-pitch context provided)

---

## Orientation

This product sits at the intersection of three established categories whose feature sets are well understood:

1. **Habit trackers** (Habitica, Streaks, Way of Life, Fabulous, Habitify, Loop/uHabits, TickTick, BeaverHabits, Habo, MyDailies, OpenHabitTracker)
2. **Evidence-backed health/coaching apps** (Noom, Fay Nutrition, Wellory, Examine.com, FoundMyFitness)
3. **Podcast-clip products** (Snipd, Recast, Airr)

The unique seam is **podcast-clip-as-evidence-layer attached to a recommended habit**, OSS-licensed, with a hand-curated DOAC corpus at MVP. Categorization below is calibrated against PROJECT.md's explicit cuts (no community, no extraction pipeline, DOAC-only, web-first) and the dual goal: **OSS traction + DOAC pitch demo**, NOT mass behavior-change.

Three lenses applied to every feature:
- **Demo flag**: Is it required to make a Loom-able pitch demo for DOAC's team?
- **Complexity**: S (≤1 day), M (2–5 days), L (>1 week solo at ~25h/wk)
- **Dependencies**: What must exist first?

---

## Feature Landscape

### Table Stakes (Users Expect These — Missing = Abandonment)

These come from habit-tracker convention. Empirical pattern across Habitica, Streaks, Loop, Habitify, TickTick: when any of these are missing, App Store reviews / GitHub issues complain within a week.

| # | Feature | Why Expected | Complexity | Demo? | Dependencies |
|---|---------|--------------|------------|-------|--------------|
| T1 | **Account + auth (email magic link, Google OAuth)** | Cross-device sync presumed in 2026; nothing else works without identity | M | Yes | — |
| T2 | **Habit list view (today's habits)** | The home screen of every habit app | S | Yes | T1 |
| T3 | **One-tap daily check-in (done / skipped / partial)** | Friction here is the #1 abandonment reason; tri-state ("partial") is a small but meaningful improvement over binary | S | Yes | T2 |
| T4 | **Habit detail / card view** | Users want to see why they're doing it; in our case this is also where the clip lives | S | Yes | T2 |
| T5 | **Streak counter** | Habit-tracker shorthand; users explicitly look for this number. Combine with grace-day per Decision in PROJECT.md | S | Yes | T3 |
| T6 | **Consistency view (e.g., "18/21 last 3 weeks")** | Counters the dishonesty of pure streaks; Loop and Way of Life do this well | S | Yes | T3 |
| T7 | **Habit frequency / scheduling (daily, X days/week, specific days)** | Not all habits are daily; rigid daily-only frustrates users immediately | M | Yes | T2 |
| T8 | **Time-of-day suggestion (morning / afternoon / evening / anytime)** | Habit science (cue-routine-reward) requires temporal anchoring; cheap to add | S | Yes | T7 |
| T9 | **Edit / delete habit** | CRUD baseline | S | Yes | T2 |
| T10 | **Cross-device sync (web responsive across desktop + mobile browser)** | Mobile-responsive web is non-negotiable even with PWA deferred. Decision #7 in PROJECT.md confirms this | M | Yes | T1, T2 |
| T11 | **Email reminders / digest (re-engagement loop)** | PROJECT.md Open Question #8 explicitly flags cold-start retention risk without notifications. With no community + no PWA push, email is the only re-engagement channel | M | Pitch-nice-to-have | T1 |
| T12 | **Today's date / calendar context** | Users orient by date; a habit app that doesn't show "today" feels broken | S | Yes | T2 |
| T13 | **History view (past N days at a glance)** | Habitify, Streaks, Loop all have a calendar-grid or heatmap view; users use it to assess themselves | M | Yes | T3 |
| T14 | **Sign out + delete account** | GDPR + basic dignity. PROJECT.md requires one-click data export + delete | M | Yes (legal posture in pitch) | T1 |
| T15 | **Loading / empty / error states** | A demo without empty-state polish dies on the Loom recording | S | Yes | All |
| T16 | **Onboarding flow that explains the product in <60s** | First-launch experience; in our case the AI interview is *the* onboarding, but it still needs framing | M | Yes | T1, D1 |
| T17 | **Health/medical disclaimer acknowledgment** | Legal table stakes for anything health-adjacent; PROJECT.md mandates it | S | Yes | T16 |

**Table-stakes complexity total:** ~15–20 dev days. This is the baseline; nothing here is differentiating, but skipping any of T1–T13 means the product fails the smell test.

---

### Differentiators (Competitive Advantage — These Are Why This Project Exists)

These are where the project competes. Each maps directly to PROJECT.md Core Value or Key Decisions. **Do not try to differentiate on anything else.**

| # | Feature | Value Proposition | Complexity | Demo? | Dependencies |
|---|---------|-------------------|------------|-------|--------------|
| D1 | **AI-driven adaptive onboarding interview (6–10 turns, RAG-grounded)** | No competitor does this. Habitica/Streaks ask zero questions; Noom/Fay use form-driven intake. The interview is the demo's "wow" moment — it produces a personalized habit list with citations in <5 minutes | L | **Critical** | T1, D2, D5 |
| D2 | **Curated DOAC clip library (deep-linked, 30+ clips, 4–6 domains)** | The entire evidence layer. Without this, the rest is a generic habit tracker. Hand-curated at MVP per Decision #3 | M (curation effort) + S (data model) | **Critical** | — |
| D3 | **Habit card with embedded YouTube clip + claim + speaker attribution** | The "see the why in 90 seconds" promise made concrete. This single screen is what gets screenshotted in the pitch deck | M | **Critical** | T4, D2 |
| D4 | **Habit-swap with equivalent-benefit substitution** | The most concrete differentiator vs Habitica/Streaks/Loop per Decision #5. Solves the #1 reason habits fail (doesn't fit life). Cluster-based retrieval over the same domain | M | **Critical** | D2, D5 |
| D5 | **RAG over clip library (pgvector + tsvector hybrid)** | Powers both onboarding (D1) and swap (D4). Standard hybrid-search pattern; the differentiation is the *corpus*, not the technique | M | Indirect (powers D1, D4) | D2 |
| D6 | **Public, SEO-friendly habit pages (`/h/[slug]`)** | The only "social" surface in v1 per PROJECT.md. Doubles as marketing (DOAC referrer traffic) and pitch leverage ("we drive listeners *to* your show"). Each page = a free organic SEO landing page | M | **Critical for pitch narrative** | D3 |
| D7 | **Strong "Watch on Diary of a CEO" CTA on every clip** | Pitch alignment: framed as driving listeners *to* DOAC, not extracting from them. This is a one-line UI addition with disproportionate strategic value | S | **Critical** | D3 |
| D8 | **Trusted-curator role + admin UI for clip management** | Required by PROJECT.md (single curator at launch, schema designed to expand). The admin UI is also the curator's daily tool — its quality determines clip throughput | M | Optional (background) | D2, T1 |
| D9 | **Grace-day streak mechanic** | Decision #6: rigid streaks accelerate abandonment. Differentiates against Streaks/Habitica's brittle counters. Cheap to build, signals editorial sophistication | S | Yes (pitch talking point) | T5 |
| D10 | **Risk flag + evidence-strength taxonomy on clips** | Editorial transparency the wellness category lacks. Examine.com is the closest analog. Demonstrates rigor to DOAC's medical-adjacent risk concerns | S (data model) + M (taxonomy design) | Yes (legal/pitch posture) | D2 |
| D11 | **One-command local dev + `docker compose up` self-host** | The OSS-traction lever. uHabits / BeaverHabits / Habo prove the self-host audience exists; this is how you capture it | M | No (matters for stars, not demo) | All |
| D12 | **Clip-submission template (non-coder contributor path)** | OSS contributor onramp for the curation-heavy parts. Mirrors Wikipedia's editor-recruit pattern at micro-scale | S | No | D8 |
| D13 | **GDPR data export (JSON) + cascading delete** | Legal differentiator vs many US-built habit apps; also a trust signal for EU pitch audiences | M | Mention in pitch | T1, T14 |
| D14 | **Domain taxonomy (sleep / nutrition / exercise / mental health, possibly +gut/longevity)** | Organizes the experience and the corpus. Decision #11 flags possible 6→4 consolidation | S | Yes | D2 |
| D15 | **AI-suggested habit candidates with 2–3 evidence citations each** | Output of D1; the moment a user goes "huh, that's actually for me." Multiple citations per habit signals editorial seriousness | M | **Critical** | D1, D5 |

**Differentiator complexity total:** ~25–35 dev days + significant curation hours (D2 is people-time, not code-time).

**Pitch-critical subset (the Loom demo MUST show these):** D1, D2, D3, D4, D6, D7, D15 — plus the table-stakes shell.

---

### Anti-Features (Deliberately NOT Built — Reasoning Logged)

Each row is a feature competitors have or users will request. Not building these is a strategic choice tied to PROJECT.md Decisions and goal-fit.

| # | Anti-Feature | Why Tempting / Requested | Why Problematic Here | Alternative |
|----|-------------|---------------------------|---------------------|-------------|
| A1 | **Community feed, posts, reactions, comments** | Habitica's core loop; "engagement" is sticky | Cut explicitly in PROJECT.md. Goal is OSS traction (stars, contributors), not engagement. A community without users is dead space and adds moderation, abuse, spam, and trust-and-safety burden a solo dev cannot service | Public shareable habit pages (D6) — outbound visibility with zero inbound moderation surface |
| A2 | **Leaderboards / rankings / competitive streaks** | Drives short-term retention | Inverts the "evidence-backed, dignified" brand. Health behavior under social-comparison pressure is the Noom-trap. DOAC audience is the *opposite* demographic | Personal consistency view (T6) and grace-day streak (D9) |
| A3 | **Gamification XP / coins / avatars / battles** | Habitica's signature; fun for some users | Trivializes a health product targeting podcast-listening adults. Visual style alone repels the DOAC pitch audience | Editorial polish, evidence quality, attribution clarity |
| A4 | **Push notifications (PWA / native)** | "Phones are where habits live" | Web-first explicitly chosen; iOS web push is weak per Open Question #6. Building it twice (web → PWA → native) is a scope time-bomb | Email reminders/digest (T11) is the v1 re-engagement loop |
| A5 | **Wearable integrations (Oura, Apple Health, Google Fit)** | Asked for constantly in habit-tracker reviews | Explicitly out of scope per PROJECT.md. Each integration = a vendor relationship, OAuth flow, data-mapping problem, and ongoing maintenance burden. Zero contribution to DOAC pitch | Manual check-in (T3); revisit v2+ |
| A6 | **Paid tier / freemium / subscriptions** | Monetization | Out of scope per PROJECT.md ("no fundraising plan"). Paywalls also repel OSS contributors and DOAC framing | Open Collective "supporter tier" pattern (Plausible / Standard Notes) — only if hosting cost grows |
| A7 | **In-app coaching / human coach chat** | Noom / Fay / Wellory model | Requires staffed humans; dilutes the OSS positioning; introduces scope-of-practice / liability beyond MVP disclaimer coverage | The clip itself is the "coach" — credentialed expert speaks once, asynchronously |
| A8 | **Self-hosted / local LLM mode (Ollama, bge-small)** | OSS-friendly cred; privacy story | Deferred per PROJECT.md. Multi-backend AI = 2× testing + 2× prompt-tuning + 2× drift surfaces. v2 contributor-friendly add | Hosted-API-only at v1; document the v2 plan in `MEDICAL_REVIEW.md` or contributor docs |
| A9 | **Bring-your-own-API-key onboarding** | "Free forever" cred | Adds onboarding friction during the most fragile user moment. Deferred per PROJECT.md | Hosted keys at v1; revisit when cost pressure is real |
| A10 | **Mood tracking / journaling / structured posts** | Common in wellness apps | Deferred to v2 per PROJECT.md. Each is a separate domain model and UI surface; none contributes to the clip-evidence differentiator | Out of scope; revisit post-pitch |
| A11 | **Native mobile app / Capacitor wrapper** | "Habits live on phones" | Deferred. Web-first MVP per Decision #7 | Mobile-responsive web (T10); revisit only if iOS push becomes critical |
| A12 | **Real-time multi-device sync / collaborative habits** | Notion-like polish | Adds CRDT or websocket complexity; adds zero pitch value. Standard request-response with optimistic UI is sufficient for a single-user habit tracker | Server is source of truth; refresh on focus |
| A13 | **Multiple podcast sources at MVP (Huberman, Attia, ZOE, FMF)** | Broader corpus = broader appeal | Decision #2: DOAC-only maximizes pitch leverage and signals focus. Multi-source dilutes the "tailored experience for DOAC's team" pitch | Single-source DOAC at MVP; expansion is a documented v1.x feature gated on DOAC outcome |
| A14 | **AI clip-extraction pipeline (Whisper + pyannote + claim extraction)** | The "real" automated version of the product | Decision #3: deferred to v0.5/Phase 2. 4–6 weeks of solo work that doesn't change the user-facing demo | Hand-curate 30+ clips for MVP; pipeline is the v0.5 milestone |
| A15 | **Body-changes structured posts / weight tracking / measurements** | Wellness-app convention | Deferred to v2; raises medical-claim surface area | Out of scope |
| A16 | **Voice onboarding** | "AI-native" feel | Deferred to v2+; text interview is sufficient for the demo and dramatically simpler | Text interview (D1) at v1 |
| A17 | **Re-host audio / video / transcripts publicly** | "Faster playback" / offline | **Hard legal line.** Decision/Constraint: deep-link only, never re-host. Re-hosting destroys DOAC-friendly positioning and creates copyright liability | YouTube IFrame Player API + timestamp deep links; transcripts stored privately as analysis input only |
| A18 | **Habit-creation by free-text user input (no clip backing)** | "What if I just want to track water?" | Erodes Core Value: "Every habit shown to a user must be backed by a specific, time-stamped, deep-linked DOAC clip." A user-created untethered habit is *exactly* what every other habit tracker already does | All habits in v1 must come from the curated library or AI suggestions grounded in it |
| A19 | **Reminders by SMS / phone / Slack** | Integration buzz | Channel sprawl with vendor risk and per-message cost. Email is sufficient for v1 | Email-only (T11) |
| A20 | **In-app store / habit packs / template marketplace** | Atomic Habits / Fabulous patterns | Premature scaling of content surface; conflicts with curated-evidence model | The whole product is one curated "pack" at v1 |

**Anti-feature ROI:** Each row above is roughly 1–8 weeks of solo dev work *avoided*. Cumulatively this is the difference between shipping the v1 and not shipping at all.

---

## Feature Dependencies

```
T1 (Auth)
 ├─ T2 (Habit list)
 │   ├─ T3 (Check-in) ──> T5 (Streak) ──> D9 (Grace day)
 │   │                 ├─ T6 (Consistency view)
 │   │                 └─ T13 (History view)
 │   ├─ T4 (Habit detail) ──> D3 (Card with clip + attribution) ──> D7 (DOAC CTA)
 │   ├─ T7 (Frequency) ──> T8 (Time-of-day)
 │   └─ T9 (Edit/delete)
 ├─ T10 (Responsive)
 ├─ T11 (Email reminders)
 ├─ T14 (GDPR delete) ──> D13 (Export)
 └─ T16 (Onboarding shell) ──> T17 (Disclaimer ack)
                            └─ D1 (AI interview)
                                 ├─ requires ──> D5 (RAG)
                                 │                  └─ requires ──> D2 (Curated clip library)
                                 │                                       ├─ D8 (Curator/admin UI)
                                 │                                       ├─ D10 (Risk + evidence taxonomy)
                                 │                                       ├─ D14 (Domain taxonomy)
                                 │                                       └─ D12 (Submission template)
                                 └─ produces ──> D15 (Habit candidates with citations)

D4 (Habit swap) ──requires──> D2, D5
D6 (Public habit pages) ──requires──> D3
D11 (One-cmd dev / docker) ──enhances──> all (OSS traction lever)

A1 (Community) ──conflicts──> D6 (Public pages substitute)
A18 (Free-text habits) ──conflicts──> Core Value (every habit must have a clip)
A14 (Extraction pipeline) ──would-replace──> D2 manual curation (deferred to v0.5)
```

### Critical Path to Demo

The shortest path from zero to a Loom-able pitch demo is:
**T1 → T17 → D2 (corpus seeded) → D5 → D1 → D15 → T2 → T4 → D3 → D7 → T3 → T5/D9 → D6 → D4**

Everything else (T6, T11, T13, D8, D10, D11, D13, etc.) is necessary for the *product* but not for the *demo recording*. This is the lever for sequencing in the roadmap.

### Dependency Notes

- **D1 (AI interview) is the demo centerpiece** but depends on D2 (corpus) and D5 (RAG). Any delay to corpus curation directly delays the only "wow" moment in the demo.
- **D2 is people-time, not dev-time.** ~30 clips × ~30 min/clip curation = ~15 hours of focused editorial work. This must be scheduled in the roadmap, not assumed.
- **D6 (Public habit pages) doubles as marketing AND demo asset.** Build once, use in pitch deck screenshots, robots-allow it, sitemap it. Cheap leverage.
- **D11 (one-command dev) is what converts pitch viewers into GitHub stars.** Without it, OSS traction goal is hollow.
- **A18 (free-text habits) and Core Value conflict is non-negotiable.** Resist user requests for "just let me track anything." If the seal breaks, the differentiator collapses.

---

## MVP Definition

### Launch With (v1) — DOAC Pitch Demo + OSS Alpha

**Auth & profile**
- [x] T1 — Email magic link + Google OAuth (Supabase)
- [x] T17 — Health disclaimer acknowledgment gate before onboarding completes
- [x] T14 — Sign out + delete account (cascade)
- [x] D13 — One-click JSON data export (GDPR-ready)

**Curated corpus (the foundation)**
- [x] D2 — 30+ hand-curated DOAC clips, 4–6 domains
- [x] D8 — Admin UI for clip CRUD + curator role schema
- [x] D10 — Risk flags + evidence-strength taxonomy on every clip
- [x] D14 — Domain taxonomy (4 or 6 — decide during planning per Open Question #4)

**AI onboarding & habit suggestion**
- [x] D5 — pgvector + tsvector hybrid search over clip library
- [x] D1 — 6–10 turn adaptive LLM interview, RAG-grounded
- [x] D15 — 3–5 habit candidates with 2–3 clip citations each
- [x] T16 — Onboarding shell that frames the interview

**Daily habit loop**
- [x] T2 — Habit list (today)
- [x] T3 — One-tap tri-state check-in (done / skipped / partial)
- [x] T4 / D3 — Habit card with embedded YouTube clip + claim + speaker
- [x] D7 — "Watch on Diary of a CEO" CTA
- [x] T5 + D9 — Streak counter with grace-day mechanic
- [x] T6 — Consistency view ("18/21 last 3 weeks")
- [x] T7 + T8 — Frequency + time-of-day scheduling
- [x] T9 — Edit / delete habit
- [x] T13 — History calendar/heatmap (light version is fine)
- [x] T15 — Loading / empty / error states polished

**Differentiators that make the demo land**
- [x] D4 — Habit swap with equivalent-benefit substitution
- [x] D6 — Public, SEO-friendly habit pages at `/h/[slug]`

**Cross-device & re-engagement**
- [x] T10 — Mobile-responsive web (no PWA)
- [x] T11 — Email reminders / digest (cold-start retention insurance per Open Question #8)
- [x] T12 — Today's date / calendar context

**OSS hygiene**
- [x] D11 — `pnpm dev` one-command local dev + `docker compose up` self-host path
- [x] D12 — Clip-submission template (non-coder contributor path)
- [x] LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, MEDICAL_REVIEW.md
- [x] Astro Starlight docs site with quickstart, self-host, clip-curation guide, architecture overview
- [x] Hosted demo at a real domain

### Add After Validation (v1.x)

- [ ] **Additional podcast sources** (Huberman, Attia, ZOE, FMF) — trigger: post-DOAC outreach outcome
- [ ] **PWA shell + iOS Add-to-Home-Screen polish** — trigger: alpha feedback flags mobile pain (Decision #7's revisit condition)
- [ ] **Bring-your-own-API-key mode** — trigger: hosted-LLM cost exceeds ~$50/mo
- [ ] **Self-hostable local LLM mode (Ollama / bge-small)** — trigger: contributor-driven PR or self-hoster demand
- [ ] **Weekly digest email** — trigger: T11 daily reminders show low open rate
- [ ] **More granular evidence labels (study links, meta-analysis pointers)** — trigger: editorial-policy maturation
- [ ] **AI clip-extraction pipeline (v0.5 / Phase 2)** — trigger: hand-curation throughput becomes the bottleneck after pitch outcome

### Future Consideration (v2+)

- [ ] **Mood tracking, body-changes posts** — defer; not core to evidence-clip thesis
- [ ] **Voice onboarding** — defer; UX nice-to-have, not pitch-critical
- [ ] **Wearable integrations** — defer; per-vendor maintenance cost vs differentiator value is poor
- [ ] **Native iOS / Capacitor wrapper** — defer; only if push becomes truly critical
- [ ] **Habit packs / template marketplace** — defer; conflicts with curated-evidence model unless template-as-pack is gated
- [ ] **Multi-language / i18n** — defer; DOAC is English-first; localization is post-traction

---

## Feature Prioritization Matrix

Calibrated to the actual goal: **OSS traction + DOAC pitch readiness**. "User Value" here means *to the dual audience of (a) DOAC pitch viewer and (b) self-hosting OSS user*.

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| D1 AI interview | HIGH | HIGH | P1 | Demo centerpiece |
| D2 Curated corpus | HIGH | MEDIUM (people-time) | P1 | No corpus = no product |
| D3 Habit card with clip | HIGH | MEDIUM | P1 | The screenshot |
| D4 Habit swap | HIGH | MEDIUM | P1 | Concrete differentiator |
| D5 RAG (hybrid search) | HIGH | MEDIUM | P1 | Powers D1 + D4 |
| D6 Public habit pages | HIGH | MEDIUM | P1 | SEO + pitch narrative |
| D7 DOAC CTA | HIGH | LOW | P1 | Strategic free win |
| D9 Grace-day streak | MEDIUM | LOW | P1 | Brand differentiator, cheap |
| D11 One-cmd dev / docker | HIGH | MEDIUM | P1 | OSS traction lever |
| D15 Habits with citations | HIGH | MEDIUM | P1 | Output of D1 |
| T1 Auth | HIGH | MEDIUM | P1 | Required |
| T2–T9 Core habit CRUD/check-in | HIGH | MEDIUM | P1 | Table stakes |
| T10 Mobile-responsive | HIGH | MEDIUM | P1 | Demo on mobile = trust signal |
| T16 Onboarding shell | HIGH | MEDIUM | P1 | Frames the interview |
| T17 Disclaimer | HIGH | LOW | P1 | Legal posture |
| D8 Admin UI | MEDIUM | MEDIUM | P1 | Curator's daily tool |
| D10 Risk/evidence taxonomy | MEDIUM | LOW | P1 | Editorial trust |
| D13 GDPR export | MEDIUM | MEDIUM | P1 | Legal posture, EU pitch |
| D14 Domain taxonomy | MEDIUM | LOW | P1 | Organizing structure |
| T13 History view | MEDIUM | MEDIUM | P1 | Habit-tracker convention |
| T11 Email reminders | MEDIUM | MEDIUM | P1 | Cold-start retention insurance |
| T6 Consistency view | MEDIUM | LOW | P1 | Habit-science correctness |
| T5 Streak counter | MEDIUM | LOW | P1 | Pairs with D9 |
| T15 Loading/empty/error states | MEDIUM | LOW | P1 | Demo polish |
| D12 Submission template | MEDIUM | LOW | P2 | OSS contributor onramp |
| Multi-podcast sources | MEDIUM | MEDIUM | P2 | Post-DOAC outcome |
| PWA shell | MEDIUM | MEDIUM | P2 | If alpha flags mobile |
| Weekly digest | LOW | LOW | P2 | If T11 underperforms |
| Wearables | LOW | HIGH | P3 | Vendor cost > value |
| Voice onboarding | LOW | HIGH | P3 | UX-only differentiator |
| Mood tracking | LOW | MEDIUM | P3 | Outside thesis |
| Native mobile | LOW | HIGH | P3 | Web-first works |

**Priority key:**
- **P1**: Required for DOAC pitch demo + OSS alpha launch
- **P2**: Add after alpha validation or after pitch outcome known
- **P3**: Defer until product-market fit established

---

## Competitor Feature Analysis

| Feature | Habitica | Streaks | Loop (uHabits) | Habitify | Snipd | Noom / Fay | Examine.com | **Hdiary v1** |
|---------|----------|---------|----------------|----------|-------|------------|-------------|---------------|
| Habit CRUD | Yes | Yes | Yes | Yes | — | — | — | Yes (T2/T9) |
| Streaks | Rigid | Rigid | Rigid | Rigid | — | — | — | **Grace-day (D9)** |
| Consistency view | Weak | Yes | Yes (calendar) | Yes | — | — | — | Yes (T6) |
| Frequency scheduling | Yes | Yes | Yes | Yes | — | — | — | Yes (T7) |
| Cross-device sync | Yes | iCloud | Self-host | Yes | Yes | Yes | — | Yes (Supabase) |
| Push notifications | Yes | Yes | Yes (Android) | Yes | Yes | Yes | — | **Email-only (anti-feature for v1)** |
| Community / social | Heavy | None | None | Light | Light | Light | None | **Cut (A1)** — public pages only (D6) |
| Gamification | Heavy (RPG) | None | None | Light | None | Light | None | **None (A3)** |
| Evidence layer | None | None | None | None | User-clipped | Coach-curated | Reference-cited | **Podcast-clip-grounded (D2/D3)** ← unique |
| AI onboarding | None | None | None | None | None | Form-driven | None | **6–10 turn LLM interview (D1)** ← unique |
| Habit-swap with equivalent benefit | None | None | None | None | None | Coach-mediated | None | **Cluster-based RAG swap (D4)** ← unique |
| Public shareable habit pages | No | No | No | No | Yes (clips) | No | Yes (articles) | **Yes, SEO-first (D6)** |
| OSS / self-hostable | No | No | **Yes (Loop, Beaver)** | No | No | No | No | **Yes (D11)** |
| Wearable integrations | None | Yes | None | Yes | None | Yes | None | **None (A5)** |
| Paywall | Light | Yes | None | Yes | Yes | Heavy | Yes | **None (A6)** |
| Native mobile | Yes | Yes (iOS only) | Yes (Android) | Yes | Yes | Yes | No | **Web-only (A11)** |

**Strategic read:** Hdiary's competitive position is the *intersection* of OSS habit-trackers (Loop, Beaver) and credentialed-evidence wellness (Examine.com, Snipd). No competitor occupies the union. The interview + clip-grounded swap are defensible because the corpus is the moat, and the corpus is curated, not scraped.

---

## Risks Specific to This Feature Mix

1. **Cold-start retention without push notifications.** PROJECT.md Open Question #8. T11 (email) is the v1 mitigation; if open rates are weak in alpha, escalate PWA push to P1 for v1.x.
2. **Hand-curation throughput becomes the bottleneck.** D2 is people-time, not dev-time. If curating 30 clips slips past 2 weeks, the launch slips. Bake explicit curation hours into the roadmap (Open Question #2).
3. **Free-text habit creation pressure.** Users will request A18. Saying no requires a clear in-product message: "Hdiary only shows habits backed by evidence — request a new domain instead."
4. **Demo brittleness.** A Loom demo is one bad frame from being unsellable. T15 (loading/empty/error states) is P1, not P2.
5. **GDPR + COPPA gates create onboarding friction.** T17 + DOB gate add steps before the user reaches the wow-moment (D1). Consider deferring DOB collection until after the interview if legally permissible — UX testing required.

---

## Sources

- **PROJECT.md** (`.planning/PROJECT.md`) — definitive scope, decisions, cuts, and constraints
- **Habit-tracker competitor anchors** named in the prompt: Habitica, Streaks, Way of Life, Fabulous, Habitify, Loop (uHabits), TickTick — feature sets are well-known from public app stores and GitHub repos
- **Evidence-backed health apps** named in the prompt: Noom, Fay Nutrition, Wellory, Examine.com, FoundMyFitness — feature sets from public marketing surfaces and reviews
- **Podcast-clip products** named in the prompt: Snipd, Recast, Airr — public app behavior
- **OSS habit-tracker analogs** named in the prompt: BeaverHabits, Habo, MyDailies, OpenHabitTracker — confirm self-host audience and feature baselines
- Habit-formation literature priors (cue-routine-reward; flexibility outperforms rigid streaks) — consistent with PROJECT.md Decision #6 rationale

**Confidence note:** HIGH on categorization and dependencies because they derive from explicit PROJECT.md decisions. MEDIUM on specific complexity estimates (S/M/L) because they are solo-dev rough estimates without spike validation — refine during planning. Competitor feature parity assertions (the matrix above) are based on well-known public product behavior; spot-verify any specific claim before quoting in pitch material.

---
*Feature research for: evidence-backed health habit tracker with podcast-clip grounding, OSS-forward, DOAC pitch-ready*
*Researched: 2026-05-07*
