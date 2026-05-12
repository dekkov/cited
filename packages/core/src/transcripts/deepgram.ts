import type {
  TranscriptFetchInput,
  TranscriptProvider,
  TranscriptResult,
  TranscriptSegment,
  WordTimestamped,
} from './types';

type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
};

type DeepgramResult = {
  results: {
    channels: Array<{
      alternatives: Array<{ words: DeepgramWord[]; transcript: string }>;
    }>;
    utterances?: Array<{ start: number; end: number; transcript: string }>;
  };
  metadata?: { language?: string };
};

/**
 * Real fetch impl uses @deepgram/sdk v5 (class-based client).
 * Path: client.listen.v1.media.transcribeUrl({ url, model, ... }) — see SDK v5 docs.
 * In Phase 2 this is dead code (orchestrator never reaches Deepgram for a YouTube URL);
 * the test seam below replaces this in tests. Phase 5 worker exercises the real path.
 */
let deepgramFetchImpl: (audioUrl: string) => Promise<DeepgramResult> = async (audioUrl) => {
  const sdk = await import('@deepgram/sdk');
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not configured');
  const client = new sdk.DeepgramClient({ apiKey: apiKey });
  const result = await client.listen.v1.media.transcribeUrl({
    url: audioUrl,
    model: 'nova-3',
    smart_format: true,
    punctuate: true,
    diarize: true,
    utterances: true,
    language: 'en',
  });
  return result as unknown as DeepgramResult;
};

export function __setDeepgramFetchImpl(impl: typeof deepgramFetchImpl): void {
  deepgramFetchImpl = impl;
}

export function __resetDeepgramFetchImpl(): void {
  deepgramFetchImpl = async (audioUrl) => {
    const sdk = await import('@deepgram/sdk');
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) throw new Error('DEEPGRAM_API_KEY is not configured');
    const client = new sdk.DeepgramClient({ apiKey: apiKey });
    const result = await client.listen.v1.media.transcribeUrl({
      url: audioUrl,
      model: 'nova-3',
      smart_format: true,
      punctuate: true,
      diarize: true,
      utterances: true,
      language: 'en',
    });
    return result as unknown as DeepgramResult;
  };
}

export type DeepgramFetchInput = TranscriptFetchInput & { audioUrl?: string };

export const deepgramProvider: TranscriptProvider = {
  name: 'deepgram',
  canHandle(input: TranscriptFetchInput): boolean {
    return !!(input as DeepgramFetchInput).audioUrl;
  },
  async fetch(input: TranscriptFetchInput): Promise<TranscriptResult> {
    const dgInput = input as DeepgramFetchInput;
    if (!dgInput.audioUrl) {
      throw new Error('deepgramProvider requires audioUrl input');
    }
    const result = await deepgramFetchImpl(dgInput.audioUrl);
    const alt = result.results?.channels?.[0]?.alternatives?.[0];
    const dgWords = alt?.words ?? [];
    if (dgWords.length === 0) {
      throw new Error('Deepgram returned no words');
    }
    const words: WordTimestamped[] = dgWords.map((w) => ({
      text: w.punctuated_word ?? w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));
    const utterances = result.results.utterances ?? [];
    const segments: TranscriptSegment[] =
      utterances.length > 0
        ? utterances.map((u) => ({ start: u.start, end: u.end, text: u.transcript }))
        : [
            {
              // biome-ignore lint/style/noNonNullAssertion: words length > 0 verified above
              start: words[0]!.start,
              // biome-ignore lint/style/noNonNullAssertion: words length > 0 verified above
              end: words[words.length - 1]!.end,
              text: alt?.transcript ?? words.map((w) => w.text).join(' '),
            },
          ];
    const rawText = alt?.transcript ?? words.map((w) => w.text).join(' ');
    return {
      videoId: dgInput.videoId ?? 'deepgram-source',
      source: 'deepgram',
      language: result.metadata?.language ?? 'en',
      words,
      rawText,
      segments,
      fetchedAt: new Date(),
    };
  },
};
