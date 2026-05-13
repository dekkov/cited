# Phase 3: User AI Loop (the Demo) — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete user AI loop from post-signup into a RAG-grounded onboarding interview → personalized habit recommendations with validated DOAC clip citations → habit adoption → consistency-first dashboard with tri-state check-in and habit graduation → habit swap → public `/h/[slug]` editorial pages. **This phase ends with a Loom-recordable demo.** Creating posts, persistent AI chat in the app, and email reminders are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Interview UX (AION-01, AION-02, AION-07)

- **D-01:** Structured choices are the primary interaction mode. Each question renders 3–4 answer chips. If AUTH-05c (LLM free-text analysis) is opted in, an open text field appears below the chips. If opted out, the field is hidden. One UI, one code path — no parallel chat bubble mode.
- **D-02:** Progress: step dots at the top of the interview view + domain badges. After turn 3, a visual callout highlights the priority domain ("Focusing on: Sleep"). Users always see where they are.
- **D-03:** Interview end flow: (1) "Analyzing your profile..." loading screen while Sonnet synthesizes, then (2) a "tell me more" step — a free-form text field ("Anything else you'd like to share for better recommendations? e.g. eating habits, work schedule, why you developed certain habits"). This free-form context is included in the Sonnet synthesis prompt. Then (3) recommendations appear.

### Habit Adoption Screen (REC-01, REC-02, REC-05)

- **D-04:** Candidates are displayed as a **full-screen swipe stack** (one at a time). Swipe right = adopt; swipe left = skip.
- **D-05:** On swipe-right: brief confetti/check animation (~0.5s) confirms adoption, then the next card slides in. Adopted habits are silently accumulated and confirmed on a final summary screen.
- **D-06:** Card face content: habit title · claim quote (Newsreader italic) · domain badge · trigger · tiny action · clip thumbnail (lite-embed via `<YouTubeEmbed>`, tap-to-play, no autoplay). Speaker name visible on card face. Two swipe action buttons below for keyboard/mouse users.

### Dashboard & Check-in (HAB-01–10)

- **D-07:** Consistency view is **per-habit** — each habit card leads with its own consistency mini-bar ("18/21 last 3 weeks") as the primary visual element inside the card. Streak counter appears smaller and secondary below the consistency bar. No separate global consistency section.
- **D-08:** Tri-state check-in (done / skipped / partial): single tap on the check-in affordance opens a compact **bottom sheet / popover** with three buttons: Done · Partial · Skip. Optional mood (1–5) + free-text note accessible via an expand arrow within the same sheet. Note only stored if AUTH-05c opted in.
- **D-09:** **Habit graduation at 21 successful check-ins**: the app surfaces a message — "This habit may now be part of your life 🌱" — and asks if the user wants to stop tracking it. If they accept: habit is **archived** (marked complete, removed from daily flow) and the user is prompted to adopt a new habit from a different domain. If they decline, tracking continues as normal.

### Habit Swap (SWAP-01–04)

- **D-10:** Swap UX not explicitly discussed — defaults to the ROADMAP.md spec: cosine > 0.7 distance from current AND from a different cluster in the same domain, 2 validated citations. Swap button visible on the habit detail page. Claude's discretion on presentation (slide-in panel or inline modal).

### Public Pages /h/[slug] (PUB-01–05)

- **D-11:** **Rich editorial page** (not minimal card). Content: claim (Newsreader italic, block-quoted), speaker name + credentials + attribution note ("never implies endorsement"), DOAC episode context (episode title, date), embedded `<YouTubeEmbed>` (lite-embed, start/end timestamps, no player chrome disabled), trigger + tiny action, prominent "Watch on Diary of a CEO" CTA, "Adopt this habit" CTA (links to signup if logged-out; auto-adopts if logged-in).
- **D-12:** OG image (`/api/og/h/[slug]` route handler via `@vercel/og`): habit title + YouTube video thumbnail (fetched at generation time) + speaker name. Warm paper palette.

### Claude's Discretion
- Swap presentation style (slide-in panel vs. inline modal vs. dedicated page) — choose simplest that works.
- Exact animation timing and easing for swipe stack.
- Loading skeleton design for interview turns and dashboard.
- Error state handling throughout.
- Exact `noindex` rules for dosing/supplement-adjacent public pages (per PUB-04 + LGL-08 interaction).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §AION-01–08 — full interview requirements (RAG grounding, model tiering, fallback for opted-out users, structured output)
- `.planning/REQUIREMENTS.md` §REC-01–06 — habit recommendation + adoption requirements (citation grounding check, re-run, trigger + tiny_action)
- `.planning/REQUIREMENTS.md` §HAB-01–10 — habit dashboard, check-in, consistency view spec, streak freeze rules
- `.planning/REQUIREMENTS.md` §SWAP-01–04 — swap requirements (cosine threshold, citation validation)
- `.planning/REQUIREMENTS.md` §PUB-01–05 — public page requirements (RLS check, OG image, structured data, SEO)

