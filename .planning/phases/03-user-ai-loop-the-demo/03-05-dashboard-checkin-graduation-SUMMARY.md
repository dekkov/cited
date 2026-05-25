---
phase: 03-user-ai-loop-the-demo
plan: 05
subsystem: dashboard
tags: [dashboard, check-in, streak, consistency, graduation, freeze, no-shame, server-actions]

# Dependency graph
requires:
  - phase: 03-01-schema-foundations
    provides: user_habits, check_ins, streaks, streak_freezes schemas + enums (user_habit_status, check_in_status)
  - phase: 03-04-onboarding-ui
    provides: finalizeInterviewAction (writes the first user_habits rows the dashboard reads)

provides:
  - Authenticated /dashboard route with HabitCard list (consistency PRIMARY, streak secondary, hidden ≥30)
  - Tri-state check-in via CheckInSheet bottom-popover (Done/Partial/Skip + optional mood + AUTH-05c-gated note)
  - Streak freeze auto-apply on first weekly miss with gain-frame toast (HAB-08)
  - Habit graduation at 21 successful check-ins via GraduationToast + archive-habit action (D-09)
  - 3 pure libs in @cited/core/habits: computeConsistency, applyCheckIn, isGraduationReady
  - 2 server actions: checkInAction (writes check-in + advances streak + maybe graduates), archiveHabitAction (soft-delete)

