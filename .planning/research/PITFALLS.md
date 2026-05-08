# Pitfalls Research

**Domain:** Open-source, evidence-backed health habit tracker grounded in podcast clips (DOAC-only at MVP). Solo dev, web-first, OSS-traction + DOAC-pitch oriented.
**Researched:** 2026-05-07
**Confidence:** HIGH for legal/OSS/habit-app categories (verified via official docs, ICO, EHDS, opensource.guide, peer-reviewed habit-formation literature). MEDIUM for DOAC-specific pitch dynamics (extrapolated from comparable media-IP deals; no direct DOAC deal-memo source). MEDIUM for podcast-clip product traps (Snipd public reporting only). HIGH for Huberman-class reputational fallout (multiple primary sources).

---

## Critical Pitfalls

### Pitfall 1: Treating "deep-link only, never re-host" as a complete legal defense

**What goes wrong:**
The team writes "we never re-host audio/video, we only deep-link to YouTube" in the README and considers copyright posture solved. Then: (a) transcripts stored privately for analysis are themselves derivative works that can trigger DMCA, (b) the *claim card* (claim text + speaker attribution + clip context) is a curated editorial work that can be argued as a derivative summary, (c) YouTube's Developer Policies actually prohibit modifying or blocking standard player UI — including hiding "related videos," disabling pause overlays, or stripping metadata — and a "90-second clip-only" experience that auto-stops can be read as exactly that, (d) the API requires a valid HTTP Referer header or playback breaks; misconfigured CSP/sandbox iframes silently fail in self-host deployments.

**Why it happens:**
Solo devs equate "no re-hosting" with "no copyright exposure." The fair-use posture is more nuanced: transcripts are reproductions, claim summaries are editorial derivatives, and the YouTube embed contract has its own ToS layer separate from copyright. Most blog posts about "embedding YouTube is fine" don't address apps that programmatically clamp playback to a clip window.

**How to avoid:**
- Treat three separate legal layers explicitly: (1) **Copyright/fair-use** for transcripts and claim summaries (short, transformative, attributed, non-substitutive), (2) **YouTube API ToS** for embed behavior — never disable related videos, never block player chrome, never strip metadata, never auto-pause in a way that prevents the user from continuing to watch on YouTube, (3) **Speaker/personality rights** (right of publicity in California, image rights in EU) — attribute the speaker, never imply endorsement.
- Add `start=` and `end=` IFrame params but allow the user to override and watch the full episode. Display a persistent "Watch full episode on YouTube" affordance — this is also a YouTube ToS requirement for keeping the standard player function intact.
- Document the HTTP Referer requirement in the self-host guide; a Referrer-Policy of `no-referrer` will silently break embeds for self-hosters.
- Keep transcripts private (not served to end users), short, and treated as analysis input only. If/when the AI extraction pipeline lands, never expose full-episode transcripts as a feature — that crosses cleanly into derivative-work territory.
- Publish a one-page **Editorial & Attribution Policy** in the docs site naming exactly what is stored, what is shown, and what is never shown.

**Warning signs:**
- README says "we just embed YouTube" with no discussion of transcripts or claim text.
- Embed UI hides the YouTube logo, "Watch on YouTube" link, or related-videos screen at the end of clips.
- A self-hoster reports "videos won't play" — almost always a Referer-Policy or CSP issue.
- A clip card includes a 200-word verbatim transcript excerpt instead of a paraphrased claim.

**Phase to address:** Phase 1 (foundation), before any public clip is rendered. The legal posture is cheaper to design in than to retrofit.

**Severity:** HIGH

---

### Pitfall 2: Misclassifying the app under GDPR as "wellness data, not health data"

**What goes wrong:**
The team builds GDPR support for "personal data" (email, profile, timezone) and assumes habit data is wellness-tier with regular consent. Under Article 9 of the (UK and EU) GDPR, data that *reveals health status* — including data that is processed *to make health-related recommendations* — is **special category data**, requiring **explicit** consent (a higher bar than "I accept the ToS"), separate processing records, a documented Article 9 lawful basis, and likely a DPIA. The moment habit check-in data feeds an AI that recommends a sleep or supplement habit, or the moment the onboarding interview asks "do you have anxiety / IBS / sleep apnea," the app is processing special category data even if it is never called "health data" internally.

**Why it happens:**
US founder mental model treats wellness apps as HIPAA-irrelevant and therefore globally light-touch. EU/UK regulators do not draw the wellness/health line by app marketing copy — they draw it by the *nature of the inference* the system performs. A habit recommender grounded in clips about gut health, anxiety, longevity, sleep quality, and exercise is unambiguously inferring health status.

**How to avoid:**
- Treat the app as processing special category data from day one. Implement **explicit, granular, separable consent** for: (a) account creation, (b) processing of health-adjacent inputs for recommendations, (c) any AI/LLM analysis of free-text answers, (d) any future telemetry.
- Consent strings must name the categories ("data revealing your physical or mental health") and the purposes specifically. "I accept the privacy policy" is not Article 9 explicit consent.
- Article 30 records of processing, a published DPA, a DPIA template (even as a solo dev — keep a one-page DPIA), and a named data-protection contact (can be the maintainer).
- One-click data export (already in scope) and erasure (already in scope) — verify cascade across pgvector embeddings of user inputs, not just rows.
- COPPA-tier age gate (≥13) plus EU-state-aware gate where some member states require ≥16 for digital consent without parental authorization. Default to 16 for EU IPs unless you implement per-country gating.
- For UK users: separate UK GDPR notice (post-Brexit divergence is small but ICO expects a UK-specific contact path).
- Keep the DPA short, plain-language, and version-controlled in the repo. OSS users self-hosting need to know what *they* inherit when they run their own instance.

**Warning signs:**
- Privacy policy uses one consent checkbox covering all processing.
- Onboarding interview free-text is sent verbatim to a third-party LLM with no separate consent toggle.
- "Wellness data" appears anywhere in the privacy copy as a way to dodge Article 9.
- pgvector embeddings of user free-text are not deleted on account erasure (forgotten cascade).

