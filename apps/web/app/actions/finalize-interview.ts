'use server';
import { userHabits } from '@cited/db';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';
import type { HabitCandidate } from '@cited/core';

/**
 * Bulk-inserts user_habits rows from accepted candidates after swipe stack (Plan 03-04).
 * Each accepted candidate maps to a user_habits row in 'active' status.
 * Called after the user has swiped through the habit candidates and accepted some.
 */
export async function finalizeInterviewAction(
  acceptedCandidates: readonly Pick<HabitCandidate, 'templateSlug'>[],
  templateIdMap: Readonly<Record<string, string>>,  // templateSlug → habitTemplateId (UUID)
): Promise<{ inserted: number }> {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  if (acceptedCandidates.length === 0) return { inserted: 0 };

  const db = getDb();
  const values = acceptedCandidates
    .map(({ templateSlug }) => templateIdMap[templateSlug])
    .filter((id): id is string => id !== undefined)
    .map((habitTemplateId) => ({
      userId: user.id,
      habitTemplateId,
      frequency: 'daily' as const,
      status: 'active' as const,
      active: true,
    }));

  if (values.length === 0) return { inserted: 0 };

  await db.insert(userHabits).values(values);
  return { inserted: values.length };
}
