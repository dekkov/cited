import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hybridRetrieve, __setHybridQueryImpl, type HybridQueryFn } from './hybridRetrieve';
import type { RankedClip } from './types';

const makeClip = (clipId: string, score: number): RankedClip => ({
  clipId,
  similarityScore: score,
  vectorScore: score * 0.6,
  textScore: score * 0.4,
  claim: `claim for ${clipId}`,
  speaker: 'Dr. Test Speaker',
  domain: 'sleep',
});

afterEach(() => {
  __setHybridQueryImpl(null);
});

describe('hybridRetrieve', () => {
  it('Test 1: returns 3 RankedClips sorted by descending similarityScore', async () => {
    const fakeQuery: HybridQueryFn = async () => [
      makeClip('a', 0.7),
      makeClip('b', 0.9),
      makeClip('c', 0.5),
    ];
    const results = await hybridRetrieve(fakeQuery, [0.1, 0.2], 'sleep tips', {}, 3);
    expect(results).toHaveLength(3);
    expect(results[0]!.clipId).toBe('b'); // highest score first
    expect(results[1]!.clipId).toBe('a');
    expect(results[2]!.clipId).toBe('c');
  });

  it('Test 2: filters.excludeClipIds is passed through to the query function', async () => {
    let capturedFilters: unknown;
    const fakeQuery: HybridQueryFn = async ({ filters }) => {
      capturedFilters = filters;
      return [];
    };
    await hybridRetrieve(fakeQuery, [0.1], 'test', { excludeClipIds: ['id-1', 'id-2'] }, 5);
    expect((capturedFilters as { excludeClipIds: string[] }).excludeClipIds).toEqual(['id-1', 'id-2']);
  });

  it('Test 3: filters.excludeRiskFlags is passed through to the query function', async () => {
    let capturedFilters: unknown;
    const fakeQuery: HybridQueryFn = async ({ filters }) => {
      capturedFilters = filters;
      return [];
    };
    await hybridRetrieve(
      fakeQuery,
      [0.1],
      'test',
      { excludeRiskFlags: ['medical_advice', 'supplement', 'contraindication'] },
      5,
    );
    expect((capturedFilters as { excludeRiskFlags: string[] }).excludeRiskFlags).toEqual([
      'medical_advice',
      'supplement',
      'contraindication',
    ]);
  });

  it('Test 4: empty result from caller query → returns []', async () => {
    const fakeQuery: HybridQueryFn = async () => [];
    const results = await hybridRetrieve(fakeQuery, [0.1], 'test', {}, 5);
    expect(results).toHaveLength(0);
  });

  it('Test 5: __setHybridQueryImpl test seam overrides the passed query', async () => {
    const injectedQuery: HybridQueryFn = async () => [makeClip('injected', 0.99)];
    __setHybridQueryImpl(injectedQuery);

    // The passed query should be ignored when seam is set
    const passedQuery: HybridQueryFn = async () => [makeClip('passed', 0.1)];
    const results = await hybridRetrieve(passedQuery, [0.1], 'test', {}, 5);
    expect(results[0]!.clipId).toBe('injected');
  });
});
