'use server';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { eq, interviewRuns } from '@cited/db';

/**
 * REC-06: Creates a new interview_runs row with run_index = max(existing) + 1.
 * Never overwrites existing runs — each interview attempt gets its own row.
 */
export async function startInterviewAction(): Promise<{ runId: string; runIndex: number }> {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const db = getDb();
  const last = await db.query.interviewRuns.findFirst({
    where: eq(interviewRuns.userId, user.id),
    orderBy: (r, { desc }) => desc(r.runIndex),
  });
  const nextIndex = (last?.runIndex ?? 0) + 1;
  const [row] = await db
    .insert(interviewRuns)
    .values({
      userId: user.id,
      runIndex: nextIndex,
    })
    .returning({ id: interviewRuns.id, runIndex: interviewRuns.runIndex });

  if (!row) throw new Error('Failed to create interview run');
  return { runId: row.id, runIndex: row.runIndex };
}
