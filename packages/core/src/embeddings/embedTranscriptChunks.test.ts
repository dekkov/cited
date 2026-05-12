import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EmbeddingProvider } from '../llm/provider';
import { __setEmbeddingsImpl, embedTranscriptChunks } from './embedTranscriptChunks';

describe('embedTranscriptChunks', () => {
  let calls: string[][] = [];

  beforeEach(() => {
    calls = [];
    const mock: EmbeddingProvider = {
      name: 'mock',
      async embed({ input }) {
        const arr = Array.isArray(input) ? input : [input];
        calls.push(arr);
        return {
          embeddings: arr.map(() => new Array(1536).fill(0.1) as number[]),
          provider: 'mock',
          model: 'mock',
        };
      },
    };
    __setEmbeddingsImpl(mock);
  });

  afterEach(() => {
    __setEmbeddingsImpl(null);
  });

  it('batches at BATCH_SIZE=100 (250 inputs → 100+100+50)', async () => {
    const texts = Array.from({ length: 250 }, (_, i) => `chunk ${i}`);
    const vectors = await embedTranscriptChunks(texts);
    expect(vectors).toHaveLength(250);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toHaveLength(100);
    expect(calls[1]).toHaveLength(100);
    expect(calls[2]).toHaveLength(50);
  });

  it('returns 1536-dim vectors', async () => {
    const vectors = await embedTranscriptChunks(['one', 'two']);
    expect(vectors[0]).toHaveLength(1536);
    expect(vectors[1]).toHaveLength(1536);
  });

  it('empty input returns [] without calling the provider', async () => {
    const vectors = await embedTranscriptChunks([]);
    expect(vectors).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
