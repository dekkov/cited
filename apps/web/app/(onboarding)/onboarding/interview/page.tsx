/**
 * Interview page (Server Component).
 *
 * - Requires a signed-in user (redirects to /login if not).
 * - Finds an in-progress interview run, or starts one via startInterviewAction.
 * - Reads auth consent for AI free-text (AUTH-05c) from profiles.
 * - Passes runId + freeTextOptIn down to InterviewFlow (client component).
 */
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { interviewRuns, userHabits, consentRecords, eq, and, isNull } from '@cited/db';
import { startInterviewAction } from '@/app/actions/start-interview';
import { InterviewFlow } from './_components/InterviewFlow';

export default async function InterviewPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const db = getDb();

  // Guard: if user already has habits they've completed the interview — send to dashboard
  const existingHabit = await db.query.userHabits.findFirst({ where: eq(userHabits.userId, user.id) });
  if (existingHabit) redirect('/dashboard');

  // AUTH-05c: check consent for LLM free-text analysis
  const consentRecord = await db.query.consentRecords.findFirst({
    where: and(
      eq(consentRecords.userId, user.id),
      eq(consentRecords.scope, 'ai_free_text'),
    ),
  });
  const freeTextOptIn = consentRecord?.granted === true;

  // Find an in-progress run (completedAt is null)
  const existing = await db.query.interviewRuns.findFirst({
    where: and(
      eq(interviewRuns.userId, user.id),
      isNull(interviewRuns.completedAt),
    ),
    orderBy: (r, { desc }) => desc(r.runIndex),
  });

  let runId: string;
  if (existing) {
    runId = existing.id;
  } else {
    const started = await startInterviewAction();
    runId = started.runId;
  }

  return <InterviewFlow runId={runId} freeTextOptIn={freeTextOptIn} />;
}
