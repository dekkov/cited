'use server';

import 'server-only';

import { getSessionUser } from '@/lib/auth/guards';
import { clipEdits, clips, createDb, eq } from '@cited/db';
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

// Board columns are field-completeness-derived (see boardQueries).
// advanceClipStatus only writes an audit trail of board-column moves.
// Review → Published is rejected here — the editor's approveClip enforces
// risk_flags + embed-on-approve.
const schema = z.object({
  clipId: z.string().uuid(),
  to: z.enum(['drafting', 'review']),
});

export type AdvanceClipStatusInput = z.infer<typeof schema>;

export async function advanceClipStatus(input: AdvanceClipStatusInput) {
  const user = await getSessionUser();
  if (!user || !(['curator', 'admin'] as const).includes(user.role as 'curator' | 'admin')) {
    throw new Error('forbidden');
  }
  const parsed = schema.parse(input);

  const [clip] = await db().select().from(clips).where(eq(clips.id, parsed.clipId));
  if (!clip) throw new Error('clip not found');

  await db()
    .insert(clipEdits)
    .values({
      clipId: clip.id,
      actorId: user.id,
      source: 'manual',
      field: 'board_column',
      action: 'updated',
      payload: { toColumn: parsed.to },
    });

  return { ok: true };
}
