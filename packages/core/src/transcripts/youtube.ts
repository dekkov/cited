import { evenSplitWords, extractVideoId } from './normalize';
import type {
  TranscriptFetchInput,
  TranscriptProvider,
  TranscriptResult,
  TranscriptSegment,
  WordTimestamped,
} from './types';

/** Shape returned by youtube-transcript-plus@2 — `offset` + `duration` are SECONDS. */
type YtRawSegment = {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
};

/**
 * Hoisted impl so tests can inject a mock via `__setYoutubeFetchImpl`.
 * Production path dynamic-imports youtube-transcript-plus and calls its named export.
 */
let youtubeFetchImpl: (videoId: string) => Promise<YtRawSegment[]> = async (videoId) => {
  const mod = await import('youtube-transcript-plus');
  const segments = await mod.fetchTranscript(videoId, { lang: 'en' });
  // The library returns TranscriptSegment[] in this overload — cast through unknown
  // because our local YtRawSegment narrows `lang` to optional for the mock seam.
  return segments as unknown as YtRawSegment[];
};

export function __setYoutubeFetchImpl(impl: typeof youtubeFetchImpl): void {
  youtubeFetchImpl = impl;
}

export function __resetYoutubeFetchImpl(): void {
  youtubeFetchImpl = async (videoId) => {
    const mod = await import('youtube-transcript-plus');
    const segments = await mod.fetchTranscript(videoId, { lang: 'en' });
    return segments as unknown as YtRawSegment[];
  };
}

export const youtubeProvider: TranscriptProvider = {
  name: 'youtube_captions',
  canHandle(input: TranscriptFetchInput): boolean {
    return !!(input.url || input.videoId);
  },
  async fetch(input: TranscriptFetchInput): Promise<TranscriptResult> {
    const videoId = input.videoId ?? extractVideoId(input.url ?? '');
    const raw = await youtubeFetchImpl(videoId);
    if (!raw || raw.length === 0) {
      throw new Error(`No YouTube captions found for ${videoId}`);
    }
    const language = raw[0]?.lang ?? 'en';
    // youtube-transcript-plus v2: offset + duration are in SECONDS already.
    const segments: TranscriptSegment[] = raw.map((s) => ({
      start: s.offset,
      end: s.offset + s.duration,
      text: s.text,
    }));
    const words: WordTimestamped[] = segments.flatMap((seg) =>
      evenSplitWords(seg.text, seg.start, seg.end),
    );
    const rawText = segments.map((s) => s.text).join(' ');
    return {
      videoId,
      source: 'youtube_captions',
      language,
      words,
      rawText,
      segments,
      fetchedAt: new Date(),
    };
  },
};
