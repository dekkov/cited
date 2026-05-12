import type { WordTimestamped } from '@cited/core';

export type TranscriptChunk = {
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type ChunkOpts = {
  tokensPerChunk?: number;
  overlapTokens?: number;
};

/**
 * Sliding-window chunker over word-timestamped transcripts.
 *
 * Defaults: 512 tokens per chunk, 64-token overlap (English heuristic: 1 token ≈ 0.75 words,
 * so ~683 words/chunk, stride ~598). Each chunk carries the start/end second of its first/last
 * word so transcript_chunks rows can be cited with deep-links in Phase 3 RAG.
 *
 * Tradeoffs documented in 02-RESEARCH.md §"Pattern 4 Transcript Chunking".
 */
export function chunkTranscript(words: WordTimestamped[], opts: ChunkOpts = {}): TranscriptChunk[] {
  if (words.length === 0) return [];
  const tokensPerChunk = opts.tokensPerChunk ?? 512;
  const overlapTokens = opts.overlapTokens ?? 64;
  const wordsPerChunk = Math.max(1, Math.round(tokensPerChunk / 0.75));
  const overlapWords = Math.max(0, Math.round(overlapTokens / 0.75));
  const stride = Math.max(1, wordsPerChunk - overlapWords);

  const chunks: TranscriptChunk[] = [];
  for (let i = 0; i < words.length; i += stride) {
    const slice = words.slice(i, i + wordsPerChunk);
    if (slice.length === 0) break;
    const first = slice[0];
    const last = slice[slice.length - 1];
    if (!first || !last) break;
    chunks.push({
      chunkIndex: chunks.length,
      startSeconds: Math.floor(first.start),
      endSeconds: Math.ceil(last.end),
      text: slice.map((w) => w.text).join(' '),
    });
    if (i + wordsPerChunk >= words.length) break;
  }
  return chunks;
}
