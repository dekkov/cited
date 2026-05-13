import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EmbeddingProvider } from '../llm/provider';
import { __setEmbeddingsImpl } from '../llm/grounding/similarityCheck';
import type { Citation } from '../interview/schemas';
import type { ClipLookup } from './validateCitations';
import { validateCitations } from './validateCitations';
import type { NearestChunkQuery } from '../llm/grounding/similarityCheck';

// Set up a mock embeddings provider so groundingCheck doesn't call the real OpenAI API
const mockEmbeddings: EmbeddingProvider = {
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

beforeEach(() => {
  __setEmbeddingsImpl(mockEmbeddings);
});

afterEach(() => {
  __setEmbeddingsImpl(null);
});

// Helper factory for test citations
const makeCitation = (clipId: string): Citation => ({
  clipId,
  claim: `Test claim for clip ${clipId}`,
  speaker: 'Dr. Test Speaker',
});

// Helper for a clip row that is approved and not removed
const makeApprovedClip = (clipId: string) => ({
  id: clipId,
  status: 'approved' as const,
  claim: `Test claim for clip ${clipId}`,
  removedAt: null,
});

// A nearest query that always returns high similarity (above threshold)
const highSimilarityNearest: NearestChunkQuery = async () => 0.9;

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';
const UUID_C = '33333333-3333-3333-3333-333333333333';
const UUID_D = '44444444-4444-4444-4444-444444444444';

describe('validateCitations', () => {
  it('Test 1: drops citation when clipId is not found by clipLookup', async () => {
    const citations = [makeCitation(UUID_A)];
    const clipLookup: ClipLookup = async () => null; // not found

    const result = await validateCitations(citations, clipLookup, highSimilarityNearest);

    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.citation.clipId).toBe(UUID_A);
    expect(result.dropped[0]!.reason).toBe('clip_not_found_or_unapproved');
  });

  it('Test 2: drops citation when clip status is not approved', async () => {
    const citations = [makeCitation(UUID_B)];
    const clipLookup: ClipLookup = async () => ({
      id: UUID_B,
      status: 'pending',
      claim: 'some claim',
      removedAt: null,
    });

    const result = await validateCitations(citations, clipLookup, highSimilarityNearest);

    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toBe('clip_not_found_or_unapproved');
  });

  it('Test 3: drops citation when similarity is below 0.85 threshold', async () => {
    const citations = [makeCitation(UUID_C)];
    const clipLookup: ClipLookup = async (id) => makeApprovedClip(id);
    // Returns 0.7, which is < 0.85
    const nearest: NearestChunkQuery = async () => 0.7;

    const result = await validateCitations(citations, clipLookup, nearest);

    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toMatch(/^claim_similarity_0\.70_below_threshold$/);
  });

  it('Test 4: accepts citation when similarity is >= 0.85 threshold', async () => {
    const citations = [makeCitation(UUID_D)];
    const clipLookup: ClipLookup = async (id) => makeApprovedClip(id);
    // Returns 0.85, which is exactly at threshold (>= 0.85 → valid)
    const nearest: NearestChunkQuery = async () => 0.85;

    const result = await validateCitations(citations, clipLookup, nearest);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]!.clipId).toBe(UUID_D);
    expect(result.dropped).toHaveLength(0);
  });

  it('Test 5: returns empty dropped array when all citations are valid', async () => {
    const citations = [makeCitation(UUID_A), makeCitation(UUID_B)];
    const clipLookup: ClipLookup = async (id) => makeApprovedClip(id);

    const result = await validateCitations(citations, clipLookup, highSimilarityNearest);

    expect(result.valid).toHaveLength(2);
    expect(result.dropped).toHaveLength(0);
  });
});
