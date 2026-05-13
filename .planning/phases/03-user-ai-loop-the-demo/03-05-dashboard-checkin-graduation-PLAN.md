---
phase: 03-user-ai-loop-the-demo
plan: 05
type: execute
wave: 3
depends_on: ["03-01", "03-04"]
files_modified:
  - packages/core/src/habits/consistency.ts
  - packages/core/src/habits/consistency.test.ts
  - packages/core/src/habits/streak.ts
  - packages/core/src/habits/streak.test.ts
  - packages/core/src/habits/graduation.ts
  - packages/core/src/habits/graduation.test.ts
  - packages/core/src/habits/index.ts
  - packages/core/src/index.ts
  - apps/web/app/actions/check-in.ts
  - apps/web/app/actions/archive-habit.ts
  - apps/web/app/(app)/dashboard/page.tsx
  - apps/web/app/(app)/dashboard/_components/HabitCard.tsx
  - apps/web/app/(app)/dashboard/_components/ConsistencyBar.tsx
  - apps/web/app/(app)/dashboard/_components/CheckInSheet.tsx
  - apps/web/app/(app)/dashboard/_components/GraduationToast.tsx
  - apps/web/app/(app)/dashboard/_components/StreakStrip.tsx
autonomous: false
requirements:
  - HAB-01
  - HAB-02
  - HAB-03
  - HAB-06
  - HAB-07
  - HAB-08
  - HAB-09
  - HAB-10
user_setup: []
must_haves:
  truths:
    - "Dashboard lists active habits; each card's primary visual is the 21-cell consistency bar (HAB-06)"
    - "Streak counter is rendered smaller and below the consistency bar (HAB-07); hides when currentLength >= 30 (HAB-09)"
    - "Tri-state check-in via bottom-sheet popover with Done/Partial/Skip buttons (HAB-02); optional mood (1–5) + note via expand arrow (HAB-03)"
    - "Note text is persisted ONLY if profiles.consentFreeTextAi = true (HAB-03 + AUTH-05c)"
    - "Streak freeze auto-applies on first miss of the week when freezes_available > 0; gain-frame toast '1 freeze used — streak preserved' (HAB-08)"
    - "Habit graduation at 21 successful check-ins: graduation toast + prompt to archive; if accepted, user_habits.status='archived' + archivedAt set + redirect to /onboarding/interview (D-09)"
    - "Missed-day cells render --color-paper-3 muted neutral; NEVER red, NEVER flame (HAB-10, Pitfall 5)"
  artifacts:
    - path: "packages/core/src/habits/consistency.ts"
      provides: "computeConsistency(checkIns, windowDays=21) → {done, partial, skipped, missed, last21Days}"
      contains: "computeConsistency"
    - path: "packages/core/src/habits/streak.ts"
      provides: "applyCheckIn(state, status, today) → next streak state with freeze auto-apply"
      contains: "applyCheckIn"
    - path: "packages/core/src/habits/graduation.ts"
      provides: "isGraduationReady(streak, userHabit) predicate"
      contains: "GRADUATION_THRESHOLD = 21"
    - path: "apps/web/app/(app)/dashboard/_components/HabitCard.tsx"
      provides: "Per-habit card with consistency PRIMARY, streak secondary"
      contains: "ConsistencyBar"
  key_links:
    - from: "check-in.ts server action"
      to: "applyCheckIn"
      via: "computes next streak state with freeze rule"
      pattern: "applyCheckIn"
    - from: "HabitCard"
      to: "CheckInSheet"
      via: "trigger button opens bottom sheet"
      pattern: "CheckInSheet"
    - from: "check-in.ts"
      to: "isGraduationReady"
      via: "post-check-in, if true → set user_habits.status='graduated' and return graduated flag"
      pattern: "isGraduationReady"
---

<objective>
Ship the habit dashboard, tri-state check-in (bottom sheet), consistency-primary HabitCard, streak rollover with freeze auto-apply, and habit graduation at 21 check-ins.

Purpose: This is the *daily-use* surface and the second half of the Loom demo. The streak-loss-frame pitfall lives here; this plan enforces consistency-primary and no-shame discipline.

Output: Dashboard page + 5 components, 3 pure libs (consistency, streak, graduation), 2 server actions.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/UI-DESIGN.md
@.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@packages/db/src/schema/user-habits.ts
@packages/db/src/schema/check-ins.ts
@packages/db/src/schema/streaks.ts
@packages/db/src/schema/streak-freezes.ts

