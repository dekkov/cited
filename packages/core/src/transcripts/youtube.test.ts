import { afterEach, describe, expect, it } from 'vitest';
import { extractVideoId } from './normalize';
import { __resetYoutubeFetchImpl, __setYoutubeFetchImpl, youtubeProvider } from './youtube';

describe('extractVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=abc123XYZ_-')).toBe('abc123XYZ_-');
  });
  it('extracts ID from youtu.be short URL', () => {
    expect(extractVideoId('https://youtu.be/abc123XYZ_-')).toBe('abc123XYZ_-');
  });
  it('extracts ID from /shorts/ URL', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-');
  });
  it('throws for non-URL garbage', () => {
    expect(() => extractVideoId('not a url')).toThrow(/Could not extract/);
  });
});

describe('youtubeProvider', () => {
  afterEach(() => __resetYoutubeFetchImpl());

  it('returns TranscriptResult with words derived from segments, joined rawText, source=youtube_captions', async () => {
    __setYoutubeFetchImpl(async () => [
      { text: 'hello world', offset: 0, duration: 2, lang: 'en' },
      { text: 'second segment here', offset: 2, duration: 3, lang: 'en' },
    ]);
    const result = await youtubeProvider.fetch({ videoId: 'abc123XYZ_-' });
    expect(result.source).toBe('youtube_captions');
    expect(result.videoId).toBe('abc123XYZ_-');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toEqual({ start: 0, end: 2, text: 'hello world' });
    expect(result.segments[1]).toEqual({ start: 2, end: 5, text: 'second segment here' });
    expect(result.rawText).toBe('hello world second segment here');
    // 2 + 3 = 5 words evenly split across segments
    expect(result.words).toHaveLength(5);
    expect(result.words[0]?.text).toBe('hello');
    expect(result.fetchedAt).toBeInstanceOf(Date);
  });

  it('defaults language to "en" when caption track lang is undefined', async () => {
    __setYoutubeFetchImpl(async () => [{ text: 'hi', offset: 0, duration: 1 }]);
    const result = await youtubeProvider.fetch({ videoId: 'abc123XYZ_-' });
    expect(result.language).toBe('en');
  });

  it('echoes language when caption track lang is provided', async () => {
    __setYoutubeFetchImpl(async () => [{ text: 'hi', offset: 0, duration: 1, lang: 'en-US' }]);
    const result = await youtubeProvider.fetch({ videoId: 'abc123XYZ_-' });
    expect(result.language).toBe('en-US');
  });

  it('throws when no captions are returned', async () => {
    __setYoutubeFetchImpl(async () => []);
    await expect(youtubeProvider.fetch({ videoId: 'abc123XYZ_-' })).rejects.toThrow(
      /No YouTube captions found/,
    );
  });
});
