import { afterEach, describe, expect, it } from 'vitest';
import { __resetDeepgramFetchImpl, __setDeepgramFetchImpl, deepgramProvider } from './deepgram';

describe('deepgramProvider', () => {
  afterEach(() => __resetDeepgramFetchImpl());

  it('returns TranscriptResult with source=deepgram + confidence-bearing words + language', async () => {
    __setDeepgramFetchImpl(async () => ({
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: 'hello world today',
                words: [
                  { word: 'hello', start: 0, end: 0.4, confidence: 0.99 },
                  {
                    word: 'world',
                    start: 0.4,
                    end: 0.8,
                    confidence: 0.97,
                    punctuated_word: 'world,',
                  },
                  { word: 'today', start: 0.8, end: 1.2, confidence: 0.95 },
                ],
              },
            ],
          },
        ],
        utterances: [
          { start: 0, end: 1.2, text: 'hello world today', transcript: 'hello world today' },
        ],
      },
      metadata: { language: 'en-US' },
    }));
    const result = await deepgramProvider.fetch({ audioUrl: 'https://example.com/a.mp3' } as never);
    expect(result.source).toBe('deepgram');
    expect(result.language).toBe('en-US');
    expect(result.words).toHaveLength(3);
    expect(result.words[1]?.text).toBe('world,'); // punctuated_word preferred
    expect(result.words[0]?.confidence).toBe(0.99);
    expect(result.rawText).toBe('hello world today');
  });

  it('throws when Deepgram returns no words', async () => {
    __setDeepgramFetchImpl(async () => ({
      results: { channels: [{ alternatives: [{ transcript: '', words: [] }] }] },
    }));
    await expect(
      deepgramProvider.fetch({ audioUrl: 'https://example.com/empty.mp3' } as never),
    ).rejects.toThrow(/no words/);
  });

  it('canHandle: true for audioUrl input, false for url/videoId only', () => {
    expect(deepgramProvider.canHandle({ audioUrl: 'https://x.com/a.mp3' } as never)).toBe(true);
    expect(deepgramProvider.canHandle({ url: 'https://youtube.com/watch?v=abc' })).toBe(false);
    expect(deepgramProvider.canHandle({ videoId: 'abc123XYZ_-' })).toBe(false);
  });

  it('throws when audioUrl missing', async () => {
    await expect(deepgramProvider.fetch({})).rejects.toThrow(/audioUrl/);
  });
});
