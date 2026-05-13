import { afterEach, describe, expect, it } from 'vitest';
import type { ClipRetrievalFilters, RankedClip } from './types';
import {
  __setHybridQueryImpl,
  type HybridQueryFn,
  hybridRetrieve,
} from './hybridRetrieve';

const makeClip = (clipId: string, similarityScore: number): RankedClip => ({
  clipId,
  similarityScore,
  vectorScore: similarityScore,
  textScore: similarityScore * 0.8,
  claim: `Claim for ${clipId}`,
  speaker: 'Dr. Test',
  domain: 'sleep',
});

afterEach(() => {
  __setHybridQueryImpl(null);
});

describe('hybridRetrieve', () => {
  it('Test 1: returns RankedClips sorted by descending similarityScore when caller query returns 3 rows', async () => {
    const clips: RankedClip[] = [
      makeClip('clip-b', 0.7),
      makeClip('clip-a', 0.9),
      makeClip('clip-c', 0.5),
    ];
    const fakeQuery: HybridQueryFn = async () => clips;

    const result = await hybridRetrieve(fakeQuery, [], '', {}, 5);

    expect(result).toHaveLength(3);
    expect(result[0]!.clipId).toBe('clip-a'); // 0.9 first
    expect(result[1]!.clipId).toBe('clip-b'); // 0.7 second
    expect(result[2]!.clipId).toBe('clip-c'); // 0.5 last
  });

  it('Test 2: filters.excludeClipIds is passed through to the query function', async () => {
    const excludeClipIds = ['clip-x', 'clip-y'];
    let capturedFilters: ClipRetrievalFilters | undefined;
    const fakeQuery: HybridQueryFn = async ({ filters }) => {
      capturedFilters = filters;
      return [makeClip('clip-z', 0.8)];
    };

    await hybridRetrieve(fakeQuery, [], 'query', { excludeClipIds }, 5);

    expect(capturedFilters?.excludeClipIds).toEqual(excludeClipIds);
  });

  it('Test 3: filters.excludeRiskFlags is passed through to the query function', async () => {
    const excludeRiskFlags = ['medical_advice', 'supplement', 'contraindication'];
    let capturedFilters: ClipRetrievalFilters | undefined;
    const fakeQuery: HybridQueryFn = async ({ filters }) => {
      capturedFilters = filters;
      return [];
    };

    await hybridRetrieve(fakeQuery, [], 'query', { excludeRiskFlags }, 5);

    expect(capturedFilters?.excludeRiskFlags).toEqual(excludeRiskFlags);
  });

  it('Test 4: returns empty array when caller query returns no results', async () => {
    const fakeQuery: HybridQueryFn = async () => [];

    const result = await hybridRetrieve(fakeQuery, [], 'query', {}, 5);

    expect(result).toHaveLength(0);
  });

  it('Test 5: __setHybridQueryImpl test seam overrides the caller-supplied query', async () => {
    const injectedClips: RankedClip[] = [makeClip('injected-clip', 0.95)];
    __setHybridQueryImpl(async () => injectedClips);

    // Even with a different query passed, the injected impl is used
    const callerQuery: HybridQueryFn = async () => [makeClip('caller-clip', 0.5)];
    const result = await hybridRetrieve(callerQuery, [], '', {}, 5);

    expect(result).toHaveLength(1);
    expect(result[0]!.clipId).toBe('injected-clip');
  });
});
