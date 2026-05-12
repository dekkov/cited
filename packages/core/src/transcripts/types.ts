export type TranscriptSource = 'youtube_captions' | 'deepgram' | 'manual';

export type WordTimestamped = {
  text: string;
  start: number; // seconds, float
  end: number; // seconds, float
  confidence?: number; // 0..1 (deepgram), undefined for YouTube captions
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptResult = {
  videoId: string;
  source: TranscriptSource;
  language: string; // 'en', 'en-US', etc
  words: WordTimestamped[];
  rawText: string; // joined for tsvector + display
  segments: TranscriptSegment[];
  fetchedAt: Date;
};

export type TranscriptFetchInput = {
  url?: string;
  videoId?: string;
  file?: { name: string; content: string };
};

export interface TranscriptProvider {
  name: TranscriptSource;
  canHandle(input: TranscriptFetchInput): boolean;
  fetch(input: TranscriptFetchInput): Promise<TranscriptResult>;
}
