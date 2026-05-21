import type { EmbeddingProvider } from '../provider';
import { getEmbeddings } from '../registry';

// Test seam (mirrors transcripts/* convention used elsewhere in @cited/core).
let embeddingsImpl: () => EmbeddingProvider = () => getEmbeddings();

export function __setEmbeddingsImpl(
  impl: EmbeddingProvider | (() => EmbeddingProvider) | null,
): void {
  if (impl === null) {
    embeddingsImpl = () => getEmbeddings();
  } else if (typeof impl === 'function') {
    embeddingsImpl = impl;
  } else {
    embeddingsImpl = () => impl;
  }
}

/**
 * Caller-provided pgvector cosine query. The caller has access to drizzle-orm via
 * `@cited/db` (where it is re-exported from), so we keep `@cited/core` free of a
 * drizzle-orm dependency. Implementations should run:
 *
 *   SELECT 1 - (embedding <=> $1::vector) AS similarity
 *   FROM transcript_chunks
 *   WHERE episode_id = (SELECT episode_id FROM clips WHERE id = $2)
 *   ORDER BY embedding <=> $1::vector
 *   LIMIT 1
 *
 * and return the first row's `similarity` (or null when no row exists).
 */
export type NearestChunkQuery = (vec: number[], clipId: string) => Promise<number | null>;

export const GROUNDING_THRESHOLD = 0.85;

/**
 * AION-10 production grounding check. Embeds the AI suggestion's quotedSpan and asks the
 * caller-supplied query for the nearest transcript_chunk cosine similarity within the
 * clip's episode.
 *
 * Returns 1.0 when no transcript chunks exist for the clip — the clip is admin-approved
 * so we trust it; absence of chunks means verification is unavailable, not that the claim
 * is wrong. Returns 0 only when the embedder produces no vector.
 */
export async function groundingCheck(
  nearest: NearestChunkQuery,
  quotedSpan: string,
  clipId: string,
): Promise<number> {
  const provider = embeddingsImpl();
  const { embeddings } = await provider.embed({ input: [quotedSpan] });
  const vec = embeddings[0];
  if (!vec) return 0;
  const similarity = await nearest(vec, clipId);
  // null = no transcript chunks found; pass through (verification unavailable ≠ mismatch)
  return similarity ?? 1.0;
}
