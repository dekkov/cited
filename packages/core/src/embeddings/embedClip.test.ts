import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EmbeddingProvider } from '../llm/provider';
import { __setEmbeddingsImpl, embedClip } from './embedClip';

describe('embedClip', () => {
  let lastInput: string[] | null = null;

  beforeEach(() => {
    lastInput = null;
    const mock: EmbeddingProvider = {
      name: 'mock',
      async embed({ input }) {
        const arr = Array.isArray(input) ? input : [input];
        lastInput = arr;
        return {
          embeddings: arr.map(() => new Array(1536).fill(0.2) as number[]),
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

  it('joins claim + rationale with a blank line', async () => {
    await embedClip({ claim: 'sleep 7-9h', rationale: 'mortality benefit' });
    expect(lastInput).toEqual(['sleep 7-9h\n\nmortality benefit']);
  });

  it('embeds just the claim when rationale is null', async () => {
    await embedClip({ claim: 'sunlight in AM', rationale: null });
    expect(lastInput).toEqual(['sunlight in AM']);
  });

  it('returns a 1536-dim vector', async () => {
    const v = await embedClip({ claim: 'x' });
    expect(v).toHaveLength(1536);
  });

  it('throws if provider returns wrong dimensionality', async () => {
    __setEmbeddingsImpl({
      name: 'bad',
      async embed() {
        return {
          embeddings: [new Array(512).fill(0.1) as number[]],
          provider: 'bad',
          model: 'bad',
        };
      },
    });
    await expect(embedClip({ claim: 'x' })).rejects.toThrow(/1536-dim/);
  });
});
