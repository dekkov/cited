'use server';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { applyCheckIn, isGraduationReady } from '@cited/core';
import { and, checkIns, eq, streakFreezes, streaks, userHabits } from '@cited/db';
import { z } from 'zod';

const Input = z.object({
  userHabitId: z.string().uuid(),
  status: z.enum(['done', 'partial', 'skipped']),
  mood: z.number().int().min(1).max(5).optional(),
  note: z.string().max(500).optional(),
});

export type CheckInResult = {
  readonly freezeApplied: boolean;
  readonly graduated: boolean;
};

export async function checkInAction(raw: unknown): Promise<CheckInResult> {
  const input = Input.parse(raw);
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // Verify ownership (defense-in-depth; RLS also enforces)
  const habit = await db.query.userHabits.findFirst({
    where: (h, { eq, and }) => and(eq(h.id, input.userHabitId), eq(h.userId, user.id)),
  });
  if (!habit) throw new Error('NotFound');

  // One check-in per habit per day. Reject re-attempts instead of silently overwriting.
  const existing = await db.query.checkIns.findFirst({
    where: (c, { eq, and }) => and(eq(c.userHabitId, input.userHabitId), eq(c.checkInDate, today)),
    columns: { id: true },
  });
  if (existing) throw new Error('AlreadyCheckedIn');

  // AUTH-05c gate: check ai_free_text consent before storing note
  const consentRecord = await db.query.consentRecords.findFirst({
    where: (c, { eq, and }) =>
      and(eq(c.userId, user.id), eq(c.scope, 'ai_free_text'), eq(c.granted, true)),
  });
  const noteToStore = consentRecord?.granted ? input.note : undefined;

  // Insert today's check-in. We guarded above for duplicates; the UNIQUE on
  // (userHabitId, checkInDate) is a final safety net.
  await db.insert(checkIns).values({
    userHabitId: input.userHabitId,
    userId: user.id,
    checkInDate: today,
    status: input.status,
    mood: input.mood ?? null,
    note: noteToStore ?? null,
  });

  // Load current streak state
  const streak = await db.query.streaks.findFirst({
    where: (s, { eq }) => eq(s.userHabitId, input.userHabitId),
  });

  // Load available freezes: rows where usedAt IS NULL for this user
  const availableFreezeRows = await db.query.streakFreezes.findMany({
    where: (f, { eq, and, isNull }) =>
      and(eq(f.userId, user.id), eq(f.userHabitId, input.userHabitId), isNull(f.usedAt)),
  });

  // Check if a freeze was used this week (any usedAt within the past 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const usedThisWeekRows = await db.query.streakFreezes.findMany({
    where: (f, { eq, and }) => and(eq(f.userId, user.id), eq(f.userHabitId, input.userHabitId)),
  });
  const freezeUsedThisWeek = usedThisWeekRows.some(
    (row) => row.usedAt !== null && new Date(row.usedAt) > oneWeekAgo,
  );

  const freezesAvailable = availableFreezeRows.length;

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

  // Persist streak (upsert on userHabitId unique)
  await db
    .insert(streaks)
    .values({
      userHabitId: input.userHabitId,
      userId: user.id,
      currentLength: result.next.currentLength,
      longestLength: result.next.longestLength,
      lastCheckInDate: today,
    })
    .onConflictDoUpdate({
      target: streaks.userHabitId,
      set: {
        currentLength: result.next.currentLength,
        longestLength: result.next.longestLength,
        lastCheckInDate: today,
      },
    });

  // Consume oldest available freeze if needed
  if (result.freezeApplied && availableFreezeRows.length > 0) {
    const oldestFreeze = availableFreezeRows[0];
    if (oldestFreeze) {
      await db
        .update(streakFreezes)
        .set({ usedAt: new Date() })
        .where(and(eq(streakFreezes.id, oldestFreeze.id)));
    }
  }

  // Check for graduation (only after streak is updated with the new length)
  let graduated = false;
  if (isGraduationReady(result.next.currentLength, habit.status)) {
    await db
      .update(userHabits)
      .set({ status: 'graduated', graduatedAt: new Date() })
      .where(eq(userHabits.id, input.userHabitId));
    graduated = true;
  }

  return { freezeApplied: result.freezeApplied, graduated };
}
