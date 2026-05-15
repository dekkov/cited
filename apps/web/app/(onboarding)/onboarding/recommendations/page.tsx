/**
 * Recommendations page (Server Component).
 *
 * Receives runId from search params; fetches candidatesJson from interview_runs
 * (RLS scopes to owner). Also looks up habit_templates to build a
 * templateSlug → habitTemplateId map for finalizeInterviewAction.
 *
 * Enriches each citation with youtubeVideoId + startSeconds from the clips table
 * so HabitCandidateCard can render the YouTubeEmbed.
 */
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { interviewRuns, clips, habitTemplates, eq, and, inArray, isNull } from '@cited/db';
import { HabitCandidateSchema } from '@cited/core';
import type { HabitCandidate } from '@cited/core';
import { z } from 'zod';
import { RecommendationStack } from './_components/RecommendationStack';

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
    where: and(
      eq(interviewRuns.id, runId),
      eq(interviewRuns.userId, user.id),
    ),
  });

  if (!run || !run.candidatesJson) {
    // Run not found or synthesis not complete yet — redirect back
    redirect('/onboarding/interview');
  }

  // Parse candidates from JSON
  const candidatesResult = z.array(HabitCandidateSchema).safeParse(run.candidatesJson);
  if (!candidatesResult.success) {
    // Data integrity error — redirect to re-run
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

  // Build templateSlug → habitTemplateId map for finalizeInterviewAction
  const slugs = candidates.map((c) => c.templateSlug);
  const templateRows =
    slugs.length > 0
      ? await db
          .select({ id: habitTemplates.id, slug: habitTemplates.slug })
          .from(habitTemplates)
          .where(inArray(habitTemplates.slug, slugs))
      : [];

  const templateIdMap = Object.fromEntries(templateRows.map((r) => [r.slug, r.id]));

  if (enrichedCandidates.length === 0) notFound();

  return (
    <RecommendationStack candidates={enrichedCandidates} templateIdMap={templateIdMap} />
  );
}
