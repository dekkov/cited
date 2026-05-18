import 'server-only';

import { NextResponse } from 'next/server';

import { embedTranscriptChunks } from '@cited/core';
import { extractVideoId, fetchTranscript } from '@cited/core/transcripts';
import {
  createDb,
  episodeBlacklist,
  episodes,
  eq,
  podcasts,
  transcriptChunks,
  transcripts,
} from '@cited/db';

import { ingestUrlSchema } from '@/app/actions/curate/schemas';
import { getSessionUser } from '@/lib/auth/guards';
import { chunkTranscript } from '@/lib/curate/chunking';

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    _db = createDb(url);
  }
  return _db;
}

/**
 * POST /api/admin/ingest — ADMN-12 + ADMN-13
 *
 * Body: { url: string } | { manualTranscript: { podcastId, youtubeVideoId, title?, content, filename } }
 *
 * Pipeline:
 *   1. curator/admin gate
 *   2. zod-parse body
 *   3. resolve videoId + check episode_blacklist (LGL-03 takedown bar)
 *   4. fetchTranscript via Plan 02 orchestrator (manual file path OR YouTube captions path)
 *   5. upsert podcast→episode and transcripts rows (idempotent re-ingest)
 *   6. delete + reinsert transcript_chunks with batched 1536-dim embeddings (Pitfall 2)
 *
 * Returns { episodeId, transcriptVideoId, chunkCount, source } on success.
 */
export async function POST(req: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user || (user.role !== 'curator' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = ingestUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // 1) Resolve videoId from either path.
  let videoId: string;
  try {
    videoId = parsed.data.url
      ? extractVideoId(parsed.data.url)
      : (parsed.data.manualTranscript as { youtubeVideoId: string }).youtubeVideoId;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // 2) Block blacklisted episodes (LGL-03 — DMCA / speaker takedown).
  const [bl] = await db()
    .select()
    .from(episodeBlacklist)
    .where(eq(episodeBlacklist.youtubeVideoId, videoId));
  if (bl) {
    return NextResponse.json(
      { error: `episode is blacklisted (reason: ${bl.reason})` },
      { status: 403 },
    );
  }

  // 3) Fetch transcript via the Plan 02 orchestrator.
  let transcript: Awaited<ReturnType<typeof fetchTranscript>>;
  try {
    if (parsed.data.manualTranscript) {
      const m = parsed.data.manualTranscript;
      transcript = await fetchTranscript({
        videoId,
        file: { name: m.filename, content: m.content },
      });
    } else {
      transcript = await fetchTranscript({ url: parsed.data.url as string });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  // 4) Resolve podcastId — manual path supplies it; URL path falls back to first podcast row
  //    (Phase 2 single-curator + ADMN-16 inline-add covers brand-new sources).
  const podcastId =
    parsed.data.manualTranscript?.podcastId ??
    (await db().select({ id: podcasts.id }).from(podcasts).limit(1))[0]?.id;
  if (!podcastId) {
    return NextResponse.json(
      { error: 'no podcast rows in db — use ADMN-16 inline add first' },
      { status: 422 },
    );
  }

  // 5) Upsert episode on youtube_video_id (unique).
  const [episode] = await db()
    .insert(episodes)
    .values({
      podcastId,
      youtubeVideoId: videoId,
      title: parsed.data.manualTranscript?.title ?? null,
    })
    .onConflictDoUpdate({
      target: episodes.youtubeVideoId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: episodes.id });
  if (!episode) {
    return NextResponse.json({ error: 'episode upsert returned no rows' }, { status: 500 });
  }

  // 6) Upsert transcripts row (PK = video_id).
  await db()
    .insert(transcripts)
    .values({
      videoId,
      source: transcript.source,
      segments: transcript.segments,
      rawText: transcript.rawText,
      language: transcript.language,
    })
    .onConflictDoUpdate({
      target: transcripts.videoId,
      set: {
        source: transcript.source,
        segments: transcript.segments,
        rawText: transcript.rawText,
        language: transcript.language,
        fetchedAt: new Date(),
      },
    });

  // 7) Chunk + embed + reinsert (delete-then-insert keeps re-ingest idempotent).
  await db().delete(transcriptChunks).where(eq(transcriptChunks.episodeId, episode.id));
  const chunks = chunkTranscript(transcript.words);
  const vectors = await embedTranscriptChunks(chunks.map((c) => c.text));
  if (chunks.length > 0) {
    await db()
      .insert(transcriptChunks)
      .values(
        chunks.map((c, i) => ({
          episodeId: episode.id,
          chunkIndex: c.chunkIndex,
          content: c.text,
          startSeconds: c.startSeconds,
          endSeconds: c.endSeconds,
          embedding: vectors[i] ?? null,
        })),
      );
  }

  return NextResponse.json({
    episodeId: episode.id,
    transcriptVideoId: videoId,
    chunkCount: chunks.length,
    source: transcript.source,
  });
}
