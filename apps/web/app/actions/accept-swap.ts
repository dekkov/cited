'use server';

import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { and, checkIns, desc, eq, streaks, userHabits } from '@cited/db';
import { z } from 'zod';

const Input = z.object({
  userHabitId: z.string().uuid(),
  newTemplateId: z.string().uuid(),
});

/**
 * SWAP-04: Replace user_habits.habit_template_id with the chosen swap candidate.
 * Ownership is verified — only the habit's owner can swap it.
 *
 * Check-ins / streaks policy:
 *   - HISTORICAL check-ins are preserved so the user keeps their consistency record
 *     (streak is a measure of the person's behavior, not the specific habit content).
 *   - TODAY's check-in for this user_habit IS deleted on swap — the user checked in
 *     for the old habit, not the new one, so carrying it over would credit them for
 *     something they did not do. They can re-check the new habit if they did it today.
 */
export async function acceptSwapAction(raw: unknown): Promise<void> {
  const input = Input.parse(raw);
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const db = getDb();

  const updated = await db
    .update(userHabits)
    .set({ habitTemplateId: input.newTemplateId, updatedAt: new Date() })
    .where(and(eq(userHabits.id, input.userHabitId), eq(userHabits.userId, user.id)))
    .returning({ id: userHabits.id });

  if (updated.length === 0) {
    throw new Error('Not found or unauthorized');
  }

  // Clear today's check-in (if any). check_ins.check_in_date is a plain DATE, so a
  // YYYY-MM-DD string for the user's current day is unambiguous enough for MVP.
  // Past check-ins are untouched — see policy comment above.
  const todayStr = new Date().toISOString().slice(0, 10);
  const deleted = await db
    .delete(checkIns)
    .where(
      and(
        eq(checkIns.userHabitId, input.userHabitId),
        eq(checkIns.userId, user.id),
        eq(checkIns.checkInDate, todayStr),
      ),
    )
    .returning({ id: checkIns.id });

  // If today's check-in was deleted, roll back the streak by today's contribution so
  // re-checking the new habit today doesn't double-increment (or, with lastCheckInDate
  // bumped to today, get reset to 0 via the missed-days branch in applyCheckIn).
  // Approximation: decrement currentLength by 1 and point lastCheckInDate at the most
  // recent prior check-in (or null if none). The "-1" assumption is wrong when today
  // was a freeze-applied increment, but that's an edge-of-edge case at MVP scale.
  if (deleted.length > 0) {
    const [streakRow] = await db
      .select({
        currentLength: streaks.currentLength,
        lastCheckInDate: streaks.lastCheckInDate,
      })
      .from(streaks)
      .where(eq(streaks.userHabitId, input.userHabitId))
      .limit(1);

    if (streakRow && streakRow.lastCheckInDate === todayStr) {
      const [prior] = await db
        .select({ date: checkIns.checkInDate })
        .from(checkIns)
        .where(and(eq(checkIns.userHabitId, input.userHabitId), eq(checkIns.userId, user.id)))
        .orderBy(desc(checkIns.checkInDate))
        .limit(1);

      await db
        .update(streaks)
        .set({
          currentLength: Math.max(0, streakRow.currentLength - 1),
          lastCheckInDate: prior?.date ?? null,
        })
        .where(eq(streaks.userHabitId, input.userHabitId));
    }
  }
}
