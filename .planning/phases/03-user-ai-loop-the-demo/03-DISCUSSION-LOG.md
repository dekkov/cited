# Phase 3: User AI Loop (the Demo) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 03-user-ai-loop-the-demo
**Areas discussed:** Interview UX, Habit adoption screen, Check-in interaction, Public page depth

---

## Interview UX

### Q: Primary interaction mode

| Option | Description | Selected |
|--------|-------------|----------|
| Structured choices primary — optional free-text | 3–4 answer chips; open text field below if AUTH-05c opted in; one UI one code path | ✓ |
| Chat bubble UI | Streaming assistant messages + text input; chips fallback when AUTH-05c opted out | |
| Full-screen card per question | One question per screen, forward/back navigation, chips + optional text area | |

**User's choice:** Structured choices primary — optional free-text  
**Notes:** Simpler code path; AUTH-05c consent gate controls text field visibility only.

---

### Q: Interview progress indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Step indicator + domain badges | Step dots at top; after turn 3, domain callout highlights priority domain | ✓ |
| No explicit progress | Conversational feel, no bars or steps | |
| Domain coverage map | 4-domain grid fills as questions cover each area | |

**User's choice:** Step indicator + domain badges  
**Notes:** Users need orientation in a 6–10 turn flow.

---

### Q: Bridge from interview end to recommendations

| Option | Description | Selected |
|--------|-------------|----------|
| Synthesis loading screen → recommendations | Brief animated loading while Sonnet synthesizes | ✓ (with extension) |
| Inline summary card before recommendations | Gap summary, user taps "See my habits" | |
| Immediate in same view | Recommendations appear below without screen change | |

**User's choice:** Loading screen, THEN a "tell me more" free-form text step (user can share eating habits, work schedule, why they developed certain habits), THEN recommendations.  
**Notes:** The "tell me more" context is bundled into the Sonnet synthesis prompt. User also requested a persistent AI chat in the app post-onboarding for similar context sharing → **deferred to Phase 4+**.

---

### Q: Persistent AI chat scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 3 — minimal version | Simple chat entry appending context to profile jsonb | |
| Phase 3 — full persistent chat | Dedicated streaming chat UI referencing clip corpus | |
| Deferred to Phase 4+ | Phase 3 gets "tell me more" only; persistent chat is separate | ✓ |

**User's choice:** Deferred to Phase 4+

---

## Habit Adoption Screen

### Q: Candidate display format

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen swipe stack (one at a time) | Swipe right = adopt, left = skip | ✓ |
| Vertical list with clip embed per card | All visible at once, checkboxes, "Adopt selected" | |
| Ranked grid — top pick highlighted | 1+2 layout, primary recommendation large | |

**User's choice:** Full-screen swipe stack  
**Notes:** High engagement; feels like a moment of decision.

---

### Q: Swipe-right feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Brief confetti / check animation then next card | ~0.5s visual confirmation, then next card slides in | ✓ |
| Card flips to "Added to dashboard" — user taps continue | Confirmation state, user must tap to advance | |
| Silent — next card immediately | Adoption silent; review summary at end | |

**User's choice:** Brief confetti / check animation

---

### Q: Card face content

| Option | Description | Selected |
|--------|-------------|----------|
| Title + claim quote + domain badge + trigger + tiny action + clip thumbnail | Full detail to decide in one glance | ✓ |
| Title + claim quote + speaker name + clip thumbnail only | Minimal; trigger/tiny action revealed post-adoption | |
| Title + domain badge + why recommended for you + clip thumbnail | AI explanation of match, more personalized | |

**User's choice:** Habit title + claim quote + domain badge + trigger + tiny action + clip thumbnail

---

## Check-in Interaction

### Q: Consistency view placement

| Option | Description | Selected |
|--------|-------------|----------|
| Per-habit inline mini-bar — each card owns its consistency | Consistency bar primary inside each habit card; streak secondary | ✓ (with addition) |
| Global consistency section at top, habit list below | Summary view first, then list | |
| Primary per-habit, secondary global | Both present; global as secondary header | |

**User's choice:** Per-habit inline mini-bar  
**Notes:** User also requested: at 21 successful check-ins, suggest the habit has become part of the user's life (Atomic Habits concept). User can archive the habit and be prompted to adopt a new one.

---

### Q: Graduation threshold

| Option | Description | Selected |
|--------|-------------|----------|
| 14 successful check-ins | Early "starting to stick" signal | |
| 21 successful check-ins | Popular milestone | ✓ |
| Configurable per-habit (default 21) | Admin sets threshold per habit_template | |

**User's choice:** 21 successful check-ins

---

### Q: Graduation outcome

| Option | Description | Selected |
|--------|-------------|----------|
| Habit moves to "Established" section — no daily check-in | Dashboard splits into Active and Established | |
| Check-in becomes optional / weekly | Tracking continues at reduced frequency | |
| Habit is archived — user prompted to adopt a new one | Clean slate; prompts new habit from different domain | ✓ |

**User's choice:** Habit archived, user prompted to adopt a new one

---

### Q: Check-in interaction from dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Tap opens bottom sheet / popover with 3 buttons | Done / Partial / Skip; mood + note accessible via expand | ✓ |
| Tap cycles the state | Tap = done, tap again = partial, etc.; long-press for mood/note | |
| Inline 3-button strip always visible | Done / Partial / Skip always shown below each habit | |

**User's choice:** Tap opens compact bottom sheet / popover

---

## Public Page Depth

### Q: Primary purpose of /h/[slug]

| Option | Description | Selected |
|--------|-------------|----------|
| SEO landing page — rich editorial content | Full habit page with claim, speaker bio, episode context, clip, CTAs | ✓ (Claude recommendation, user confirmed) |
| Social share card — minimal, shareable | Title, one-sentence claim, clip, two CTAs | |
| Pitch-first page — product explanation + habit | Explains Cited first, then the habit | |

**User's choice:** Rich editorial page (Claude recommended; user confirmed)

---

### Q: OG image content

| Option | Description | Selected |
|--------|-------------|----------|
| Habit title + domain badge + speaker name + Cited branding | Text-first clean card | |
| Habit title + YouTube thumbnail + speaker name | Visually richer; thumbnail from YouTube | ✓ |
| Claude's discretion | Consistent with warm paper + sage palette | |

**User's choice:** Habit title + YouTube thumbnail + speaker name

---

## Claude's Discretion

- Swap presentation style (slide-in panel vs. inline modal)
- Exact animation timing / easing for swipe stack
- Loading skeleton design
- Error state handling
- `noindex` rules for supplement-adjacent public pages

## Deferred Ideas

- Persistent AI chat in (app) post-onboarding → Phase 4+
- Public DMCA form (LGL-02/LGL-03) → must be addressed when `/h/[slug]` goes live (Phase 3 introduces the first public surface)
