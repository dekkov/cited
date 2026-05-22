import { requireUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import {
  and,
  clips,
  episodes,
  eq,
  habitTemplateClips,
  habitTemplates,
  userHabits,
} from '@cited/db';
import { notFound } from 'next/navigation';
import { HabitDetail } from './_components/HabitDetail';

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const db = getDb();

  // Verify ownership + fetch template
  const [habitRow] = await db
    .select({
      habitId: userHabits.id,
      habitTemplateId: userHabits.habitTemplateId,
      templateId: habitTemplates.id,
      templateTitle: habitTemplates.title,
      templateDescription: habitTemplates.description,
      templateDomain: habitTemplates.domain,
      templateTrigger: habitTemplates.trigger,
      templateTinyAction: habitTemplates.tinyAction,
      templateClusterId: habitTemplates.clusterId,
    })
    .from(userHabits)
    .innerJoin(habitTemplates, eq(userHabits.habitTemplateId, habitTemplates.id))
    .where(and(eq(userHabits.id, id), eq(userHabits.userId, user.id)))
    .limit(1);

  if (!habitRow) notFound();

  // Fetch the first clip + episode (ordered by position)
  const [clipRow] = await db
    .select({
      clipId: clips.id,
      clipClaim: clips.claim,
      clipRationale: clips.rationale,
      clipSpeaker: clips.speaker,
      clipSpeakerStatus: clips.speakerStatus,
      clipRiskFlags: clips.riskFlags,
      clipStartSeconds: clips.startSeconds,
      clipEndSeconds: clips.endSeconds,
      clipYoutubeVideoId: clips.youtubeVideoId,
      episodeTitle: episodes.title,
      episodePublishedAt: episodes.publishedAt,
    })
    .from(habitTemplateClips)
    .innerJoin(clips, eq(habitTemplateClips.clipId, clips.id))
    .innerJoin(episodes, eq(clips.episodeId, episodes.id))
    .where(eq(habitTemplateClips.habitTemplateId, habitRow.templateId))
    .orderBy(habitTemplateClips.position)
    .limit(1);

  return (
    <HabitDetail
      habitId={id}
      template={{
        id: habitRow.templateId,
        title: habitRow.templateTitle,
        description: habitRow.templateDescription ?? null,
        domain: habitRow.templateDomain,
        trigger: habitRow.templateTrigger ?? null,
        tinyAction: habitRow.templateTinyAction ?? null,
        clusterId: habitRow.templateClusterId ?? null,
      }}
      clip={
        clipRow
          ? {
              id: clipRow.clipId,
              claim: clipRow.clipClaim,
              rationale: clipRow.clipRationale ?? null,
              speaker: clipRow.clipSpeaker,
              speakerStatus: clipRow.clipSpeakerStatus,
              riskFlags: clipRow.clipRiskFlags,
              startSeconds: clipRow.clipStartSeconds,
              endSeconds: clipRow.clipEndSeconds,
              youtubeVideoId: clipRow.clipYoutubeVideoId,
              episode: {
                title: clipRow.episodeTitle ?? null,
                publishedAt: clipRow.episodePublishedAt?.toISOString() ?? null,
              },
            }
          : null
      }
    />
  );
}
