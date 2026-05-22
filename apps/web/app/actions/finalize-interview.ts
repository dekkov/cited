'use server';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { userHabits } from '@cited/db';

/**
 * Bulk-inserts user_habits rows from accepted candidates after the swipe stack.
 * Each accepted candidate carries its resolved habitTemplateId (UUID) — the recommendations
 * page resolves this from each candidate's first citation clip via habit_template_clips,
 * so the function does not depend on LLM-produced slugs matching anything.
 */
export async function finalizeInterviewAction(
  accepted: ReadonlyArray<{ habitTemplateId: string }>,
): Promise<{ inserted: number }> {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  if (accepted.length === 0) return { inserted: 0 };

  const db = getDb();
  const values = accepted.map(({ habitTemplateId }) => ({
    userId: user.id,
    habitTemplateId,
    frequency: 'daily' as const,
    status: 'active' as const,
    active: true,
  }));

  await db.insert(userHabits).values(values);
  return { inserted: values.length };
}
