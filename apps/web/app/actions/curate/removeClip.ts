'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { clipEdits, clips, createDb, eq, habitTemplateClips } from '@cited/db';
import { z } from 'zod';

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

const removeClipSchema = z
  .object({
    clipId: z.string().uuid(),
    reason: z.enum(['dmca', 'factual-error', 'medical-risk', 'speaker-request', 'other']),
    notes: z.string().optional(),
    takedownRefUrl: z.string().url().optional(),
  })
  .refine((d) => d.reason !== 'dmca' || !!d.takedownRefUrl, {
    message: 'takedownRefUrl is required when reason=dmca',
  });

export type RemoveClipInput = z.infer<typeof removeClipSchema>;

export async function removeClip(input: RemoveClipInput) {
  const user = await getSessionUser();
  if (!user || !(['curator', 'admin'] as const).includes(user.role as 'curator' | 'admin')) {
    throw new Error('forbidden');
  }
  const parsed = removeClipSchema.parse(input);

  return await db().transaction(async (tx) => {
    const [clip] = await tx
      .update(clips)
      .set({
        removedAt: new Date(),
        removalReason: parsed.reason,
        removalNotes: parsed.notes ?? null,
        takedownRefUrl: parsed.takedownRefUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, parsed.clipId))
      .returning();
    if (!clip) throw new Error('clip not found');

    // Cascade S2: remove habit_template_clips join rows.
    // Phase 3 will treat missing join as "needs new evidence".
    const affected = await tx
      .delete(habitTemplateClips)
      .where(eq(habitTemplateClips.clipId, parsed.clipId))
      .returning();

    await tx.insert(clipEdits).values({
      clipId: clip.id,
      actorId: user.id,
      source: 'manual',
      field: 'status',
      action: 'removed',
      payload: {
        reason: parsed.reason,
        notes: parsed.notes ?? null,
        takedownRefUrl: parsed.takedownRefUrl ?? null,
        affectedHabitTemplateCount: affected.length,
      },
    });

    return { clip, affectedHabitTemplates: affected.length };
  });
}
