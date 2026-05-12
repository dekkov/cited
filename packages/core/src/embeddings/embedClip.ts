import type { EmbeddingProvider } from '../llm/provider';
import { getEmbeddings } from '../llm/registry';

/**
 * Hoisted impl so tests can inject a mock embedder without monkey-patching the registry.
 * Production path defers to the configured provider in registry (OpenAI text-embedding-3-small).
 * Mirrors the test-seam pattern used in `transcripts/youtube.ts` and `transcripts/deepgram.ts`.
 */
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

export type ClipEmbeddingInput = {
  claim: string;
  rationale?: string | null;
};

/**
 * Embeds a single clip's `${claim}\n\n${rationale}` payload for ADMN-04 embed-on-approve.
 * Returns a 1536-dim vector. Throws if the provider returns the wrong dimensionality.
 */
export async function embedClip(input: ClipEmbeddingInput): Promise<number[]> {
  const text = input.rationale ? `${input.claim}\n\n${input.rationale}` : input.claim;
  const provider = embeddingsImpl();
  const result = await provider.embed({ input: [text] });
  const vec = result.embeddings[0];
  if (!vec || vec.length !== 1536) {
    throw new Error(`embedClip: expected 1536-dim vector, got ${vec?.length ?? 0}`);
  }
  return vec;
}
