'use server';

import { z } from 'zod';
import { userHabits, and, eq } from '@cited/db';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';

const Input = z.object({
  userHabitId: z.string().uuid(),
  newTemplateId: z.string().uuid(),
});

/**
 * SWAP-04: Replace user_habits.habit_template_id with the chosen swap candidate.
 * Ownership is verified — only the habit's owner can swap it.
 *
 * Note: check_ins and streaks are NOT reset here — they are specific to the user habit row,
 * not the template. This is intentional: the streak is a measure of the user's consistency
 * behavior, not the specific habit content. Resetting would penalize the user for swapping.
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
}
