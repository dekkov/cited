import { describe, expect, it, vi } from 'vitest';
import { findSwap } from './findSwap';
import type { SwapCandidate, SwapQueryFn } from './findSwap';

const MOCK_CANDIDATE_1: SwapCandidate = {
  templateId: 'template-b',
  slug: 'sleep-no-caffeine',
  title: 'No caffeine after 2pm',
  clusterId: 2,
  minCosDistance: 0.85,
};

const MOCK_CANDIDATE_2: SwapCandidate = {
  templateId: 'template-c',
  slug: 'sleep-dark-room',
  title: 'Keep bedroom dark',
  clusterId: 3,
  minCosDistance: 0.78,
};

const MOCK_CANDIDATE_3: SwapCandidate = {
  templateId: 'template-d',
  slug: 'sleep-no-screens',
  title: 'No screens 1hr before bed',
  clusterId: 2,
  minCosDistance: 0.72,
};

describe('findSwap', () => {
  it('Test 6: When current template has cluster_id=1, query is parameterized with domain and currentClusterId=1', async () => {
    const mockQuery = vi.fn<SwapQueryFn>().mockResolvedValue([MOCK_CANDIDATE_1, MOCK_CANDIDATE_2]);

    await findSwap(mockQuery, 'template-a', 'sleep', 1, 3);

    expect(mockQuery).toHaveBeenCalledOnce();
    expect(mockQuery).toHaveBeenCalledWith({
      currentTemplateId: 'template-a',
      domain: 'sleep',
      currentClusterId: 1,
      limit: 3,
    });
  });

  it('Test 7: When current template has cluster_id=NULL, fallback — currentClusterId is null in query params', async () => {
    const mockQuery = vi.fn<SwapQueryFn>().mockResolvedValue([MOCK_CANDIDATE_1]);

    await findSwap(mockQuery, 'template-a', 'nutrition_gut', null, 3);

    expect(mockQuery).toHaveBeenCalledOnce();
    expect(mockQuery).toHaveBeenCalledWith({
      currentTemplateId: 'template-a',
      domain: 'nutrition_gut',
      currentClusterId: null,
      limit: 3,
    });
  });

  it('Test 8: Returns ≤3 ranked candidates sorted by minCosDistance descending (as returned by query)', async () => {
    // The query fn returns candidates already sorted; findSwap returns them as-is.
    const candidates = [MOCK_CANDIDATE_1, MOCK_CANDIDATE_2, MOCK_CANDIDATE_3];
    const mockQuery = vi.fn<SwapQueryFn>().mockResolvedValue(candidates);

    const result = await findSwap(mockQuery, 'template-a', 'sleep', 1, 3);

    expect(result).toHaveLength(3);
    expect(result[0]!.minCosDistance).toBeGreaterThanOrEqual(result[1]!.minCosDistance);
    expect(result[1]!.minCosDistance).toBeGreaterThanOrEqual(result[2]!.minCosDistance);
  });

  it('passes limit param correctly to query function', async () => {
    const mockQuery = vi.fn<SwapQueryFn>().mockResolvedValue([MOCK_CANDIDATE_1]);

    await findSwap(mockQuery, 'template-a', 'sleep', 0, 5);

    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
  });

  it('returns empty array when query returns no candidates', async () => {
    const mockQuery = vi.fn<SwapQueryFn>().mockResolvedValue([]);

    const result = await findSwap(mockQuery, 'template-a', 'sleep', 1);

    expect(result).toEqual([]);
  });
});