**Phase to address:** Phase 1 (foundation) — schema, auth, consent UX must land before the onboarding interview is built.

**Severity:** HIGH

---

### Pitfall 3: Disclaimer theater — "not medical advice" as a shield that does not actually shield

**What goes wrong:**
The team adds a modal disclaimer ("This is not medical advice"), considers liability handled, then ships content saying "increase magnesium glycinate to 400mg before bed" sourced from a podcast clip. A disclaimer does not convert specific dosing, contraindication-laden, or condition-targeting advice into general information — courts and regulators look at the *substance* of what was communicated, not the boilerplate. UK ASA, FTC (US), and EU MDR all have separate triggers; the MDR specifically can pull the app into the medical-device regime if it "provides specific information for medical purposes" about a "specific patient."

**Why it happens:**
Disclaimers feel legible and finishable. The harder work — editorial scope rules that *exclude* dosing, demographic-specific advice, and contraindication-bearing claims — is invisible curation discipline that is easy to relax over time as the corpus grows.

**How to avoid:**
- Codify an **Editorial Policy** as a versioned doc (`MEDICAL_REVIEW.md` is already in scope — make it teeth-bearing, not boilerplate).
- Hard-exclude from the corpus: prescription drugs, specific dosing of any compound, advice for diagnosed conditions (depression, IBS, T2D, hypertension, ADHD), pregnancy/lactation-specific advice, pediatric advice, tapering off psychiatric medication, fasting protocols for diabetics, claims about cancer.
- Risk-flag system in the schema (already in scope) — make the flags **mandatory at clip approval time**, not optional. A clip cannot be approved without a populated risk-flag set.
- Demographic-aware filtering: the onboarding asks pregnancy status, prescription medications (categories, not specifics), and known conditions. Habit candidates are filtered before display, not just disclaimered.
- "Talk to your doctor before changing X" copy on every clip touching supplements or anything ingested.
- Liability-insurance trigger awareness: once the app crosses ~10k MAU or accepts donations through a legal entity, get a quote for tech E&O insurance with media-liability rider. Don't incorporate before this is priced.
- Never auto-generate or AI-extract claims into the live corpus without human approval — this becomes a hallucination-as-medical-advice risk vector when Phase 2 lands.

**Warning signs:**
- Any clip card displays a number with units ("400mg," "16 hours," "30 grams").
- The corpus contains advice about a named condition or diagnosis.
- Onboarding does not ask about pregnancy or prescription-medication categories.
- Risk flags exist in the schema but most clips have empty flag arrays.
- An admin feels comfortable approving a clip in under 30 seconds.

**Phase to address:** Phase 1 (editorial scope) for exclusion rules; Phase 2 (curation tooling) for mandatory risk-flag enforcement; Phase 3+ (AI extraction) for human-in-the-loop guardrails.

**Severity:** HIGH

---

### Pitfall 4: Anchoring the brand to a single podcaster who later detonates

**What goes wrong:**
DOAC-only at MVP is a deliberate, sound focusing decision — but Steven Bartlett, like every solo-host media business, carries personality risk. The Huberman case (March 2024 NYMag exposé on personal conduct, ongoing scientific-credibility critique from Slate, Rolling Stone, and the Office for Science and Society regarding cannabis claims and supplement-sponsor conflicts) is the cautionary template: an app that had spent two years anchoring its credibility to "Huberman says" would have shipped 2024 with a credibility crater. DOAC has had its own episodes drawing similar scrutiny (high-profile guests with debunked claims, supplement-sponsor friction). The single-podcast bet is also a **single point of reputational failure**.

**Why it happens:**
The pitch logic ("DOAC-only maximizes leverage with DOAC") is correct strategically but creates a structural dependency: if DOAC is in the news for the wrong reasons during pitch month, the app is publicly pitched to a damaged brand.

**How to avoid:**
- Treat DOAC as the *seed* corpus, not the *brand*. The product brand is "evidence-backed habits with credentialed sources." DOAC is the launch curation focus, never the marketing identity.
- Architect the corpus schema to be **podcast-agnostic from day one** — `podcast_id` as a foreign key, not `doac_episode_id` as a column. Already implied by current schema; verify no DOAC-specific UX strings ("From DOAC") get baked into shared components.
- Curate to the **guest credential and the underlying citation**, not the host. The claim cited should reference the named credentialed expert (e.g., "Dr. X says…") not "DOAC says…" so a guest-level controversy doesn't poison the brand and a host-level controversy doesn't poison the science layer.
- Maintain a private "expansion bench" of 5–10 vetted alternative credentialed shows (Attia, FoundMyFitness, ZOE, Sigma Nutrition, etc.) — not in the app, but research-ready so a 2-week pivot is feasible if needed.
- Editorial review captures controversy state per speaker (a `speaker_status` field; values like `cleared`, `under_review`, `withdrawn`). When a credible critique drops, withdraw fast.

**Warning signs:**
- The product name, logo, or marketing site uses DOAC visual identity beyond attribution.
- A copy edit takes more than one PR because "DOAC" is hardcoded in N components.
- A clip is approved on host reputation alone with no underlying study or guest-credential link.
- Internal review of new Bartlett episodes is not happening at all.

**Phase to address:** Phase 1 (schema and brand language). Phase 2 (editorial workflow for speaker_status).

**Severity:** HIGH

---

### Pitfall 5: Building streak mechanics that punish missed days and accelerate abandonment

