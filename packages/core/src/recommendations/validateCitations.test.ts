import { describe, it, expect, afterEach } from 'vitest';
import { validateCitations } from './validateCitations';
import type { ClipLookup } from './validateCitations';
import type { Citation } from '../interview/schemas';
import type { NearestChunkQuery } from '../llm/grounding/similarityCheck';
import { __setEmbeddingsImpl } from '../llm/grounding/similarityCheck';
import type { EmbeddingProvider } from '../llm/provider';

const makeCitation = (clipId: string): Citation => ({
  clipId,
  claim: `Important health claim from ${clipId}`,
  speaker: 'Dr. Test',
});

const approvedClip = (id: string) => ({
  id,
  status: 'approved',
  claim: `claim ${id}`,
  removedAt: null,
});

const makeClipLookup = (clips: Record<string, ReturnType<typeof approvedClip> | null>): ClipLookup =>
  async (clipId: string) => clips[clipId] ?? null;

const makeNearest = (similarity: number): NearestChunkQuery =>
  async () => similarity;

// Fake embeddings that return a predictable vector without hitting OpenAI
const fakeEmbeddings: EmbeddingProvider = {
  embed: async (opts) => {
    const inputs = Array.isArray(opts.input) ? opts.input : [opts.input];
    return {
      embeddings: inputs.map(() => [0.5, 0.5, 0.5]),
      provider: 'fake',
      model: 'fake',
    };
  },
};

afterEach(() => {
  __setEmbeddingsImpl(null);
});

describe('validateCitations', () => {
  it('Test 1: clip not found → dropped with clip_not_found_or_unapproved', async () => {
    __setEmbeddingsImpl(fakeEmbeddings);
    const lookup = makeClipLookup({});
    const nearest = makeNearest(0.9);
    const result = await validateCitations([makeCitation('missing-id')], lookup, nearest);
    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toBe('clip_not_found_or_unapproved');
  });

  it('Test 2: clip status != approved → dropped with clip_not_found_or_unapproved', async () => {
    __setEmbeddingsImpl(fakeEmbeddings);
    const lookup = makeClipLookup({
      'clip-1': { id: 'clip-1', status: 'pending', claim: 'claim', removedAt: null },
    });
    const nearest = makeNearest(0.9);
    const result = await validateCitations([makeCitation('clip-1')], lookup, nearest);
    expect(result.valid).toHaveLength(0);
    expect(result.dropped[0]!.reason).toBe('clip_not_found_or_unapproved');
  });

  it('Test 3: similarity < 0.85 → dropped with claim_similarity_below_threshold reason', async () => {
    __setEmbeddingsImpl(fakeEmbeddings);
    const lookup = makeClipLookup({ 'clip-1': approvedClip('clip-1') });
    // nearest returns 0.7 — below threshold
    const nearest = makeNearest(0.7);
    const result = await validateCitations([makeCitation('clip-1')], lookup, nearest);
    expect(result.valid).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.reason).toContain('below_threshold');
  });

  it('Test 4: similarity >= 0.85 → citation in valid', async () => {
    __setEmbeddingsImpl(fakeEmbeddings);
    const lookup = makeClipLookup({ 'clip-1': approvedClip('clip-1') });
    // nearest returns 0.9 — above threshold
    const nearest = makeNearest(0.9);
    const result = await validateCitations([makeCitation('clip-1')], lookup, nearest);
    expect(result.valid).toHaveLength(1);
    expect(result.dropped).toHaveLength(0);
    expect(result.valid[0]!.clipId).toBe('clip-1');
  });

  it('Test 5: all-valid input → dropped is empty', async () => {
    __setEmbeddingsImpl(fakeEmbeddings);
    const lookup = makeClipLookup({
      'a': approvedClip('a'),
      'b': approvedClip('b'),
      'c': approvedClip('c'),
    });
    const nearest = makeNearest(0.95);
    const result = await validateCitations(
      [makeCitation('a'), makeCitation('b'), makeCitation('c')],
      lookup,
      nearest,
    );
    expect(result.valid).toHaveLength(3);
    expect(result.dropped).toHaveLength(0);
  });
});
