---
phase: 03-user-ai-loop-the-demo
plan: 04
subsystem: ui
tags: [react, ai-sdk-v6, useChat, streaming, interview, recommendations, swipe-stack, shadcn]

# Dependency graph
requires:
  - phase: 03-01-schema-foundations
    provides: InterviewTurnOutputSchema, HabitCandidate, Domain types from @cited/core
  - phase: 03-03-interview-synthesis-api
    provides: POST /api/interview (streaming), POST /api/synthesize, startInterviewAction, finalizeInterviewAction

provides:
  - Interview page + 7 client components (InterviewClient, ProgressDots, DomainBadge, ChoiceChips, SynthesisLoader, TellMeMore, extractTurnOutput)
  - Recommendations page + 3 client components (RecommendationStack, HabitCandidateCard, AdoptionSummary)
  - Settings ReRunInterviewButton (REC-06)
  - 31 unit tests covering all components

affects: [03-05-dashboard-checkin-graduation, 03-06-habit-detail-public-swap, 04-alpha-launch]

# Tech tracking
tech-stack:
  added:
    - "@ai-sdk/react useChat with DefaultChatTransport (AI SDK v6 pattern)"
    - "@next/third-parties YouTubeEmbed (lite-embed, tap-to-play)"
  patterns:
    - "extractTurnOutput: parse InterviewTurnOutputSchema from UIMessage.parts text parts"
    - "Phase-gated state machine: interview → synthesizing → tell-me-more (useState + ref guard)"
    - "Swipe stack: setTimeout-based animation with animState flag + CSS translate"
    - "TDD: failing tests first, then minimal implementation"
    - "exactOptionalPropertyTypes compatibility: use T | undefined for optional interface fields"

key-files:
  created:
    - apps/web/app/(onboarding)/onboarding/interview/page.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/ProgressDots.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/DomainBadge.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/ChoiceChips.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/SynthesisLoader.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/TellMeMore.tsx
    - apps/web/app/(onboarding)/onboarding/interview/_components/extractTurnOutput.ts
    - apps/web/app/(onboarding)/onboarding/interview/_components/interview.test.tsx
    - apps/web/app/(onboarding)/onboarding/recommendations/page.tsx
    - apps/web/app/(onboarding)/onboarding/recommendations/_components/RecommendationStack.tsx
    - apps/web/app/(onboarding)/onboarding/recommendations/_components/HabitCandidateCard.tsx
    - apps/web/app/(onboarding)/onboarding/recommendations/_components/AdoptionSummary.tsx
    - apps/web/app/(onboarding)/onboarding/recommendations/_components/recommendations.test.tsx
    - apps/web/app/(app)/settings/_components/ReRunInterviewButton.tsx
  modified:
    - apps/web/app/(app)/settings/page.tsx (added Interview section + ReRunInterviewButton)

key-decisions:
  - "extractTurnOutput parses InterviewTurnOutputSchema from text parts of UIMessage.parts — handles streaming partial state gracefully by returning null"
  - "SynthesisLoader advances to tell-me-more after 500ms; actual synthesis POST /api/synthesize happens in TellMeMore.onSubmit — keeping the loader simple"
  - "RecommendationStack uses setTimeout (not async/await Promise) for animation state to allow fake timer testing in vitest"
  - "YouTubeEmbed used on HabitCandidateCard (product surface) with NO auto-play parameter — HAB-05 compliance"
  - "templateIdMap built server-side in recommendations/page.tsx from habit_templates DB query; passed to AdoptionSummary for finalizeInterviewAction"

requirements-completed: [AION-01, AION-02, AION-07, REC-05, REC-06]

# Metrics
duration: 66min
completed: 2026-05-15
---

# Phase 03 Plan 04: Onboarding UI Summary

**Chip-driven interview surface with AI SDK v6 streaming, synthesis loader, swipe-stack adoption flow, and settings re-run button — all using warm paper + sage tokens from UI-DESIGN.md.**

## Performance

- **Duration:** ~66 min
- **Started:** 2026-05-15T06:14:00Z
- **Completed:** 2026-05-15T07:20:00Z
- **Tasks:** 2 of 3 complete (Task 3 = human-verify checkpoint — paused)
- **Files modified:** 16

## Accomplishments

- Interview surface: `/onboarding/interview` page streams from `/api/interview` via AI SDK v6 useChat + DefaultChatTransport; renders 3–4 choice chips, progress dots (10 dots), domain badge after turn 3, optional free-text textarea gated on AUTH-05c consent
- Synthesis flow: SynthesisLoader (animated sage dots, 500ms) → TellMeMore (exact D-03 prompt, skip link) → POST /api/synthesize → redirect to /recommendations
- Recommendations: full-screen swipe stack (adopt = right, skip = left, 500ms adopt animation), HabitCandidateCard with YouTubeEmbed (tap-to-play, no auto-play), AdoptionSummary with finalizeInterviewAction + /dashboard redirect
- Settings re-run button (REC-06): calls startInterviewAction → /onboarding/interview
- 31 unit tests: 20 for interview surface, 11 for recommendations/settings