affects: [03-06-habit-detail-public-swap, 04-alpha-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function core for streak math (testable in isolation) + thin server action that orchestrates DB writes"
    - "Server action returns CheckInResult { freezeApplied, graduated } — client decides toast/redirect"
    - "Bottom-sheet check-in UX (full-screen on mobile, modal on desktop) — no inline-card check-in to keep the consistency bar undisturbed"
    - "Graduation is a status change (status='graduated' + graduatedAt) + a gentle GraduationToast — never an automatic archive"

key-files:
  created:
    - packages/core/src/habits/consistency.ts
    - packages/core/src/habits/consistency.test.ts
    - packages/core/src/habits/streak.ts
    - packages/core/src/habits/streak.test.ts
    - packages/core/src/habits/graduation.ts
    - packages/core/src/habits/graduation.test.ts
    - packages/core/src/habits/index.ts
    - apps/web/app/actions/check-in.ts
    - apps/web/app/actions/check-in.test.ts
    - apps/web/app/actions/archive-habit.ts
    - apps/web/app/(app)/dashboard/page.tsx
    - apps/web/app/(app)/dashboard/_components/HabitCard.tsx
    - apps/web/app/(app)/dashboard/_components/HabitCard.test.tsx
    - apps/web/app/(app)/dashboard/_components/ConsistencyBar.tsx
    - apps/web/app/(app)/dashboard/_components/CheckInSheet.tsx
    - apps/web/app/(app)/dashboard/_components/CheckInSheet.test.tsx
    - apps/web/app/(app)/dashboard/_components/GraduationToast.tsx
    - apps/web/app/(app)/dashboard/_components/StreakStrip.tsx
  modified:
    - packages/core/src/index.ts (barrel — habits subpath)

key-decisions:
  - "21-day consistency window is the dashboard's PRIMARY visual; streak is secondary and disappears once currentLength ≥ 30 (HAB-09) so it can't dominate the page"
  - "Missed-day cells render --color-paper-3 (warm muted neutral), never red, never flame — HAB-10 + Pitfall 5 enforced visually and audited by code-review"
  - "Streak freeze auto-applies silently on first weekly miss; UI surfaces a gain-frame toast '1 freeze used — streak preserved' rather than a loss-frame warning"
  - "Note field is consent-gated at write time: profiles.consentFreeTextAi must be true (AUTH-05c). The mood field is always written when provided"
  - "Graduation policy lives in pure isGraduationReady(currentLength, habit.status) → check-in action calls it post-streak-update; client GraduationToast decides whether to call archiveHabitAction"
  - "Dashboard query was rewritten this session — see Deviations below"

requirements-completed: [HAB-01, HAB-02, HAB-03, HAB-06, HAB-07, HAB-08, HAB-09, HAB-10]

# Metrics
completed: 2026-05-24
---

# Phase 03 Plan 05: Dashboard + Check-In + Graduation Summary

**Daily-use surface: HabitCard with consistency-primary, streak-secondary, no-shame visuals; tri-state check-in via bottom sheet; streak freeze auto-apply; graduation at 21 check-ins.**

## Performance

- **Initial implementation:** bundled into Wave-3 commit `f4bc2fa feat(03): user↔AI loop — adopt board, dashboard, habit detail, public pages`
- **Bug fixes this session:** `b3b2b7d fix(03-05): filter habit_template_clips join to primary clip (de-dupe dashboard rows)`
- **Tests:** 4 component/action test files (HabitCard, CheckInSheet, check-in, plus the 3 core lib test files for consistency/streak/graduation)

## Accomplishments

- `/dashboard` route renders all `status='active'` user_habits joined to their primary clip with speaker + thumbnail
- `HabitCard` renders the 21-cell `ConsistencyBar` as primary; `StreakStrip` below with current length + freeze allowance (hidden once ≥30 — HAB-09); a tri-state check-in trigger; and a link to the detail page
- `ConsistencyBar` uses `--color-paper-3` for missed days (no red, no flame — HAB-10)
- `CheckInSheet` bottom-popover with Done/Partial/Skip; optional 1-5 mood pills and a free-text note (note gated at the server action by AUTH-05c consent)
- `check-in` server action: one check-in per habit per day (UNIQUE constraint + app-level guard), applies the pure `applyCheckIn` to advance the streak, auto-applies a `streak_freezes` row on first weekly miss, and graduates the habit when `isGraduationReady` returns true
- `GraduationToast` celebrates the 21-day milestone and offers a path to archive via `archiveHabitAction` → `/onboarding/interview`
- 3 pure libs in `@cited/core/habits/` keep streak/consistency/graduation math testable without DB

## Task Commits

1. **Initial wave-3 implementation** — `f4bc2fa` (feat) — all of dashboard + check-in + streak/graduation libs, with 03-06 bundled
2. **Dashboard join cardinality fix** — `b3b2b7d` (fix) — discovered during Phase 03-06 verification; see Deviations

## Files Created/Modified

### Pure libs (`@cited/core/habits/`)
- `consistency.ts` — `computeConsistency(checkIns, windowDays=21)` → counts of done/partial/skipped/missed + 21-cell array for the visual
- `streak.ts` — `applyCheckIn(state, status, today)` → next state with freeze auto-apply; honors weekly-freeze quota and gap-based reset rules
- `graduation.ts` — `isGraduationReady(currentLength, habitStatus)` predicate with `GRADUATION_THRESHOLD = 21`
- `index.ts` — barrel exporting the three

### Server actions (`apps/web/app/actions/`)
- `check-in.ts` — verifies ownership; rejects duplicate check-ins per day; loads streak + freezes; calls `applyCheckIn`; upserts `streaks`; consumes oldest freeze if auto-applied; sets `user_habits.status='graduated'` when ready; returns `{ freezeApplied, graduated }`
- `archive-habit.ts` — sets `status='archived'`, `archivedAt`, `active=false` for the owner's habit

### Dashboard surface
- `dashboard/page.tsx` — server component; redirects to `/onboarding/interview` if user has no completed interview run; SELECTs active habits joined to primary clip (template + speaker + youtubeVideoId) and computes consistency + streak per habit in parallel
- `_components/HabitCard.tsx` — domain badge, title, consistency bar, streak strip, check-in trigger, link to detail page
- `_components/ConsistencyBar.tsx` — 21-cell grid keyed to today's date; sage-tinted cells for done/partial, paper-3 for missed
- `_components/CheckInSheet.tsx` — bottom-sheet trigger; status buttons + mood pills + note textarea; calls `checkInAction` and reflects `{ freezeApplied, graduated }` in the UI
- `_components/GraduationToast.tsx` — sage toast on graduation; "Archive habit" → `archiveHabitAction` + redirect to onboarding
- `_components/StreakStrip.tsx` — secondary surface; shows currentLength + freezes-available; hides at currentLength ≥ 30

## Deviations from Plan

### Fixed during 03-06 verification (committed as `b3b2b7d`)

**1. Dashboard query fanned out rows when templates had >1 junction row**

- **Found during:** 03-06 verification, after expanding the dev seed to 2 clips per template (SWAP-03 requirement)
- **Symptom:** React warning `Encountered two children with the same key, <userHabits.id>` after adopting any habit; one `user_habits` row was rendered as N `HabitCard`s where N = number of junction rows
- **Root cause:** `.leftJoin(habitTemplateClips, eq(... habit_template_id == habit_templates.id))` was unfiltered — the position filter was on the *clips* join only. Worse, the filter looked for `position = 0` while the seed inserts at `position = 1`, so `clipSpeaker` / `clipYoutubeVideoId` had been silently null since the seed was first written
- **Fix:** Move the position filter onto the `habit_template_clips` join itself (`position = 1` — primary clip), making the row count 1-per-user_habit. Drop the (now redundant) condition on the clips join
- **No regression test seam:** the query is inline in the server component. Memory note `dashboard-loader-extract` flags this for a future refactor where the query is extracted into a tested loader returning `DashboardCard[]` with an explicit "1 row per user_habit" contract

## Known Stubs

None. All flows wire to real DB writes; freeze quota is generated at user creation (Phase 03-01).

## Self-Check: PASSED

- Initial commit: `f4bc2fa` ✓
- Cardinality fix commit: `b3b2b7d` ✓
- All habit lib tests passing (consistency, streak, graduation) ✓
- Component tests passing (HabitCard, CheckInSheet, check-in action) ✓
- `pnpm turbo run lint typecheck test` — 18/18 ✓
- Manual verification (user, 2026-05-24): adopted 5 habits, dashboard renders one card per habit with correct speaker + thumbnail; check-in flow works; remove flow redirects correctly; no React key warnings
