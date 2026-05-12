import { describe, expect, it } from 'vitest';
import { chunkTranscript } from './chunking';

const mkWords = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    text: `w${i}`,
    start: i * 0.5,
    end: (i + 1) * 0.5,
  }));

describe('chunkTranscript', () => {
  it('returns [] for empty input', () => {
    expect(chunkTranscript([])).toEqual([]);
  });

  it('produces ~2 chunks for 1000 words at default opts', () => {
    const chunks = chunkTranscript(mkWords(1000));
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.chunkIndex).toBe(0);
  });

  it('each chunk carries monotonic chunkIndex starting at 0', () => {
    const chunks = chunkTranscript(mkWords(1500));
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i);
      expect(c.endSeconds).toBeGreaterThanOrEqual(c.startSeconds);
    });
  });

  it('consecutive chunks share overlap_words worth of text', () => {
    // wordsPerChunk = round(512/0.75) = 683, overlapWords = round(64/0.75) = 85
    // For 1500 words: chunk0 = w0..w682, chunk1 = w598..w1280 → shares w598..w682
    const chunks = chunkTranscript(mkWords(1500));
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const c0 = chunks[0];
    const c1 = chunks[1];
    if (!c0 || !c1) throw new Error('expected ≥2 chunks');
    // The trailing words of c0 should appear at the head of c1.
    const c0Tail = c0.text.split(' ').slice(-10).join(' ');
    const c0FirstTailWord = c0Tail.split(' ')[0];
    if (!c0FirstTailWord) throw new Error('expected non-empty tail');
    expect(c1.text).toContain(c0FirstTailWord);
  });

  it('start/end seconds reflect word boundaries', () => {
    const chunks = chunkTranscript(mkWords(100), { tokensPerChunk: 30, overlapTokens: 4 });
    expect(chunks[0]?.startSeconds).toBe(0);
    // last chunk's end should be near the last word's end (49.5 → ceil 50)
    expect(chunks[chunks.length - 1]?.endSeconds).toBeLessThanOrEqual(50);
  });
});