## Task Commits

1. **Task 1: Interview surface — page + InterviewClient + chips + progress + domain badge + free-text gate** - `aaee6bf` (feat)
2. **Task 2: Recommendations page + RecommendationStack swipe + AdoptionSummary + settings re-run button** - `a61f8a6` (feat)
3. **Task 3: Visual verification** — CHECKPOINT: human-verify (not yet executed)

## Files Created/Modified

- `apps/web/app/(onboarding)/onboarding/interview/page.tsx` — Server component; finds/creates interview run; reads AUTH-05c consent from DB
- `apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx` — AI SDK v6 useChat streaming client; phase state machine (interview → synthesizing → tell-me-more)
- `apps/web/app/(onboarding)/onboarding/interview/_components/extractTurnOutput.ts` — Parses InterviewTurnOutputSchema from UIMessage.parts text parts
- `apps/web/app/(onboarding)/onboarding/interview/_components/ProgressDots.tsx` — 10-dot progress indicator (sage active, ink-4 done, paper-3 future)
- `apps/web/app/(onboarding)/onboarding/interview/_components/DomainBadge.tsx` — Sage pill "Focusing on: {domain}" (appears after turn 3)
- `apps/web/app/(onboarding)/onboarding/interview/_components/ChoiceChips.tsx` — 2–4 answer chips with hover lift
- `apps/web/app/(onboarding)/onboarding/interview/_components/SynthesisLoader.tsx` — Animated dots + Newsreader heading; auto-advances after 500ms
- `apps/web/app/(onboarding)/onboarding/interview/_components/TellMeMore.tsx` — Free-text step (D-03 prompt text, skip link); allowFreeText gates textarea
- `apps/web/app/(onboarding)/onboarding/recommendations/page.tsx` — Server component; fetches candidatesJson from interview_runs; enriches citations with youtubeVideoId; builds templateIdMap
- `apps/web/app/(onboarding)/onboarding/recommendations/_components/RecommendationStack.tsx` — Swipe stack; pointer events; adopt/skip with setTimeout animation
- `apps/web/app/(onboarding)/onboarding/recommendations/_components/HabitCandidateCard.tsx` — D-06 face: title, claim italic, domain badge, trigger, tinyAction, YouTubeEmbed, speaker, action buttons
- `apps/web/app/(onboarding)/onboarding/recommendations/_components/AdoptionSummary.tsx` — Adopted count + list + confirm (finalizeInterviewAction → /dashboard)
- `apps/web/app/(app)/settings/_components/ReRunInterviewButton.tsx` — REC-06; startInterviewAction → /onboarding/interview
- `apps/web/app/(app)/settings/page.tsx` — Added Interview section with ReRunInterviewButton

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] exactOptionalPropertyTypes compatibility on optional citation fields**
- **Found during:** Task 2 typecheck
- **Issue:** TypeScript strict mode with `exactOptionalPropertyTypes: true` rejected `youtubeVideoId?: string` when assigning `string | undefined` from DB query
- **Fix:** Changed to `youtubeVideoId?: string | undefined` pattern across all related interfaces
- **Files modified:** RecommendationStack.tsx, HabitCandidateCard.tsx, recommendations/page.tsx
- **Commit:** a61f8a6

**2. [Rule 1 - Bug] RecommendationStack async/await incompatibility with vitest fake timers**
- **Found during:** Task 2 tests
- **Issue:** `async function onAdopt() { await new Promise(r => setTimeout(r, 500)) }` pattern doesn't work with vitest fake timers
- **Fix:** Changed to synchronous setTimeout callback pattern for testability
- **Files modified:** RecommendationStack.tsx, recommendations.test.tsx
- **Commit:** a61f8a6

**3. [Rule 1 - Bug] TellMeMore JSX apostrophe - grep acceptance criterion mismatch**
- **Found during:** Task 1 acceptance check
- **Issue:** JSX `&apos;` entity prevented grep match for `Anything else you'd like to share`
- **Fix:** Changed to template literal `{"Anything else you'd like to share..."}`
- **Files modified:** TellMeMore.tsx
- **Commit:** aaee6bf

## Known Stubs

None — all components wire to real data sources (streaming interview API, synthesize API, DB-fetched candidates).

## Self-Check: PASSED

- Task 1 commit: `aaee6bf` ✓
- Task 2 commit: `a61f8a6` ✓
- All 31 new tests passing ✓
- `pnpm tsc --noEmit` clean ✓
- Key files:
  - `apps/web/app/(onboarding)/onboarding/interview/page.tsx` ✓
  - `apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx` ✓
  - `apps/web/app/(onboarding)/onboarding/recommendations/_components/RecommendationStack.tsx` ✓
  - `apps/web/app/(app)/settings/_components/ReRunInterviewButton.tsx` ✓
