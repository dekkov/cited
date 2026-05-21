'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { getDb } from '@/lib/db';
import { clipEdits, clips, episodeBlacklist, episodes, eq, habitTemplateClips } from '@cited/db';
import { z } from 'zod';

function db() {
  return getDb();
}

const schema = z.object({
  episodeId: z.string().uuid(),
  reason: z.enum(['dmca', 'speaker-request', 'medical-risk', 'other']),
  notes: z.string().optional(),
  takedownRefUrl: z.string().url().optional(),
});

export type RemoveEpisodeAndBlacklistInput = z.infer<typeof schema>;

export async function removeEpisodeAndBlacklist(input: RemoveEpisodeAndBlacklistInput) {
  const user = await getSessionUser();
  if (!user || !(['curator', 'admin'] as const).includes(user.role as 'curator' | 'admin')) {
    throw new Error('forbidden');
  }
  const parsed = schema.parse(input);

  return await db().transaction(async (tx) => {
    const [ep] = await tx.select().from(episodes).where(eq(episodes.id, parsed.episodeId));
    if (!ep) throw new Error('episode not found');

    // Insert blacklist row — idempotent via onConflictDoNothing
    await tx
      .insert(episodeBlacklist)
      .values({
        youtubeVideoId: ep.youtubeVideoId,
        reason: parsed.reason,
        notes: parsed.notes ?? null,
        takedownRefUrl: parsed.takedownRefUrl ?? null,
      })
      .onConflictDoNothing();

    // Mark episode as removed
    await tx
      .update(episodes)
      .set({
        availability: 'removed_from_source',
        sourceUnavailableAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, parsed.episodeId));

    // Cascade soft-delete all linked clips
    const affectedClips = await tx
      .update(clips)
      .set({
        removedAt: new Date(),
        removalReason: parsed.reason,
        removalNotes: parsed.notes ?? null,
        takedownRefUrl: parsed.takedownRefUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(clips.episodeId, parsed.episodeId))
      .returning();

    // Per-clip audit: delete habit_template_clips + write clip_edits
    for (const c of affectedClips) {
      const affectedJoins = await tx
        .delete(habitTemplateClips)
        .where(eq(habitTemplateClips.clipId, c.id))
        .returning();

      await tx.insert(clipEdits).values({
        clipId: c.id,
        actorId: user.id,
        source: 'manual',
        field: 'status',
        action: 'removed',
        payload: {
          reason: parsed.reason,
          notes: parsed.notes ?? null,
          takedownRefUrl: parsed.takedownRefUrl ?? null,
          cascadedFromEpisodeId: parsed.episodeId,
          affectedHabitTemplateCount: affectedJoins.length,
        },
      });
    }

    return { affectedClipCount: affectedClips.length };
  });
}