### Design System
- `.planning/UI-DESIGN.md` — warm paper + sage palette, typography (Newsreader / Geist Sans / Geist Mono), habit card modes (hero / inline / collapsed), `<YouTubeEmbed>` usage rule

### Database Schema
- `packages/db/src/schema/habit-templates.ts` — `habitTemplates` table (slug, title, description, domain, trigger, tinyAction, defaultFrequency)
- `packages/db/src/schema/streaks.ts` — `streaks` table (currentLength, longestLength, lastCheckInDate per userHabit)
- `packages/db/src/schema/streak-freezes.ts` — streak freeze schema
- `packages/db/src/schema/check-ins.ts` — check-in schema (tri-state + mood + note)
- `packages/db/src/schema/clips.ts` — clips schema (for citation grounding queries)
- `packages/db/src/schema/transcripts.ts` — transcript chunks (for RAG retrieval in interview)

### LLM Layer
- `packages/core/src/llm/types.ts` — `LlmTier` (`cheap` | `reasoning`); use `cheap` for interview turns, `reasoning` for synthesis
- `packages/core/src/llm/provider.ts` — provider wrapper interface (all calls must go through this — AION-09)

### Prior Phase Context
- `.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md` — GA5 AION-10 eval strategy (hybrid runtime check + CI LLM-as-judge), GA3 transcript schema shape, embed-on-approve path

### Roadmap
- `.planning/ROADMAP.md` §Phase 3 — success criteria and pitfall coverage (Pitfall 5 streak, Pitfall 12 hallucination, Pitfall 14 insight vs. action, Pitfall 15 AI voice, Pitfall 18 SEO)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/components/ui/card.tsx` — shadcn/ui Card component; use for habit cards and swipe stack candidates
- `apps/web/components/ui/button.tsx`, `dialog.tsx`, `tabs.tsx`, `badge.tsx` — all available for interview chips, check-in sheet, domain badges
- `apps/web/app/(onboarding)/` route group — legal-gate already wired here; interview should live in this group pre-adoption, then redirect to `(app)/dashboard`
- `apps/web/app/(app)/dashboard/` — empty directory, ready for the habit dashboard
- `packages/core/src/embeddings/embedClip.ts`, `embedTranscriptChunks.ts` — embedding utilities already built
- `packages/core/src/llm/` — full LLM provider wrapper (anthropic + openai) + `LlmTier` + `LlmStructuredOpts` for typed JSON outputs

### Established Patterns
- LLM calls: always via `packages/core/src/llm/provider.ts` — never raw SDK calls in routes (AION-09, enforced by Biome)
- Server actions for mutations (auth, settings already use this pattern)
- Drizzle for all DB queries; `postgres` driver with `prepare: false` for Supabase pooled connections
- Hybrid RAG: pgvector cosine + tsvector full-text (established in Phase 2 for transcript search; same pattern for interview clip retrieval)

### Integration Points
- Interview → `(onboarding)/onboarding/interview/` route; completes by writing `profiles.onboarding_completed_at` and `user_habits` rows, then redirects to `(app)/dashboard`
- Citation grounding: post-generation re-fetch against `clips` table by ID (REC-02); if <2 valid → regenerate
- Streak Freeze auto-apply: application-layer logic (not DB trigger) in the check-in server action — more testable
- Public pages: `app/(public)/h/[slug]/page.tsx` (or a new `(public)` route group; check if one exists already)
- OG image: `app/api/og/h/[slug]/route.ts` using `@vercel/og`

</code_context>

<specifics>
## Specific Ideas

- Interview "tell me more" free-form text: "Anything else you'd like to share for better recommendations? e.g. eating habits, work schedule, why you developed certain habits" — this text and the structured answers are bundled into the Sonnet synthesis prompt.
- Habit graduation message at 21 check-ins: "This habit may now be part of your life 🌱" — gain-frame, non-pressuring. If user declines, no re-prompt for at least 7 more check-ins.
- Persistent AI chat (user described wanting to talk about their life broadly — food, work schedule, why they developed certain habits): **deferred to Phase 4+** as a standalone feature.
- Missed days render as muted neutral (empty cell in consistency bar, no red, no flame) per HAB-10 and the design system's warm palette.
- Streaks ≥30 days hidden from the daily view card per HAB-09 (still visible in detail/settings).

</specifics>

<deferred>
## Deferred Ideas

- **Persistent AI chat in (app)** — user wants a chat surface where they can share life context (food, work schedule, habit history) post-onboarding to improve future recommendations. Deferred to Phase 4+. Phase 3's "tell me more" prompt at interview end is the lightweight precursor.
- **Public DMCA form (LGL-02/LGL-03)** — deferred from Phase 2; must re-pickup when `/h/[slug]` goes live (PUB pages are the first public surface). Plan for this in Phase 3 execution.

</deferred>

---

*Phase: 03-user-ai-loop-the-demo*
*Context gathered: 2026-05-13*
