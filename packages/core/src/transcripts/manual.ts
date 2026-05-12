import { parseSync } from 'subtitle';
import { evenSplitWords } from './normalize';
import type {
  TranscriptFetchInput,
  TranscriptProvider,
  TranscriptResult,
  TranscriptSegment,
  WordTimestamped,
} from './types';

type ParsedCue = {
  type: 'cue';
  data: { start: number; end: number; text: string };
};

export const manualProvider: TranscriptProvider = {
  name: 'manual',
  canHandle(input: TranscriptFetchInput): boolean {
    return !!input.file;
  },
  async fetch(input: TranscriptFetchInput): Promise<TranscriptResult> {
    if (!input.file) throw new Error('manualProvider requires file input');
    const parsed = parseSync(input.file.content);
    const cues = parsed.filter((n): n is ParsedCue => n.type === 'cue');
    if (cues.length === 0) {
      throw new Error('No cues parsed from uploaded transcript');
    }
    // subtitle v4 returns start/end in milliseconds — convert to seconds.
    const segments: TranscriptSegment[] = cues.map((c) => ({
      start: c.data.start / 1000,
      end: c.data.end / 1000,
      text: c.data.text.replace(/<[^>]+>/g, '').trim(),
    }));
    const words: WordTimestamped[] = segments.flatMap((s) =>
      evenSplitWords(s.text, s.start, s.end),
    );
    const rawText = segments.map((s) => s.text).join(' ');
    return {
      videoId: input.videoId ?? 'manual-upload',
      source: 'manual',
      language: 'en',
      words,
      rawText,
      segments,
      fetchedAt: new Date(),
    };
  },
};
