'use server';
import { z } from 'zod';
import { userHabits, eq, and } from '@cited/db';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';

const Input = z.object({ userHabitId: z.string().uuid() });

export async function archiveHabitAction(raw: unknown): Promise<void> {
  const input = Input.parse(raw);
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const db = getDb();
  await db
    .update(userHabits)
    .set({ status: 'archived', archivedAt: new Date(), active: false })
    .where(and(eq(userHabits.id, input.userHabitId), eq(userHabits.userId, user.id)));
}