**What goes wrong:**
"Streak counter with grace day" sounds protective, but the failure mode is well documented: streak loss aversion (Kahneman & Tversky's Prospect Theory: losing feels ~2x as bad as gaining feels good) is what creates engagement *and* what creates the anxiety/guilt/abandonment cycle. Recent industry data: users receiving >2 streak-related notifications per week are 41% more likely to abandon within 18 days; 25–30% Day-1 retention is the category benchmark, falling further fast. A "grace day" implemented as "you used your free miss, now don't miss again" still reads as punishment to the user's nervous system.

**Why it happens:**
Habit-app PMs ship Duolingo-clone streaks because they demonstrably move short-term engagement metrics. The downstream cost — guilt-driven uninstalls, especially in a *health* context where users already feel inadequate — is invisible to the team because it manifests as silent churn.

**How to avoid:**
- Lead the surface with **consistency view ("18/21 last 3 weeks")**, demote the streak counter, or A/B remove streaks entirely from the v1 dashboard.
- "Streak freeze" framing instead of "grace day" — language matters. Loss-frame ("you lost a day") drives churn; gain-frame ("you have 1 freeze available this week") reduces it. Research on freezes specifically shows engagement *increases* when they exist.
- Never push more than one habit-related notification per day, never two streak-related notifications per week. This single rule is one of the highest-leverage retention interventions per the 2025 data.
- No red, no flame, no broken-icon shame UI for missed days. A neutral dot pattern (not a red X) for a missed day. The user knows they missed; the app doesn't need to twist the knife.
- Build a **weekly compassionate digest** ("Here's your week — 5 of 7, here's a clip about why partial weeks still matter") instead of streak-loss alerts. This is your re-engagement loop *and* it ships content, which is the differentiator.
- Cap the streak's visual weight: streaks ≥ 30 days hide from the daily view (you do not want a 90-day streak holder to feel one bad week is catastrophic).

**Warning signs:**
- The dashboard shows a streak counter as the largest number on the page.
- Push notifications include "Don't lose your streak!"
- Missed days are styled red.
- There is no "I was sick" / "I was traveling" affordance.
- No re-engagement path exists for users who broke a 14-day streak — they just churn.

**Phase to address:** Phase 2 (habit cards + check-in UX). Decide the rule before any pixel is shipped.

**Severity:** HIGH

---

### Pitfall 6: Picking the license late, picking it wrong, or picking it without a CLA decision

**What goes wrong:**
License is treated as a "before-public-launch" item (currently flagged as such — good), but the second-order decisions are missed: (a) **MIT attracts drive-by, low-quality PRs** because the contributor has no skin in the game; the maintainer eats triage cost. (b) **AGPL repels both contributors and the DOAC pitch** — DOAC's lawyers will hard-no AGPL because of network-use copyleft implications for any internal tooling they build on top. (c) Without a **CLA or DCO decision**, any future relicense (e.g., MIT → Apache for a corporate partner) requires unanimous contributor consent, which is impossible at scale. (d) Choosing Apache-2.0 without understanding the patent-grant clause means you've made a real legal commitment without realizing it.

**Why it happens:**
Solo devs treat licensing as a single dropdown. The actual decision is a 3-tuple: (license, contribution agreement, relicense reservation).

**How to avoid:**
- **Pick MIT** for this project. Rationale: (1) DOAC pitch friendliness (zero copyleft concern for any DOAC engineer), (2) maximum self-host adoption (the OSS-traction goal), (3) Apache-2.0's patent grant is overkill for a non-patentable habit tracker and adds NOTICE-file maintenance burden, (4) AGPL is disqualifying for the pitch. The MIT drive-by-PR cost is real but manageable with contribution templates and labeling discipline.
- **Adopt DCO (Developer Certificate of Origin) over a CLA.** DCO is a `Signed-off-by` line in commits; CLA is a legal document each contributor signs. DCO is the Linux/GitHub-norm path; CLA scares off casual contributors and signals corporate intent (bad for OSS-traction goal). DCO is enforced by a single GitHub Action.
- **Reserve relicense rights via a `NOTICE` and a clear `CONTRIBUTING.md` clause**: contributions are licensed inbound under the project's license (MIT) and the maintainer reserves the right to relicense future versions. Include this language explicitly so a future Apache or dual-license move is feasible without 200 individual approvals.
- Decision deadline: **before the first public push, before star #1.** Once external contributors land under MIT-with-no-relicense-clause, you are stuck.
- Do not dual-license. Dual-licensing this category is overhead theater.

**Warning signs:**
- The repo is public with no LICENSE file (instant legal ambiguity — defaults to all-rights-reserved).
- `CONTRIBUTING.md` is silent on contribution licensing.
- A merged PR has no DCO signoff.
- Maintainer is considering AGPL "to prevent commercial forks" — this kills both the pitch and adoption.

**Phase to address:** Phase 1 (repo setup), with a final decision before the first public commit.

**Severity:** HIGH

---

### Pitfall 7: Solo-maintainer triage death spiral

**What goes wrong:**
Project gets traction. Stars rise. Issues open faster than they close. The "good first issue" label attracts well-meaning beginners whose PRs need more review effort than writing the code yourself. Documentation requests pile up. Security backports accumulate. Per 2025 State of Open Source data: **60% of OSS maintainers work unpaid; 44% cite burnout as the reason they quit**; **issue triage and documentation maintenance are the top two burnout drivers**. Recent collapses include Kubernetes Ingress NGINX (no security patches after March 2026 due to maintainer burnout) and the Asahi Linux project lead departure citing demanding users.

**Why it happens:**
Reactive triage is unbounded; building is bounded. The maintainer optimizes the visible queue at the cost of the underlying product. "Open source becomes a job you didn't apply for" — the dosu.dev / Open Source Pledge framing.

**How to avoid:**
- **Triage budget, not a triage backlog.** One fixed slot per week (e.g., Friday 2hrs) for issues + PRs. Issues older than 30 days with no maintainer interaction get auto-closed with a "Stale — please re-open if still relevant" bot message. Be ruthless from week 1, before the inbox is the problem.
- **Strict issue templates** that require: reproduction steps, version, environment, what was tried. Template-violating issues get an auto-comment and auto-close after 7 days. This filters 60% of low-quality issues with zero maintainer attention.
- **No "good first issue" label until you have 3 clearly scoped, fully described, fully solved-in-your-head tasks that you do not want to do yourself.** The label is a magnet; if it points at vague work, you import beginner triage cost without getting any work back.
- **Curated contributor surface.** The clip-submission template (already in scope) is the highest-leverage non-code contribution path — health-podcast listeners can submit clips without touching code, which both fills the corpus and creates a community that doesn't generate review load.
- **Public maintainer-bandwidth statement** in `MAINTAINERS.md` or pinned issue: "I review PRs once per week. Expect 5–10 day response. I will close stale issues. This is not a job." Setting the expectation up front converts "unresponsive maintainer" complaints into "respected boundaries."
- **Automation up front:** Renovate/Dependabot, auto-labeler bot, stale-bot, DCO bot, CI green required for merge, conventional-commits bot. All configured in week 1, not week 30.
- **The "donate" link goes to Open Collective from day one** — not because it'll fund anything at first, but because the path exists when you need it (Plausible / Standard Notes pattern is in scope already; encode it from day one, do not bolt on at month 18).
- **Refuse the maintainer-as-support-engineer trap.** If a self-hoster cannot deploy without 3 hours of your time, the deployment story is broken — fix the docs, not the deploy.

**Warning signs:**
- Issue inbox > 30 open issues with no labels.
- A PR has been open for 14+ days with no maintainer comment.
- "Good first issue" label is on >5 issues, none of which you've personally scoped.
- You are answering deployment questions in DMs instead of in docs.
- You feel guilty about not responding to issues on weekends.

**Phase to address:** Phase 1 (automation and templates land *before* the repo is public). Re-evaluate at every milestone.

**Severity:** HIGH

---

### Pitfall 8: The DOAC pitch dies of being "interesting but not strategic"

**What goes wrong:**
Pitch is well-executed. Loom is polished. Demo loads. DOAC team says "love it, let us think about it," then ghosts. Common reasons media businesses pass on third-party-built companion products: (a) **IP optionality concern** — they don't want to endorse anything that constrains their own future product moves, (b) **brand-control concern** — they cannot control editorial decisions in a third-party app that uses their attribution, (c) **endorsement liability** — a public co-sign creates implied warranty for the recommendations the app makes, including health recommendations, (d) **deal-shape mismatch** — there's no obvious commercial structure that fits a free OSS project (no licensing fee, no equity, no clear comp), (e) **bandwidth** — partnerships team is busy with revenue-positive deals.

**Why it happens:**
Solo devs pitch the *technology* and the *user experience*. Media businesses evaluate on *strategic fit* and *downside risk*. A free OSS project's downside is asymmetric for them: limited upside (their show is already at scale), unbounded brand risk if a user gets bad health advice citing a DOAC clip.

**How to avoid:**
- **Pre-empt every concern in the pitch deck.** One slide each: (1) IP optionality — "We are MIT-licensed, no exclusivity, no claim on your IP, you can build anything you want and we cannot block it," (2) Brand control — "We will remove any clip you ask us to within 48 hours, in writing, no questions, this is in our DMCA SLA," (3) Endorsement structure — "We are not asking for endorsement. We are asking for a quote, an episode mention, or silence-with-permission to keep using clips. Endorsement is your call later," (4) Deal shape — "There is no money to exchange. We drive listeners to your show. The only ask is permission to keep doing it."
- **Pitch the lowest-friction yes first.** Ask for *non-objection*, not endorsement. "Is it OK if we keep using DOAC clips with attribution and 48hr takedown?" is easy to say yes to. "Will you co-sign this app's health recommendations?" is impossible to say yes to.
- **Have a "no" plan that does not require a pivot.** If DOAC says no, the path is: expand corpus to 2–3 credentialed shows with quieter permissions, drop DOAC-specific framing, keep going. The product must work without the DOAC co-sign, or the whole 12-month bet is on a single yes/no from people you cannot control.
- **Outreach timing matters:** the recommendation in PROJECT.md (soft outreach week 6, formal week 12+) is correct. Add: do not send the pitch on a week the show is in the news for any reason, positive or negative — partnerships teams defer in either case.
- **Bring metrics, not promises.** Stars, self-host installs, weekly active users, top-3 most-watched clips by users (this is a real data gift to DOAC: "your audience is most engaged with these specific moments"). No metrics = polite-no.
- **Anticipate the lawyer.** The partnerships person says yes; the lawyer says "we need a written agreement that limits liability." Have a one-page MoU template ready: scope, attribution, takedown, no-warranty, term-and-termination, no-payment. If the legal back-and-forth requires a full contract negotiation, the deal dies of friction.

**Warning signs:**
- Pitch deck spends >2 slides on the technology and 0 slides on legal/brand-risk reassurance.
- The ask is "endorsement" rather than "non-objection."
- The product hard-depends on a yes (no plan B corpus).
- Outreach went to a generic press@ address instead of a named partnerships person.
- No data in the pitch.

**Phase to address:** Phase 3+ (post-alpha), but pitch artifact and MoU template should be drafted by end of Phase 2 so the runway to outreach is not blocked.

**Severity:** HIGH (because the goal explicitly includes the DOAC interaction)

---

### Pitfall 9: Premature monorepo and premature Python worker

**What goes wrong:**
Day-1 monorepo with `apps/web`, `apps/admin`, `apps/worker` (stub), `packages/db`, `packages/ui` — looks professional, in practice creates: (a) double the CI complexity from week 1, (b) a stub worker app that bit-rots and breaks `pnpm dev` every few weeks, (c) Turborepo cache misconfiguration that makes local dev *slower* than a single Next.js project, (d) the `apps/admin` separation creates auth-cookie cross-domain pain that didn't need to exist if admin were `/admin` routes in `apps/web`. The Python worker, deferred to v0.5 but stubbed in the monorepo, becomes a phantom limb — referenced in docs, broken in CI, no one runs it locally.

**Why it happens:**
Monorepos look like best-practice in 2026 because Turbo/Nx/pnpm have great DX *at scale*. At solo-dev MVP scale, the overhead is uncompensated. Architectural prematurity is the most common solo-dev failure mode after burnout.

**How to avoid:**
- **Single Next.js 15 app at MVP.** Admin lives at `/admin/*` with role-gated middleware. Migrate to a separate app *only* when admin gains 3+ contributors who shouldn't see user code or 5+ admin-only dependencies.
- **Drizzle schema in a `packages/db` package only if you actually need to share it across apps.** At single-app scale, put it in `src/db/`. Refactor to package when the second app actually exists.
- **Do not stub the Python worker in the monorepo.** Keep it in a separate repo or `worker/` directory in the same repo, but do not wire it into `pnpm dev` or CI until v0.5 starts. A stub that does not run is a maintenance tax with zero user value.
- **`docker compose up` self-host story has to actually work end-to-end on day 1 of public launch.** The most common OSS-pretender pattern is "we have a docker-compose.yml in the repo" that hasn't been tested in 6 months. A dedicated CI job that boots the stack from a clean image, runs a smoke test against the running web UI, and tears down — non-negotiable from week 1.
- **Dev/prod parity:** Supabase local emulation (`supabase start`) is the dev path; production is hosted Supabase. The pgvector extension, RLS policies, and pg_cron jobs all behave subtly differently in local vs hosted. Run a weekly CI smoke against a real (free-tier) hosted Supabase to catch drift.
- **Secrets management for OSS:** never commit `.env`, ship `.env.example` with safe placeholders, use `dotenv` only in dev. For self-hosters, document the env-var contract in `SELF_HOSTING.md`. For maintainer's hosted demo, secrets in Vercel/Hetzner only. A pre-commit hook (`gitleaks` or similar) on every `git commit` — not optional.

**Warning signs:**
- The monorepo has 4 apps and the maintainer is the only person who has run all 4 in the last 30 days.
- `pnpm dev` takes >15 seconds to start.
- The self-host docker-compose has not been smoke-tested in CI.
- A self-hoster opens an issue saying "step 4 doesn't work" — it usually means the deploy story drifted.
- A `.env` file appears in git history.

**Phase to address:** Phase 1 (architecture decisions). Single-app default; refactor when forced, not when fashionable.

**Severity:** HIGH

---

## Moderate Pitfalls

### Pitfall 10: Source video taken down → orphaned clips

**What goes wrong:**
DOAC removes an episode (re-edit, sponsorship dispute, guest controversy, takedown). Every clip in the app pointing at that video shows YouTube's "video unavailable" iframe. Users lose faith in the corpus integrity.

**Why it happens:**
The deep-link permanence assumption — "YouTube IDs are forever" — is wrong. Privated, deleted, region-blocked, and age-restricted are all possible.

**How to avoid:**
- **Daily availability check job** (pg_cron or Inngest): for each clip, fetch `https://www.youtube.com/oembed?url=...` and mark `unavailable` if 404/401. Hide unavailable clips from the user-facing surface; flag in admin for re-curation.
- **Transcript snapshot at curation time.** Stored privately, not user-facing, but available to the curator to re-locate the claim in a different episode/source if the original disappears.
- **Source diversity within domain clusters.** Do not have 6 clips on "magnesium and sleep" all from the same DOAC episode — single takedown craters the domain.
- **Public habit page graceful fallback.** If the clip is gone, render claim + speaker + "evidence currently unavailable, see related clips below" instead of a broken iframe. Bad iframe is worse than no iframe.

**Severity:** MEDIUM
**Phase:** Phase 2 (curation tooling).

---

### Pitfall 11: Sponsor-read contamination and quote-mining

**What goes wrong:**
DOAC episodes contain sponsor reads (often supplement brands), product mentions, and host editorializing alongside guest expertise. A clip that captures "Dr. X says magnesium glycinate at bedtime" might also overlap with a sponsor read for a specific magnesium brand, contaminating the evidence layer with implicit advertising. Conversely, a 90-second clip can quote-mine a guest out of the qualifying context they offered 30 seconds earlier.

**Why it happens:**
Curation under time pressure reaches for the punchy claim. Sponsor reads are often delivered in the same voice as content. Context windows are tight in 90 seconds.

**How to avoid:**
- Curation rule: **clip start must be ≥30 seconds after any sponsor read in the episode.** Maintain a sponsor-read-timestamp index per episode (manual at MVP, AI-detectable later).
- Curation rule: **the clip must include the qualifier** ("for most adults," "if you don't have kidney issues," "this isn't a substitute for…"). If the qualifier is at 12:34 and the claim is at 12:50, the clip must start at 12:30 not 12:48.
- Curator-facing prompt at clip approval: "Does this clip include any caveat the speaker offered? If no caveat is in the 90s window, is the claim still safe in isolation?" Forces the question.

**Severity:** MEDIUM
**Phase:** Phase 2 (curation editorial process).

---

### Pitfall 12: AI hallucination in the onboarding interview / swap recommendations

**What goes wrong:**
The LLM-driven onboarding interview generates a habit recommendation citing a DOAC clip — but the LLM hallucinated the citation. Or the swap recommendation cites a clip that exists but does not actually support the claim being made. Once a user shares a screenshot of a fabricated citation on social media, the project's evidence-backed positioning is dead.

**Why it happens:**
RAG pipelines fail quietly. The retrieval brings back the closest-cosine clip, the LLM is asked to recommend a habit grounded in those clips, and if the prompt isn't tight, the LLM can invent supporting language not in the clip transcript.

**How to avoid:**
- **Strict citation grounding in the prompt:** "Cite ONLY clip IDs from the provided context. If no clip in the context supports the recommendation, say so. Do NOT invent clip titles or speaker names."
- **Post-generation validation:** every clip ID returned by the LLM is re-fetched from the database before display. Hallucinated IDs are filtered out and the recommendation is regenerated or omitted.
- **Conservative habit candidate count:** if the LLM returns 5 habits but only 3 have validated citations, show 3, not 5. Never pad.
- **Eval set:** 20 hand-graded onboarding transcripts checked weekly for citation accuracy. Regression here is a launch-blocking bug.
- **User-visible "report this citation" button** on every habit card. Closes the loop on hallucinations the maintainer didn't catch.

**Severity:** MEDIUM (HIGH if it happens publicly with a journalist watching)
**Phase:** Phase 3 (onboarding interview implementation).

---

### Pitfall 13: Cold-start retention without notifications and without community

**What goes wrong:**
Web-first means weak iOS push (already noted in PROJECT.md as a known constraint). Community is cut. The re-engagement loop is unsolved. Users sign up, complete onboarding, return once or twice, then forget the bookmark.

**Why it happens:**
The two strongest re-engagement levers in habit apps (push + social) are both off the table at MVP.

**How to avoid:**
- **Email digest as the primary re-engagement loop.** Weekly compassionate digest (Sunday morning) — "your week, one new clip you might like, one habit suggestion." Not punitive.
- **Calendar invite per habit** (`.ics` download / Google Cal integration). User adds the habit to their calendar; the calendar app handles the reminder. Brilliant low-cost workaround for the no-push problem and a genuine differentiator.
- **Browser push via Web Push API** for users who allow it. Permission rates on health apps are typically 15–30% — not zero, worth having.
- **PWA "add to home screen" prompt** on iOS even without full PWA shell — the icon on the home screen is itself a re-engagement surface.
- **Public habit page + share-to-social affordance** as a side-door re-engagement mechanism: if users share their habit page, they revisit to see "their" page.

**Severity:** MEDIUM
**Phase:** Phase 2 (habit cards), Phase 3 (digest).

---

### Pitfall 14: "Evidence-backed feel" without behavior change

**What goes wrong:**
Users feel smarter and more informed after onboarding, watch the clips, agree with the science, and… don't change behavior. The gap between epistemic engagement (I learned something) and behavioral engagement (I did something) is the central failure of every "self-improvement content" product. The Snipd-class apps demonstrably help users *understand* podcasts but do not change what those users do.

**Why it happens:**
Watching a 90-second clip about why sleep matters is satisfying enough to extinguish the prompt to actually change sleep behavior. Insight is a substitute for action, not a precursor.

**How to avoid:**
- **The check-in must be the daily atom.** The clip is the *why*; the check-in is the *what*. Surface the check-in first; the clip is one tap deeper.
- **Habit difficulty calibration in onboarding.** Every habit candidate has a "tiny version" — "drink 1 glass of water in the morning" not "drink 3 liters of water daily." User picks the tiny version first. Tiny habits research (BJ Fogg) is unambiguous on this.
- **Implementation intentions in habit setup.** "When [trigger] happens, I will [habit]." Not optional. Schema supports a `trigger` field.
- **Behavior-change measurement separate from engagement measurement.** Track "did the user check in 4+ days/week for 3+ weeks" as the success metric, not "DAU."
- **Don't ship streak gamification as a substitute for behavior change.** If the only thing that brings the user back is streak anxiety, the product isn't working.

**Severity:** MEDIUM (it determines whether the product is actually useful, not just demoable)
**Phase:** Phase 2 (habit setup UX), Phase 3 (success metrics dashboard).

---

### Pitfall 15: AI coach feels flat / generic / robotic

**What goes wrong:**
The onboarding interview LLM produces text that sounds like every other ChatGPT app in 2026: "Great question! Here are some habits that might help you with sleep!" Users perceive this as low-effort, recognize it as LLM output, and lose trust in the personalization.

**Why it happens:**
Default LLM prose is sycophantic, hedged, and tonally generic. Without strong system-prompt voice work, every health app sounds like every other health app.

**How to avoid:**
- **Distinct, opinionated voice spec** in the system prompt. Direct, slightly dry, no "Great question!", no "I'm just an AI," no over-hedging. Tone modeled on a no-nonsense GP, not a wellness influencer.
- **Reference-shows in the prompt:** "Tone is closer to Tim Ferriss interviewing a guest than a wellness chatbot."
- **No emoji in coach output** unless user opts in.
- **Length discipline:** coach responses ≤ 3 sentences in interview turns. The clip carries the depth, not the chatbot.
- **Voice consistency across surfaces:** coach, swap suggestion, weekly digest all share the same voice spec, version-controlled.
- **A/B test the coach voice** with 5–10 alpha users before launch. "Does this feel like a person or a generic AI?" is the only question that matters.

**Severity:** MEDIUM
**Phase:** Phase 3 (onboarding interview).

---

## Minor Pitfalls

### Pitfall 16: Renaming "Hdiary" too late

**What goes wrong:**
Public launch happens under the placeholder name. Three months later a rename costs domain SEO, GitHub redirects, package-name fragmentation, social handles, and a confusing changelog.

**How to avoid:** Rename before the first public push. PROJECT.md already flags this; respect the flag. Hard-block public launch on rename.

**Severity:** LOW (but rises to MEDIUM after public launch)
**Phase:** Phase 1 / pre-launch.

---

### Pitfall 17: Domain over-coverage (6 domains where 4 would do)

**What goes wrong:**
30 clips × 6 domains = 5 clips/domain, which is too thin to feel curated in any domain. PROJECT.md already flags consolidation; the failure mode is *not* consolidating because "we said 6 in the doc."

**How to avoid:** Consolidate to 4 (sleep, nutrition + gut, exercise + longevity, mental health) during Phase 1 scoping. 30 clips × 4 = 7–8 clips/domain feels like a curated body of work.

**Severity:** LOW
**Phase:** Phase 1 (scope).

---

### Pitfall 18: Public-habit-page SEO without canonical/attribution discipline

**What goes wrong:**
Public habit pages are SEO-optimized. Google indexes them. They start ranking for queries like "magnesium glycinate sleep dose" — and now the project is the apparent SEO authority for health queries it has no business being authoritative on.

**How to avoid:**
- `noindex` on any public habit page touching dosing, supplements, or specific conditions.
- Canonical link points back to the YouTube source for clip-driven pages. Do not compete with the source for SERP position.
- `rel="nofollow"` on internal links from clip cards to claim text — discourage Google from treating the claim text as the authority.
- robots.txt allows crawl of marketing pages; restricts crawl on `/h/*` slugs until the editorial policy is mature.

**Severity:** LOW (until traffic arrives, then MEDIUM)
**Phase:** Phase 3 (SEO posture).

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1 — Foundation (auth, schema, repo) | License + CLA picked late; GDPR Article 9 not designed in; monorepo over-engineered | License + DCO before first public commit; explicit-consent UX in auth flow; single-app architecture |
| Phase 1 — Foundation | YouTube ToS posture treated as "embed = fine"; Referer-Policy breaks self-host | Document 3-layer legal posture; explicit Referer guidance in self-host docs |
| Phase 2 — Curation tooling + habit cards | Risk-flag system optional; streak punishment UX; sponsor-read contamination; orphaned-clip handling | Mandatory risk flags on approve; consistency-view default + freeze framing; daily availability cron; sponsor-read offset rule |
| Phase 2 — Curation | Editorial policy is boilerplate | `MEDICAL_REVIEW.md` enumerates hard exclusions; curator cannot approve without checking the rules |
| Phase 3 — AI onboarding | Hallucinated citations; flat AI voice; epistemic engagement substituting for behavior | Citation re-validation post-generation; voice spec in prompt; tiny-habit + implementation-intention required at habit setup |
| Phase 3 — Public launch / re-engagement | Cold-start retention with no push, no community | Weekly digest + .ics calendar invites + opt-in web push |
| Phase 4 — DOAC outreach | Pitch dies of strategic mismatch | Ask for non-objection not endorsement; pre-empt 5 concerns in deck; have plan-B corpus ready; don't outreach during news weeks |
| Phase 5 — Public OSS launch | Triage death spiral; CLA ambiguity; "good first issue" magnet | Triage budget Friday 2hrs; auto-stale bot; templates that auto-close violators; DCO action; clip-submission as primary non-code contribution path |
| All phases | Brand entanglement with single podcaster | Schema podcast-agnostic; speaker_status field; expansion bench researched but not shipped |
| All phases | Disclaimer-as-shield thinking | Editorial scope rules >> disclaimer text; demographic filtering, not just disclaiming |

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single consent checkbox covering all GDPR processing | Faster onboarding | Article 9 violation, fines, retrofit cost massive | Never |
| Hardcoding "DOAC" strings in shared UI components | Ships pitch demo faster | Every multi-podcast feature is a refactor; brand crater if DOAC has bad press | Never; use podcast_id from day 1 |
| Stubbing the Python worker in the monorepo from week 1 | Looks complete on the README | Phantom limb; bit-rots; breaks `pnpm dev` | Never; defer the stub, not the placeholder doc |
| Skipping the docker-compose smoke test in CI | Faster CI; "we'll test it manually" | Self-host story rots invisibly; first 5 self-hoster issues are deploy bugs | Never for an OSS-traction project |
| AGPL-3.0 license to "prevent commercial forks" | Feels protective | Kills DOAC pitch; deters contributors; ~zero forks worth preventing exist anyway | Never for this project |
| Approving clips without populated risk flags | Curation throughput | Silent corpus drift; one bad clip → press incident | Never |
| Approving clips citing "DOAC says" instead of named guest credential | Faster curation | Brand dependency on host; weak evidence claim | Never |
| Streak counter as the largest dashboard element | Short-term DAU bump | Anxiety-driven uninstalls; bad press for a *health* app | Never |
| Skipping the rename of "Hdiary" | Defer naming work | Triple cost after public launch | Acceptable only pre-launch |
| Single-app architecture with `/admin` routes | Faster MVP | None at MVP scale; refactor when forced | **Recommended path** |
| Local Supabase only, no hosted CI smoke | Faster iteration | Production drift bugs surface in user-visible incidents | Acceptable Phase 1 only; add hosted smoke by Phase 2 |
| Hand-curating 30 clips before any tooling | Skip 4–6 weeks of pipeline build | Curation throughput becomes the binding constraint at scale | Correct at MVP; build tooling at Phase 2/3 not Phase 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| YouTube IFrame Player API | Hiding/disabling player chrome to enforce 90s clip; assuming `start`/`end` always honored | Allow user to escape clip window; never hide "Watch on YouTube"; test on slow connections (start/end occasionally race) |
| YouTube embeds + self-hosters | `Referrer-Policy: no-referrer` silently breaks playback | Document required Referrer-Policy in self-host guide; CSP `frame-src` must include `https://www.youtube.com` and `https://www.youtube-nocookie.com` |
| Supabase Auth + EU users | Default email templates are not localized and contain no GDPR opt-in language | Customize email templates; add Article 9 language; verify magic-link domain matches privacy-policy domain |
| Supabase RLS | Forgetting `delete cascade` on user → habits → check-ins → embeddings | Erasure-test on every migration; integration test asserts row count = 0 across all tables for a deleted user |
| pgvector | Indexing `embedding` column without `lists` parameter at low data sizes; HNSW vs IVFFlat misuse | Start IVFFlat with `lists = N/1000`; revisit at 10k+ rows; for 30 clips IVFFlat is overkill, simple sequential cosine is fine |
| OpenAI/Anthropic LLM APIs | Sending free-text user input without explicit-consent layer | Separate consent toggle for "AI analysis of your responses"; log consent grant timestamp |
| OpenAI embeddings (`text-embedding-3-small`) | Forgetting to delete embeddings on user erasure | Cascade includes pgvector rows; verify in test |
| Anthropic Claude (extraction, deferred) | No prompt-injection defense on transcripts | Treat transcript content as untrusted; sanitize/template; never let transcript content reach a tool-use surface |
| Cloudflare R2 (deferred) | Public bucket misconfiguration leaking transcripts | Bucket private by default; signed URLs only; never public-read |
| Inngest / pg_cron | Double-running availability checks; no idempotency keys | All scheduled jobs idempotent; use `INSERT ... ON CONFLICT DO NOTHING` patterns |
| GitHub Actions for OSS | Secrets exposed to fork PRs by default | `pull_request_target` only with strict path/event guards; secrets never available to forks |
| Vercel | Preview deployments expose Supabase env vars to unauthorized forks | Use Vercel "encrypted env vars" + `VERCEL_GIT_COMMIT_AUTHOR_LOGIN` allowlist |
| Open Collective | Setting up too late, then bolt-on awkwardness | Page exists from day 1, even with $0 goal; "support the project" link in README |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential pgvector cosine over thousands of embeddings | Onboarding interview takes >2s per turn | IVFFlat or HNSW index once corpus > 1000 clips | At ~v0.5 when extraction pipeline lands |
| LLM per-turn latency in onboarding | 6–10 turns × 3s each = 18–30s onboarding | Stream tokens; pre-fetch RAG context in parallel with LLM call; use Haiku for non-critical turns | First public alpha |
| YouTube oembed availability check serial loop | 30 clips today, 1000 later → 1000s sequential checks | Batch + concurrency limit (e.g., p-limit 10); cache for 24h | At ~500 clips |
| Public habit page rendered server-side with full DB hit per request | TTFB > 1s; Vercel function bills | ISR with `revalidate` on clip update; static HTML for the iframe | At ~10k requests/month |
| Drizzle N+1 on habit cards | Dashboard loads slowly with >20 habits | Eager-load clip + speaker join | At ~50 habits/user (rare but possible for power users) |
| Email digest sent serially to all users | Hits LLM rate limits; takes hours | Batch by 50, queue per-batch, retry with backoff | At ~5k users |

---

## Sources

- [Andrew Huberman — Wikipedia](https://en.wikipedia.org/wiki/Andrew_Huberman) — HIGH (overview of 2024 controversy)
- [Slate: Scientists Like Me Knew There Was Something Amiss With Andrew Huberman's Wildly Popular Podcast](https://slate.com/technology/2024/03/andrew-huberman-huberman-lab-health-advice-podcast-debunk.html) — HIGH (peer-credentialed scientific critique)
- [Rolling Stone: Andrew Huberman's Cannabis Claims Slammed by Experts](https://www.rollingstone.com/culture/culture-features/andrew-huberman-cannabis-misinformation-slammed-by-experts-1235016613/) — HIGH (specific evidence-extraction failure case study)
- [ICO: What is special category data?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/) — HIGH (UK regulator authoritative)
- [PrivacyForge: Special Categories of Data Under GDPR — 2025 guide](https://www.privacyforge.ai/blog/special-categories-of-data-under-gdpr-complete-compliance-guide-2025) — MEDIUM (synthesis of 2025 EHDS state)
- [Taylor Wessing: European Health Data Space and the GDPR](https://www.taylorwessing.com/en/global-data-hub/2025/eu-digital-laws-and-gdpr/gdh---european-health-data-space-and-the-gdpr) — HIGH (law-firm analysis of EHDS 2025 entry into force)
- [GDPR Consent Requirements for Health Data — Momentum](https://www.themomentum.ai/blog/gdpr-consent-requirements-health-data) — MEDIUM (Article 9 explicit-consent specifics)
- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference) — HIGH (official)
- [YouTube API Services — Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality) — HIGH (official ToS document; Referer requirement, player chrome rules)
- [YouTube API Services — Developer Policies](https://developers.google.com/youtube/terms/developer-policies) — HIGH (official)
- [Open Source Maintainers Are Feeling the Squeeze — The Register, Feb 2025](https://www.theregister.com/2025/02/16/open_source_maintainers_state_of_open/) — HIGH (2025 industry data; 60% unpaid, 44% burnout citation)
- [Burnout in Open Source: A Structural Problem We Can Fix Together — Open Source Pledge](https://opensourcepledge.com/blog/burnout-in-open-source-a-structural-problem-we-can-fix-together/) — MEDIUM (structural framing)
- [Open Source Maintainer Burnout Crisis — Roaming Pigs](https://roamingpigs.com/field-manual/open-source-maintainer-burnout/) — MEDIUM (Kubernetes Ingress NGINX March 2026 case)
- [Combating Open Source Maintainer Burnout with Automation — dosu.dev](https://dosu.dev/blog/combating-open-source-maintainer-burnout-with-automation) — MEDIUM (automation patterns)
- [Maintaining Balance for Open Source Maintainers — opensource.guide](https://opensource.guide/maintaining-balance-for-open-source-maintainers/) — HIGH (canonical maintainer guide)
- [The Psychology of Streaks — Trophy.so](https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them) — MEDIUM (Prospect Theory framing applied to streaks)
- [The Dark Psychology Behind Your Everyday Apps — The Brink](https://www.thebrink.me/gamified-life-dark-psychology-app-addiction/) — MEDIUM (gamification harms; abandonment data)
- [Habit Tracking Science — Psychology Today, Dec 2025](https://www.psychologytoday.com/us/blog/parenting-from-a-neuroscience-perspective/202512/the-science-behind-habit-tracking) — MEDIUM
- [Building Snipd — Latent Space](https://www.latent.space/p/snipd) — MEDIUM (founder narrative; product limitations)
- [Snipd Product Walkthrough — Joshua Lum substack](https://joshualum.substack.com/p/product-analysis-of-my-favourite-podcast-app) — MEDIUM (third-party product critique)
- PROJECT.md — internal context (HIGH for project-specific facts)
