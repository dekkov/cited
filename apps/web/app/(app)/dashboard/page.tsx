import { requireUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { computeConsistency } from '@cited/core';
import {
  and,
  checkIns,
  clips,
  eq,
  habitTemplateClips,
  habitTemplates,
  interviewRuns,
  isNotNull,
  isNull,
  streakFreezes,
  userHabits,
} from '@cited/db';
import { redirect } from 'next/navigation';
import { HabitCard } from './_components/HabitCard';

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();

  // Guard: redirect new users who have never finished onboarding
  const completedRun = await db.query.interviewRuns.findFirst({
    where: and(eq(interviewRuns.userId, user.id), isNotNull(interviewRuns.completedAt)),
    columns: { id: true },
  });
  if (!completedRun) redirect('/onboarding/interview');

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Fetch all active habits for the current user, joined with templates + first clip
  const activeHabits = await db
    .select({
      habitId: userHabits.id,
      habitStatus: userHabits.status,
      templateTitle: habitTemplates.title,
      templateDomain: habitTemplates.domain,
      clipSpeaker: clips.speaker,
      clipYoutubeVideoId: clips.youtubeVideoId,
    })
    .from(userHabits)
    .innerJoin(habitTemplates, eq(userHabits.habitTemplateId, habitTemplates.id))
    .leftJoin(habitTemplateClips, eq(habitTemplateClips.habitTemplateId, habitTemplates.id))
    .leftJoin(
      clips,
      and(eq(habitTemplateClips.clipId, clips.id), eq(habitTemplateClips.position, 0)),
    )
    .where(and(eq(userHabits.userId, user.id), eq(userHabits.status, 'active')))
    .orderBy(userHabits.createdAt);

  // Compute 21-day window start date
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - 21);
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  // For each habit, fetch check-ins and streak
  const habitCards = await Promise.all(
    activeHabits.map(async (habit) => {
      // Fetch check-ins for the last 21 days
      const recentCheckIns = await db
        .select({
          date: checkIns.checkInDate,
          status: checkIns.status,
        })
        .from(checkIns)
        .where(and(eq(checkIns.userHabitId, habit.habitId), eq(checkIns.userId, user.id)));

      // Filter to window (last 21 days) — DB-level filtering via gte would be ideal
      // but simple filtering here is sufficient for MVP (max 21 records)
      const windowCheckIns = recentCheckIns.filter((ci) => ci.date >= windowStartStr);

      const consistency = computeConsistency(
        windowCheckIns.map((ci) => ({ date: ci.date, status: ci.status })),
        today,
      );

      const todayCheckIn = recentCheckIns.find((ci) => ci.date === todayStr) ?? null;

      // Fetch streak
      const streakRow = await db.query.streaks.findFirst({
        where: (s, { eq }) => eq(s.userHabitId, habit.habitId),
      });

      // Fetch available freezes
      const availableFreezes = await db
        .select()
        .from(streakFreezes)
        .where(
          and(
            eq(streakFreezes.userId, user.id),
            eq(streakFreezes.userHabitId, habit.habitId),
            isNull(streakFreezes.usedAt),
          ),
        );

      return {
        habit: {
          id: habit.habitId,
          title: habit.templateTitle,
          domain: habit.templateDomain,
          speaker: habit.clipSpeaker ?? 'Speaker',
          clipThumbnailUrl: habit.clipYoutubeVideoId
            ? `https://img.youtube.com/vi/${habit.clipYoutubeVideoId}/hqdefault.jpg`
            : '',
        },
        consistency,
        streak: {
          currentLength: streakRow?.currentLength ?? 0,
          longestLength: streakRow?.longestLength ?? 0,
          freezesAvailable: availableFreezes.length,
        },
        todayCheckIn: todayCheckIn ? { status: todayCheckIn.status } : null,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[family-name:var(--font-newsreader)] text-[28px] leading-tight text-[var(--color-ink)]">
          Your habits
        </h1>
        <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--color-ink-3)] uppercase">
          {todayStr}
        </p>
      </div>

      {habitCards.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-paper-2)] p-8 text-center">
          <p className="font-[family-name:var(--font-newsreader)] text-[18px] text-[var(--color-ink-2)]">
            No active habits yet.
          </p>
          <a
            href="/onboarding/interview"
            className="mt-4 inline-block font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-accent-deep)] underline underline-offset-2"
          >
            Start the onboarding interview
          </a>
        </div>
      ) : (
        <div className="grid gap-4">
          {habitCards.map(({ habit, consistency, streak, todayCheckIn }) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              consistency={consistency}
              streak={streak}
              todayCheckIn={todayCheckIn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
