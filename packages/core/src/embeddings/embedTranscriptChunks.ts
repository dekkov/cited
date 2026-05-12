import type { EmbeddingProvider } from '../llm/provider';
import { getEmbeddings } from '../llm/registry';

/** Maximum inputs per OpenAI embeddings request (Pitfall 2: cost & rate-limit safety). */
export const BATCH_SIZE = 100;

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
 * Batched embedding for transcript chunks.
 *
 * Splits the input list into BATCH_SIZE-bounded slices to keep each OpenAI call within
 * a single response window (avoids cost explosion + 429s on long episodes — see
 * 02-RESEARCH.md §"Pitfall 2 Embedding cost explosion"). Returns one 1536-dim vector
 * per input text in the same order as the input.
 */
export async function embedTranscriptChunks(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = embeddingsImpl();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await provider.embed({ input: batch });
    for (const v of result.embeddings) {
      if (v.length !== 1536) {
        throw new Error(`embedTranscriptChunks: expected 1536-dim vector, got ${v.length}`);
      }
      out.push(v);
    }
  }
  return out;
}
