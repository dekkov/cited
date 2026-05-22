import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { HabitCandidateSchema } from '@cited/core';
import type { HabitCandidate } from '@cited/core';
import { and, clips, eq, habitTemplateClips, inArray, interviewRuns, isNull } from '@cited/db';
/**
 * Recommendations page (Server Component).
 *
 * Receives runId from search params; fetches candidatesJson from interview_runs
 * (RLS scopes to owner). For each candidate, resolves its habit_template UUID via
 * the first citation's clipId joined through habit_template_clips — we do not trust
 * LLM-produced templateSlug to match anything in the DB.
 *
 * Enriches each citation with youtubeVideoId + startSeconds from the clips table
 * so AdoptHabitCard can render the YouTubeEmbed.
 */
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AdoptBoard } from './_components/AdoptBoard';

interface SearchParams {
  runId?: string;
}

interface EnrichedCitation {
  clipId: string;
  claim: string;
  speaker: string;
  youtubeVideoId?: string | undefined;
  startSeconds?: number | undefined;
}

interface EnrichedCandidate extends HabitCandidate {
  citations: EnrichedCitation[];
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { runId } = await searchParams;
  if (!runId) redirect('/onboarding/interview');

  const db = getDb();

  // Fetch the interview run (RLS scopes to owner at DB level)
  const run = await db.query.interviewRuns.findFirst({
    where: and(eq(interviewRuns.id, runId), eq(interviewRuns.userId, user.id)),
  });

  if (!run || !run.candidatesJson) {
    console.warn('[recommendations] redirect → interview: run or candidatesJson missing', {
      runId,
      runFound: !!run,
      hasCandidatesJson: !!run?.candidatesJson,
      completedAt: run?.completedAt,
    });
    redirect('/onboarding/interview');
  }

  // Parse candidates from JSON
  const candidatesResult = z.array(HabitCandidateSchema).safeParse(run.candidatesJson);
  if (!candidatesResult.success) {
    console.warn('[recommendations] redirect → interview: schema parse failed', {
      runId,
      errors: candidatesResult.error.issues,
    });
    redirect('/onboarding/interview');
  }
  const candidates: HabitCandidate[] = candidatesResult.data;

  // Collect all clip IDs from candidates
  const allClipIds = candidates.flatMap((c) => c.citations.map((ci) => ci.clipId));
  const uniqueClipIds = [...new Set(allClipIds)];

  // Fetch clip metadata (youtubeVideoId, startSeconds) for each citation
  const clipRows =
    uniqueClipIds.length > 0
      ? await db
          .select({
            id: clips.id,
            youtubeVideoId: clips.youtubeVideoId,
            startSeconds: clips.startSeconds,
          })
          .from(clips)
          .where(
            and(
              inArray(clips.id, uniqueClipIds),
              eq(clips.status, 'approved'),
              isNull(clips.removedAt),
            ),
          )
      : [];

  const clipMap = new Map(clipRows.map((r) => [r.id, r]));

  // Enrich candidates with video metadata
  const enrichedCandidates: EnrichedCandidate[] = candidates.map((c) => ({
    ...c,
    citations: c.citations.map((ci) => {
      const clipData = clipMap.get(ci.clipId);
      return {
        ...ci,
        youtubeVideoId: clipData?.youtubeVideoId,
        startSeconds: clipData?.startSeconds,
      };
    }),
  }));

  // Map each candidate → habit_template via its first citation's clipId (clips ↔ templates
  // is a real DB junction). We do NOT trust LLM-produced templateSlug to match anything.
  const clipTemplateRows =
    uniqueClipIds.length > 0
      ? await db
          .select({
            clipId: habitTemplateClips.clipId,
            habitTemplateId: habitTemplateClips.habitTemplateId,
          })
          .from(habitTemplateClips)
          .where(inArray(habitTemplateClips.clipId, uniqueClipIds))
      : [];

  const clipToTemplateId = new Map(clipTemplateRows.map((r) => [r.clipId, r.habitTemplateId]));

  // Per-candidate habitTemplateId, indexed by candidate position (preserves duplicates).
  const candidateHabitTemplateIds: (string | null)[] = enrichedCandidates.map((c) => {
    const firstClipId = c.citations[0]?.clipId;
    return firstClipId ? (clipToTemplateId.get(firstClipId) ?? null) : null;
  });

  if (enrichedCandidates.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 bg-[var(--color-paper)] px-5 py-10 text-center">
        <h1 className="font-[family-name:var(--font-newsreader)] text-3xl text-[var(--color-ink)]">
          No recommendations yet
        </h1>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-[var(--color-ink-4)]">
          The habit corpus doesn&apos;t have enough approved clips to generate personalised
          recommendations for your profile. Ask an admin to approve some clips, then re-run the
          interview from{' '}
          <a href="/settings" className="underline">
            Settings
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <AdoptBoard candidates={enrichedCandidates} habitTemplateIds={candidateHabitTemplateIds} />
  );
}
