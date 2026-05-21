'use server';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { and, eq, userHabits } from '@cited/db';

/**
 * Adopts a single habit template for the signed-in user, from a public /h/[slug] page.
 *
 * Idempotent: if the user has already adopted this template (any status), it is a no-op.
 * There is no unique constraint on (user_id, habit_template_id), so we guard with a read.
 */
export async function adoptHabitTemplateAction(
  habitTemplateId: string,
): Promise<{ adopted: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const db = getDb();

  const existing = await db
    .select({ id: userHabits.id })
    .from(userHabits)
    .where(and(eq(userHabits.userId, user.id), eq(userHabits.habitTemplateId, habitTemplateId)))
    .limit(1);

  if (existing.length > 0) return { adopted: true };

  await db.insert(userHabits).values({
    userId: user.id,
    habitTemplateId,
    frequency: 'daily' as const,
    status: 'active' as const,
    active: true,
  });

  return { adopted: true };
}
