import { afterEach, describe, expect, it } from 'vitest';
import { __resetDeepgramFetchImpl, __setDeepgramFetchImpl } from './deepgram';
import { fetchTranscript } from './orchestrator';
import { __resetYoutubeFetchImpl, __setYoutubeFetchImpl } from './youtube';

const VTT_FIXTURE = `WEBVTT

00:00:01.000 --> 00:00:03.500
Hello world this is one cue

00:00:03.500 --> 00:00:06.000
Second cue with more words
`;

// Helper: build 60 fake YouTube caption segments so the >50-words gate is exercised.
function makeLongCaptions(lang = 'en') {
  return Array.from({ length: 60 }, (_, i) => ({
    text: `word${i}`,
    offset: i,
    duration: 1,
    lang,
  }));
}

describe('fetchTranscript orchestrator', () => {
  afterEach(() => {
    __resetYoutubeFetchImpl();
    __resetDeepgramFetchImpl();
  });

  it('routes file input → manual provider', async () => {
    const result = await fetchTranscript({
      file: { name: 't.vtt', content: VTT_FIXTURE },
    });
    expect(result.source).toBe('manual');
    expect(result.segments).toHaveLength(2);
  });

  it('routes YouTube URL with >50 English captions → youtube_captions', async () => {
    __setYoutubeFetchImpl(async () => makeLongCaptions('en'));
    const result = await fetchTranscript({ videoId: 'abc123XYZ_-' });
    expect(result.source).toBe('youtube_captions');
    expect(result.words.length).toBeGreaterThan(50);
  });

  it('throws explicit manual-transcript fallback error when YouTube captions are missing', async () => {
    __setYoutubeFetchImpl(async () => []);
    await expect(fetchTranscript({ videoId: 'abc123XYZ_-' })).rejects.toThrow(/manual transcript/);
  });

  it('throws manual-transcript fallback when captions are present but too short', async () => {
    __setYoutubeFetchImpl(async () => [{ text: 'too short', offset: 0, duration: 1, lang: 'en' }]);
    await expect(fetchTranscript({ url: 'https://youtu.be/abc123XYZ_-' })).rejects.toThrow(
      /manual transcript/,
    );
  });

  it('throws manual-transcript fallback when caption language is non-English', async () => {
    __setYoutubeFetchImpl(async () => makeLongCaptions('fr'));
    await expect(fetchTranscript({ videoId: 'abc123XYZ_-' })).rejects.toThrow(/manual transcript/);
  });

  it('routes audioUrl input → deepgram provider', async () => {
    __setDeepgramFetchImpl(async () => ({
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript: 'dg path',
                words: [{ word: 'dg', start: 0, end: 0.2, confidence: 0.9 }],
              },
            ],
          },
        ],
      },
      metadata: { language: 'en' },
    }));
    const result = await fetchTranscript({
      audioUrl: 'https://example.com/a.mp3',
    } as never);
    expect(result.source).toBe('deepgram');
  });

  it('throws when no input keys are supplied', async () => {
    await expect(fetchTranscript({})).rejects.toThrow(/requires one of/);
  });
});