<interfaces>
From Plan 03-01:
- `userHabits.status` enum ('active'|'archived'|'graduated'), `archivedAt`, `graduatedAt`

Existing Phase 1 schema:
- `checkIns` table: userHabitId, checkInDate (date), status (done|partial|skipped), mood (1-5 nullable), note (text nullable), UNIQUE(userHabitId, checkInDate)
- `streaks` table: userHabitId, currentLength, longestLength, lastCheckInDate
- `streakFreezes` table: userId, monthYear, banked, used

UI-DESIGN.md HabitCard spec (lines re Streak strip):
- 21-cell grid `repeat(21, 1fr)` 3px gap
- States: on → `--color-accent`; half → mid-sage; pending today → dashed accent outline; empty → `--color-paper-3`
- Number: "18" Newsreader 30px + "/21" 16px ink-3
- Caption "LAST 3 WEEKS" mono
- Freeze pill: "2 freezes available" mono with snowflake SVG
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Consistency + streak + graduation pure libs</name>
  <read_first>
    - packages/db/src/schema/check-ins.ts and streaks.ts and streak-freezes.ts (column shapes)
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-07, D-08, D-09
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 7" + §"Streak rollover + freeze auto-apply"
    - PROJECT.md "Streak Freeze" framing (2 freezes/month, max 4 banked)
  </read_first>
  <behavior>
    consistency:
    - Test 1: 21 check-ins all 'done' → { done: 21, partial:0, skipped:0, missed:0, last21Days: array of 21 'on' states }
    - Test 2: 18 'done', 1 'partial', 1 'skipped', 1 missing date → { done:18, partial:1, skipped:1, missed:1 }
    - Test 3: Today's date with no check-in renders as 'pending', not 'missed'

    streak.applyCheckIn:
    - Test 4: status='done', no missed day since lastCheckInDate → currentLength + 1
    - Test 5: status='skipped', freezes_available > 0, no freeze used this week → freeze consumed; currentLength preserved; gainFrame=true
    - Test 6: status='skipped', no freezes available → currentLength resets to 0
    - Test 7: Two-day gap between lastCheckInDate and today → first miss applies freeze if available; second day = reset
    - Test 8: status='partial' → currentLength + 1 (partial still counts)

    graduation:
    - Test 9: streak.currentLength >= 21 AND userHabit.status='active' → isGraduationReady = true
    - Test 10: streak.currentLength = 20 → false
    - Test 11: userHabit.status='graduated' → false (already graduated)
  </behavior>
  <action>
    1. `packages/core/src/habits/consistency.ts`:

       ```ts
       export type CheckInStatus = 'done' | 'partial' | 'skipped';
       export type DayState = 'on' | 'half' | 'skipped' | 'missed' | 'pending';

       export type CheckInRecord = {
         readonly date: string;       // YYYY-MM-DD
         readonly status: CheckInStatus;
       };

       export type Consistency = {
         readonly done: number;
         readonly partial: number;
         readonly skipped: number;
         readonly missed: number;
         readonly last21Days: readonly DayState[];   // chronological oldest→newest
       };

       export const WINDOW_DAYS = 21;

       export function computeConsistency(checkIns: readonly CheckInRecord[], today: Date): Consistency {
         // Build 21-day window ending today; for each day, find a matching check-in or label as missed/pending.
         // Today with no check-in = 'pending' (dashed outline in UI), not 'missed'.
         // ...
       }
       ```

    2. `packages/core/src/habits/streak.ts`:

       ```ts
       export type StreakState = {
         readonly currentLength: number;
         readonly longestLength: number;
         readonly lastCheckInDate: string | null;     // YYYY-MM-DD
         readonly freezesAvailable: number;            // banked - used (this month)
         readonly freezeUsedThisWeek: boolean;
       };

       export type ApplyResult = {
         readonly next: StreakState;
         readonly freezeApplied: boolean;     // for gain-frame toast (HAB-08)
         readonly daysReset: boolean;
       };

       export const FREEZES_PER_MONTH = 2;
       export const FREEZES_MAX_BANKED = 4;

       export function applyCheckIn(
         state: StreakState,
         status: 'done' | 'partial' | 'skipped',
         today: string,
       ): ApplyResult {
         // 1. Determine days since lastCheckInDate.
         // 2. If status is 'done' or 'partial' AND gap <= 1: increment.
         // 3. If gap > 1 OR status='skipped': try freeze auto-apply (one per week max).
         // 4. If no freeze available and gap > 1 or skipped: reset to 0.
         // ...
       }
       ```

    3. `packages/core/src/habits/graduation.ts`:

       ```ts
       export const GRADUATION_THRESHOLD = 21;

       export function isGraduationReady(
         currentStreakLength: number,
         userHabitStatus: 'active' | 'archived' | 'graduated',
       ): boolean {
         return currentStreakLength >= GRADUATION_THRESHOLD && userHabitStatus === 'active';
       }

       export const GRADUATION_MESSAGE = 'This habit may now be part of your life 🌱';   // D-09 verbatim
       ```

    4. `packages/core/src/habits/index.ts` re-exporting; add `export * from './habits'` to `packages/core/src/index.ts`.

    5. Write tests covering all 11 behaviors.
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- habits</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/habits/consistency.ts`
    - `test -f packages/core/src/habits/streak.ts`
    - `test -f packages/core/src/habits/graduation.ts`
    - `grep -q "GRADUATION_THRESHOLD = 21" packages/core/src/habits/graduation.ts` returns 0
    - `grep -q "FREEZES_PER_MONTH = 2" packages/core/src/habits/streak.ts` returns 0
    - `grep -q "FREEZES_MAX_BANKED = 4" packages/core/src/habits/streak.ts` returns 0
    - `grep -q "WINDOW_DAYS = 21" packages/core/src/habits/consistency.ts` returns 0
    - `grep -q "🌱" packages/core/src/habits/graduation.ts` returns 0
    - `pnpm --filter @cited/core test -- habits` exits 0
  </acceptance_criteria>
  <done>Three pure libs covering consistency, streak rollover with freeze auto-apply, and graduation predicate — fully tested.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: check-in + archive server actions wired to streak/graduation logic</name>
  <read_first>
    - packages/core/src/habits/streak.ts (applyCheckIn signature)
    - packages/core/src/habits/graduation.ts (isGraduationReady)
    - packages/db/src/schema/check-ins.ts, streaks.ts, streak-freezes.ts, user-habits.ts
    - apps/web/app/actions/ (existing server-action patterns from Phase 1 — auth, settings)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Streak rollover + freeze auto-apply"
  </read_first>
  <behavior>
    - Test 1: checkInAction with status='done' upserts a check_ins row (UNIQUE on userHabitId+date) and updates streaks.currentLength via applyCheckIn
    - Test 2: checkInAction with note string + profile.consentFreeTextAi=false → note is dropped before DB write
    - Test 3: When applyCheckIn returns freezeApplied=true, the action consumes a freeze (decrements streak_freezes.banked - used) and returns { freezeApplied: true } so client shows gain-frame toast
    - Test 4: When isGraduationReady(...) is true, action sets user_habits.status='graduated' and graduatedAt=now() and returns { graduated: true, habitId }
    - Test 5: archiveHabitAction sets status='archived' + archivedAt=now()
  </behavior>
  <action>
    1. `apps/web/app/actions/check-in.ts`:

       ```ts
       'use server';
       import { z } from 'zod';
       import { applyCheckIn, isGraduationReady } from '@cited/core';
       import { checkIns, streaks, streakFreezes, userHabits, profiles } from '@cited/db/schema';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { and, eq, sql } from 'drizzle-orm';

       const Input = z.object({
         userHabitId: z.string().uuid(),
         status: z.enum(['done','partial','skipped']),
         mood: z.number().int().min(1).max(5).optional(),
         note: z.string().max(500).optional(),
       });

       export async function checkInAction(raw: unknown): Promise<{ freezeApplied: boolean; graduated: boolean }> {
         const input = Input.parse(raw);
         const user = await getSessionUser();
         if (!user) throw new Error('Unauthorized');
         const db = getDb();
         const today = new Date().toISOString().slice(0, 10);
         const monthYear = today.slice(0, 7);

         // Verify ownership (RLS will also enforce; defense-in-depth)
         const habit = await db.query.userHabits.findFirst({
           where: (h, { eq, and }) => and(eq(h.id, input.userHabitId), eq(h.userId, user.id)),
         });
         if (!habit) throw new Error('NotFound');

         // AUTH-05c gate for note
         const profile = await db.query.profiles.findFirst({ where: (p, { eq }) => eq(p.userId, user.id) });
         const noteToStore = profile?.consentFreeTextAi ? input.note : undefined;

         // Upsert check-in
         await db.insert(checkIns).values({
           userHabitId: input.userHabitId,
           checkInDate: today,
           status: input.status,
           mood: input.mood,
           note: noteToStore,
         }).onConflictDoUpdate({
           target: [checkIns.userHabitId, checkIns.checkInDate],
           set: { status: input.status, mood: input.mood, note: noteToStore },
         });

         // Streak + freeze logic
         const streak = await db.query.streaks.findFirst({ where: (s, { eq }) => eq(s.userHabitId, input.userHabitId) });
         const freezeRow = await db.query.streakFreezes.findFirst({
           where: (f, { eq, and }) => and(eq(f.userId, user.id), eq(f.monthYear, monthYear)),
         });
         const freezesAvailable = (freezeRow?.banked ?? 0) - (freezeRow?.used ?? 0);
         const freezeUsedThisWeek = false;   // TODO: derive from streak_freezes consumption log if shape supports it

         const result = applyCheckIn(
           {
             currentLength: streak?.currentLength ?? 0,
             longestLength: streak?.longestLength ?? 0,
             lastCheckInDate: streak?.lastCheckInDate ?? null,
             freezesAvailable,
             freezeUsedThisWeek,
           },
           input.status,
           today,
         );

         // Persist streak
         await db.insert(streaks).values({
           userHabitId: input.userHabitId,
           currentLength: result.next.currentLength,
           longestLength: result.next.longestLength,
           lastCheckInDate: today,
         }).onConflictDoUpdate({
           target: streaks.userHabitId,
           set: {
             currentLength: result.next.currentLength,
             longestLength: result.next.longestLength,
             lastCheckInDate: today,
           },
         });

         // Consume freeze
         if (result.freezeApplied) {
           await db.update(streakFreezes)
             .set({ used: sql`${streakFreezes.used} + 1` })
             .where(and(eq(streakFreezes.userId, user.id), eq(streakFreezes.monthYear, monthYear)));
         }

         // Graduation
         let graduated = false;
         if (isGraduationReady(result.next.currentLength, habit.status)) {
           await db.update(userHabits)
             .set({ status: 'graduated', graduatedAt: new Date() })
             .where(eq(userHabits.id, input.userHabitId));
           graduated = true;
         }

         return { freezeApplied: result.freezeApplied, graduated };
       }
       ```

    2. `apps/web/app/actions/archive-habit.ts`:

       ```ts
       'use server';
       import { z } from 'zod';
       import { userHabits } from '@cited/db/schema';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { and, eq } from 'drizzle-orm';

       const Input = z.object({ userHabitId: z.string().uuid() });

       export async function archiveHabitAction(raw: unknown): Promise<void> {
         const input = Input.parse(raw);
         const user = await getSessionUser();
         if (!user) throw new Error('Unauthorized');
         const db = getDb();
         await db.update(userHabits)
           .set({ status: 'archived', archivedAt: new Date(), active: false })
           .where(and(eq(userHabits.id, input.userHabitId), eq(userHabits.userId, user.id)));
       }
       ```

    3. Tests: `apps/web/app/actions/check-in.test.ts` covering 4 behaviors using a mocked db.
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- check-in</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/actions/check-in.ts`
    - `test -f apps/web/app/actions/archive-habit.ts`
    - `grep -q "applyCheckIn" apps/web/app/actions/check-in.ts` returns 0
    - `grep -q "isGraduationReady" apps/web/app/actions/check-in.ts` returns 0
    - `grep -q "consentFreeTextAi" apps/web/app/actions/check-in.ts` returns 0
    - `grep -q "status: 'graduated'" apps/web/app/actions/check-in.ts` returns 0
    - `grep -q "status: 'archived'" apps/web/app/actions/archive-habit.ts` returns 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Server actions correctly apply streak/freeze/graduation rules and gate free-text note storage.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Dashboard page + HabitCard (consistency primary, streak secondary) + CheckInSheet + GraduationToast</name>
  <read_first>
    - .planning/UI-DESIGN.md §"Habit Card" + §"Check-in + streak footer" + §"Accessibility"
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-07, D-08, D-09
    - apps/web/components/ui/dialog.tsx + tabs.tsx (shadcn primitives — dialog can serve as bottom sheet)
    - apps/web/app/(app)/dashboard/ (currently empty)
  </read_first>
  <behavior>
    - Test 1: Dashboard queries active habits for current user (userHabits.status='active') and renders one HabitCard per habit
    - Test 2: HabitCard renders ConsistencyBar BEFORE the streak number (DOM order); ConsistencyBar's font-size is larger than streak's
    - Test 3: When streak.currentLength >= 30, the streak block is NOT rendered (HAB-09)
    - Test 4: CheckInSheet renders three buttons (Done/Partial/Skip) and an expandable mood+note section; aria-roles per UI-DESIGN.md (radiogroup/radio)
    - Test 5: GraduationToast renders only when checkInAction returns { graduated: true }; offers "Archive" and "Keep tracking" — Archive calls archiveHabitAction then router.push('/onboarding/interview')
    - Test 6: Snapshot test of HabitCard — no string match for "text-red", "🔥", "lossStreak"
  </behavior>
  <action>
    1. `apps/web/app/(app)/dashboard/page.tsx` (Server Component):
       - Fetch active user_habits for current user, joined with habit_templates + first habit_template_clip + clip thumbnail
       - For each, compute consistency via `computeConsistency` from `@cited/core` using the last 21 days of check-ins
       - Pass everything pre-computed to `<HabitCard>` (server-rendered)

    2. `_components/HabitCard.tsx`:

       ```tsx
       import { ConsistencyBar } from './ConsistencyBar';
       import { StreakStrip } from './StreakStrip';
       import { CheckInSheet } from './CheckInSheet';
       import type { Consistency } from '@cited/core';

       type Props = {
         habit: { id: string; title: string; domain: string; speaker: string; clipThumbnailUrl: string };
         consistency: Consistency;
         streak: { currentLength: number; longestLength: number; freezesAvailable: number };
       };

       export function HabitCard({ habit, consistency, streak }: Props) {
         const hideStreak = streak.currentLength >= 30;     // HAB-09
         return (
           <article className="bg-[var(--color-paper)] rounded-[var(--radius-xl)] border border-[var(--color-rule)] p-[26px] shadow-[var(--shadow-card)]">
             {/* PRIMARY — consistency bar */}
             <ConsistencyBar days={consistency.last21Days} />
             <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-ink-3)] mt-3">
               {consistency.done}/{21} LAST 3 WEEKS
             </div>
             <h3 className="font-newsreader text-[24px] mt-3 leading-tight">{habit.title}</h3>
             {/* SECONDARY — streak strip (hidden ≥ 30) */}
             {!hideStreak && <StreakStrip streak={streak} />}
             <CheckInSheet userHabitId={habit.id} />
           </article>
         );
       }
       ```

    3. `_components/ConsistencyBar.tsx` — 21-cell `grid-cols-[repeat(21,1fr)] gap-[3px]`; cell states per UI-DESIGN.md (on=sage, half=mid-sage, pending=dashed accent outline, missed/empty=`bg-[var(--color-paper-3)]`). Each cell has `aria-label="{date}: {status}"`.

    4. `_components/StreakStrip.tsx`:
       - Number row: Newsreader 30px "{currentLength}" + 16px ink-3 "/21"
       - Freeze pill: paper-2 bg, snowflake SVG (inline, 1.5 stroke), "{freezesAvailable} freezes available"
       - NO red, NO flame emoji

    5. `_components/CheckInSheet.tsx`:
       - Trigger button (e.g. ghost "Check in" capsule)
       - Bottom sheet using Radix Dialog (positioned at bottom)
       - role="radiogroup" with three role="radio" buttons: Done | Partial | Skip
       - Active state per UI-DESIGN.md: Done → accent fill; Partial → mid-sage; Skip → ink-3 fill
       - Expand-arrow reveals mood (1–5 pills) + note textarea
       - Submit calls `checkInAction` server action; on result.freezeApplied → toast.success('1 freeze used — streak preserved'); on result.graduated → show `<GraduationToast />`

    6. `_components/GraduationToast.tsx` — sonner toast/dialog with:
       - Message: "This habit may now be part of your life 🌱" (verbatim from D-09, GRADUATION_MESSAGE constant)
       - Two buttons: "Archive habit" (calls archiveHabitAction, then router.push('/onboarding/interview')) and "Keep tracking" (close)

    7. Tests:
       - `HabitCard.test.tsx` — render with `streak.currentLength=10` → StreakStrip visible; with `currentLength=30` → not visible
       - Snapshot test that asserts no red color and no flame emoji
       - `CheckInSheet.test.tsx` — radiogroup roles + clicking Done invokes checkInAction
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- dashboard</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/\(app\)/dashboard/page.tsx`
    - `test -f apps/web/app/\(app\)/dashboard/_components/HabitCard.tsx`
    - `test -f apps/web/app/\(app\)/dashboard/_components/ConsistencyBar.tsx`
    - `test -f apps/web/app/\(app\)/dashboard/_components/CheckInSheet.tsx`
    - `test -f apps/web/app/\(app\)/dashboard/_components/GraduationToast.tsx`
    - `grep -rE "text-red-|bg-red-|🔥" apps/web/app/\(app\)/dashboard/` returns 1 (no matches — Pitfall 5)
    - `grep -q "currentLength >= 30" apps/web/app/\(app\)/dashboard/_components/HabitCard.tsx` returns 0
    - `grep -q "role=\"radiogroup\"" apps/web/app/\(app\)/dashboard/_components/CheckInSheet.tsx` returns 0
    - `grep -q "GRADUATION_MESSAGE\|This habit may now be part of your life" apps/web/app/\(app\)/dashboard/_components/GraduationToast.tsx` returns 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Dashboard renders with consistency-first cards; tri-state check-in works with freeze auto-apply + graduation toast.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Visual verification of dashboard + check-in + graduation flows</name>
  <what-built>Dashboard with HabitCard (consistency primary, streak secondary), CheckInSheet bottom-sheet (tri-state + optional mood/note), streak freeze auto-apply + gain-frame toast, graduation at 21 successes + archive prompt.</what-built>
  <how-to-verify>
    1. Seed a user via the Plan 03-04 onboarding flow (or DB seed) so user_habits has 2-3 active rows
    2. Visit `/dashboard` — verify:
       - Each habit card shows the 21-cell consistency bar at TOP (larger visual)
       - Streak number is BELOW and smaller
       - Missed/empty cells = muted neutral paper-3 (NOT red)
       - Today's empty cell = dashed sage outline (pending)
    3. Click "Check in" on a habit — bottom sheet opens with three buttons (Done/Partial/Skip)
    4. Click Done — sheet closes, today's cell becomes sage (on), streak count increments by 1
    5. Click expand-arrow inside sheet — mood pills (1-5) and note textarea appear
    6. As OPT-OUT user (AUTH-05c=false): verify note textarea is hidden OR submitting note shows it wasn't stored (DB check)
    7. Skip a day (via DB date manipulation or wait): next check-in should auto-apply a freeze if available; toast "1 freeze used — streak preserved" appears in sage style
    8. Continue check-ins until currentLength = 21: graduation toast appears with message "This habit may now be part of your life 🌱" and two buttons
    9. Click "Archive habit" → user_habits.status='archived' in DB, redirected to /onboarding/interview
    10. Confirm a habit with currentLength >= 30 hides its streak block on the card (still shown on detail page — that's Plan 03-06)
    11. Visual: NO red anywhere, NO flame emoji, NO "broken streak" copy
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
  <action>Pause for human verification. Follow the steps in &lt;how-to-verify&gt;; do not proceed until the user responds with the resume-signal.</action>
  <verify>Human confirms each step of &lt;how-to-verify&gt; passes; reports issues otherwise.</verify>
  <done>User types "approved" (or "approved + loom recorded ..." for the Loom step) and Claude resumes execution.</done>
</task>

</tasks>

<verification>
- consistency / streak / graduation libs: 11+ tests pass
- check-in action correctly applies freeze + graduation
- Dashboard renders with consistency primary
</verification>

<success_criteria>
Daily check-in flow works end-to-end with: tri-state, optional mood/note (AUTH-05c-gated), streak freeze auto-apply (gain-frame), 21-success graduation, archive→re-run path. No loss-frame UI artifacts.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-05-SUMMARY.md` with: lib signatures, action signatures, component tree, screenshots from checkpoint.
</output>
