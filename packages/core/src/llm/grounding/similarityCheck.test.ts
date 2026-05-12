import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbeddingProvider } from '../provider';
import {
  GROUNDING_THRESHOLD,
  type NearestChunkQuery,
  __setEmbeddingsImpl,
  groundingCheck,
} from './similarityCheck';

describe('groundingCheck', () => {
  const nearest: NearestChunkQuery = vi.fn();

  beforeEach(() => {
    (nearest as unknown as { mockReset: () => void }).mockReset();
    const mock: EmbeddingProvider = {
      name: 'mock',
      async embed({ input }) {
        const arr = Array.isArray(input) ? input : [input];
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

  it('returns the similarity from the nearest transcript chunk', async () => {
    (nearest as unknown as { mockResolvedValue: (v: number | null) => void }).mockResolvedValue(
      0.92,
    );
    const sim = await groundingCheck(
      nearest,
      'quoted span',
      '11111111-1111-1111-1111-111111111111',
    );
    expect(sim).toBe(0.92);
    expect(nearest as unknown as { mock: { calls: unknown[] } }).toHaveProperty('mock');
    expect((nearest as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
  });

  it('returns 0 when no transcript chunk is found', async () => {
    (nearest as unknown as { mockResolvedValue: (v: number | null) => void }).mockResolvedValue(
      null,
    );
    const sim = await groundingCheck(nearest, 'q', 'cid');
    expect(sim).toBe(0);
  });

  it('exposes the 0.85 threshold constant', () => {
    expect(GROUNDING_THRESHOLD).toBe(0.85);
  });
});
