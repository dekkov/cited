import { getSessionUser } from '@/lib/auth/guards';
import { logger } from '@/lib/logger';
import { copilot, grounding } from '@cited/core';
import { clipEdits, createDb, sql } from '@cited/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const { copilotKindSchema, streamCopilotObject } = copilot;
const { GROUNDING_THRESHOLD, groundingCheck } = grounding;

const inputSchema = z.object({
  clipId: z.string().uuid(),
  kind: copilotKindSchema,
  selection: z.string().min(1),
  freeText: z.string().optional(),
});

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

// pgvector nearest-chunk query — passed into groundingCheck so @cited/core stays
// drizzle-orm-free. Returns null when no transcript_chunk exists for the clip's episode.
async function nearestChunkSimilarity(vec: number[], clipId: string): Promise<number | null> {
  const literal = `[${vec.join(',')}]`;
  const rows = await db().execute<{ similarity: number }>(sql`
    SELECT 1 - (embedding <=> ${literal}::vector) AS similarity
    FROM transcript_chunks
    WHERE episode_id = (SELECT episode_id FROM clips WHERE id = ${clipId})
    ORDER BY embedding <=> ${literal}::vector
    LIMIT 1
  `);
  return rows[0]?.similarity ?? null;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { clipId, kind, selection, freeText } = parsed.data;
  const userPrompt = freeText ? `${selection}\n\nCurator question: ${freeText}` : selection;

  const result = streamCopilotObject({
    kind,
    userPrompt,
    onFinish: async ({ object }) => {
      try {
        const obj = object as { quotedSpan?: string } | undefined;
        const quoted = obj?.quotedSpan ?? '';
        const similarity = quoted
          ? await groundingCheck(nearestChunkSimilarity, quoted, clipId)
          : 0;
        await db()
          .insert(clipEdits)
          .values({
            clipId,
            actorId: user.id,
            source: 'ai_copilot',
            field: kind,
            action: 'ai_suggested',
            payload: {
              kind,
              suggestion: object,
              similarity,
              belowThreshold: similarity < GROUNDING_THRESHOLD,
              freeText: freeText ?? null,
            },
          });
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), clipId, kind },
          'copilot onFinish audit write failed',
        );
      }
    },
  });
  return result.toTextStreamResponse();
}
