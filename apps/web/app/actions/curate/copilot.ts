'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { copilot } from '@cited/core';
import { clipEdits, createDb } from '@cited/db';
import { z } from 'zod';

const { copilotKindSchema } = copilot;

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

const acceptSchema = z.object({
  clipId: z.string().uuid(),
  kind: copilotKindSchema,
  suggestion: z.record(z.unknown()),
  similarity: z.number().nullable().optional(),
});

const rejectSchema = acceptSchema.extend({ reason: z.string().optional() });

export type AcceptCopilotInput = z.infer<typeof acceptSchema>;
export type RejectCopilotInput = z.infer<typeof rejectSchema>;

export async function acceptCopilotSuggestion(input: AcceptCopilotInput): Promise<void> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = acceptSchema.parse(input);
  await db()
    .insert(clipEdits)
    .values({
      clipId: parsed.clipId,
      actorId: user.id,
      source: 'ai_copilot',
      field: parsed.kind,
      action: 'ai_accepted',
      payload: {
        kind: parsed.kind,
        suggestion: parsed.suggestion,
        similarity: parsed.similarity ?? null,
      },
      accepted: true,
    });
}

export async function rejectCopilotSuggestion(input: RejectCopilotInput): Promise<void> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = rejectSchema.parse(input);
  await db()
    .insert(clipEdits)
    .values({
      clipId: parsed.clipId,
      actorId: user.id,
      source: 'ai_copilot',
      field: parsed.kind,
      action: 'ai_rejected',
      payload: {
        kind: parsed.kind,
        suggestion: parsed.suggestion,
        similarity: parsed.similarity ?? null,
        reason: parsed.reason ?? null,
      },
      accepted: false,
    });
}
