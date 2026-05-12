'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { embedClip } from '@cited/core';
import { clipEdits, clips, createDb, eq } from '@cited/db';
import { type ApproveClipInput, approveClipSchema } from './schemas';

// Singleton DB connection — reused across requests in the same process.
let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

export type ApproveClipResult = {
  id: string;
  status: string;
  claim: string;
  rationale: string | null;
  embeddingPending: boolean;
};

/**
 * ADMN-03/04/05/06/11 — Transactional approve.
 *
 * 1. zod validates input (rejects empty riskFlags + hard-block hits BEFORE any DB write).
 * 2. Inside a transaction: UPDATE clips SET status='approved' + INSERT clip_edits action='approved'.
 * 3. After commit: embed-on-approve via embedClip(). Failure does NOT roll back approval —
 *    we log a warning, INSERT clip_edits action='embed_failed', and surface a retry-embed
 *    affordance to the curator (UI side in Plan 04 Task 4).
 */
export async function approveClip(input: ApproveClipInput): Promise<ApproveClipResult> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = approveClipSchema.parse(input);

  const updated = await db().transaction(async (tx) => {
    const [clip] = await tx
      .update(clips)
      .set({
        status: 'approved',
        claim: parsed.claim,
        rationale: parsed.rationale,
        speaker: parsed.speaker,
        speakerStatus: parsed.speakerStatus,
        domain: parsed.domain,
        riskFlags: parsed.riskFlags,
        startSeconds: Math.floor(parsed.startSec),
        endSeconds: Math.ceil(parsed.endSec),
        evidenceStrength: parsed.evidenceStrength ?? null,
        approvedAt: new Date(),
        approvedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, parsed.clipId))
      .returning();
    if (!clip) throw new Error(`clip ${parsed.clipId} not found`);

    await tx.insert(clipEdits).values({
      clipId: clip.id,
      actorId: user.id,
      source: 'manual',
      field: 'status',
      action: 'approved',
      payload: {
        riskFlags: parsed.riskFlags,
        evidenceStrength: parsed.evidenceStrength ?? null,
      },
      beforeValue: { status: 'pending' },
      afterValue: { status: 'approved' },
      accepted: true,
    });

    return clip;
  });

  // Embed-on-approve (ADMN-04). Tolerant of OpenAI transient failures — clip stays approved.
  let embeddingPending = false;
  try {
    const vector = await embedClip({
      claim: updated.claim,
      rationale: updated.rationale,
    });
    await db().update(clips).set({ embedding: vector }).where(eq(clips.id, updated.id));
    await db()
      .insert(clipEdits)
      .values({
        clipId: updated.id,
        actorId: user.id,
        source: 'manual',
        field: 'embedding',
        action: 'embedded',
        payload: { dim: vector.length, model: 'text-embedding-3-small' },
      });
  } catch (err) {
    embeddingPending = true;
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      { err: message, clipId: updated.id },
      'embed-on-approve failed; clip published, embedding deferred',
    );
    await db()
      .insert(clipEdits)
      .values({
        clipId: updated.id,
        actorId: user.id,
        source: 'manual',
        field: 'embedding',
        action: 'embed_failed',
        payload: { error: message },
      });
  }

  return {
    id: updated.id,
    status: updated.status,
    claim: updated.claim,
    rationale: updated.rationale,
    embeddingPending,
  };
}
