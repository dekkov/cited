---
phase: 02-curation-tooling-doac-corpus
plan: 02
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - packages/core/src/transcripts/index.ts
  - packages/core/src/transcripts/types.ts
  - packages/core/src/transcripts/youtube.ts
  - packages/core/src/transcripts/deepgram.ts
  - packages/core/src/transcripts/manual.ts
  - packages/core/src/transcripts/normalize.ts
  - packages/core/src/transcripts/orchestrator.ts
  - packages/core/src/transcripts/youtube.test.ts
  - packages/core/src/transcripts/deepgram.test.ts
  - packages/core/src/transcripts/manual.test.ts
  - packages/core/src/transcripts/orchestrator.test.ts
  - packages/core/src/index.ts
autonomous: true
requirements: [ADMN-12]
must_haves:
  truths:
    - "fetchTranscript() returns a TranscriptResult given a YouTube URL"
    - "When YouTube auto-captions are missing or low-confidence, Deepgram is invoked"
    - "Manual VTT/SRT upload produces the same TranscriptResult shape as YouTube/Deepgram"
    - "TranscriptResult.words contain start/end seconds aligned with the rawText"
  artifacts:
    - path: "packages/core/src/transcripts/types.ts"
      provides: "TranscriptResult, WordTimestamped, TranscriptProvider interface"
    - path: "packages/core/src/transcripts/orchestrator.ts"
      provides: "fetchTranscript() orchestrator (YouTube → Deepgram → manual)"
    - path: "packages/core/src/transcripts/youtube.ts"
      provides: "YouTube auto-caption provider via youtube-transcript-plus"
    - path: "packages/core/src/transcripts/deepgram.ts"
      provides: "Deepgram Nova-3 prerecorded fallback provider"
    - path: "packages/core/src/transcripts/manual.ts"
      provides: "VTT/SRT manual upload provider via subtitle package"
  key_links:
    - from: "packages/core/src/transcripts/orchestrator.ts"
      to: "youtube.ts / deepgram.ts / manual.ts"
      via: "imported provider modules dispatched by source"
      pattern: "from './(youtube|deepgram|manual)'"
    - from: "packages/core/src/transcripts/youtube.ts"
      to: "youtube-transcript-plus"
      via: "import { fetchTranscript } from 'youtube-transcript-plus'"
      pattern: "youtube-transcript-plus"
---

<objective>
Build the `packages/core/src/transcripts/` provider abstraction (GA3 — Path D). Three concrete providers — YouTube auto-captions (via `youtube-transcript-plus`), Deepgram Nova-3 prerecorded fallback (via `@deepgram/sdk`), manual VTT/SRT upload (via `subtitle`) — implement a single `TranscriptProvider` interface. An `orchestrator` function tries YouTube first, falls back to Deepgram when captions are missing or non-English/low-confidence, and uses manual when a file is supplied. All three return a normalized `TranscriptResult` shape that downstream plans (chunking, embedding, transcript pane render) consume.

Purpose: Isolate the transcript-fetch concern behind a contract so the rest of Phase 2 never depends on YouTube/Deepgram specifics. The orchestrator is testable with mocked providers; Plan 03 wires it into the ingestion route.

Output: Six TypeScript files in `packages/core/src/transcripts/` + four vitest test files; orchestrator exported from `packages/core/src/index.ts`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md
@.planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md
@packages/core/src/index.ts
@packages/core/src/llm/provider.ts
@packages/core/src/llm/registry.ts

<interfaces>
Existing core package pattern (packages/core/src/llm/provider.ts):
```ts
export interface LlmProvider {
  name: string;
  complete(opts: LlmCallOpts): Promise<LlmResponse>;
  ...
}
```
Mirror this shape for `TranscriptProvider` — `name` + a single async fetch method + a `canHandle` predicate.

Existing barrel (packages/core/src/index.ts): currently re-exports llm. Append transcripts re-export at the end.

`youtube-transcript-plus` API (per its README, verify with `npm view youtube-transcript-plus`):
- Default export or named export `fetchTranscript(videoIdOrUrl, options)` returns `Array<{ text: string, duration: number, offset: number, lang?: string }>` (segment-level). For word-level we synthesize by even split if needed — initial version uses segment timestamps and treats each segment as a single "word group" of words; refinement deferred.
- Set `lang: 'en'` and pass custom `fetch` for proxy support.

`@deepgram/sdk` v3 API:
```ts
import { createClient } from '@deepgram/sdk';
const dg = createClient(apiKey);
const { result } = await dg.listen.prerecorded.transcribeUrl(
  { url: 'https://www.youtube.com/watch?v=...' },  // Deepgram cannot fetch YouTube directly — need audio URL
  { model: 'nova-3', smart_format: true, punctuate: true, diarize: true, utterances: true, language: 'en' }
);
// result.results.channels[0].alternatives[0].words: Array<{ word, start, end, confidence, speaker }>
```
NOTE: Deepgram cannot transcribe a YouTube URL directly — Phase 2 limitation: when Deepgram fallback triggers, the curator MUST upload a transcript manually (route to manual provider). This is documented as a Phase 2 limitation in the orchestrator. (Phase 5 worker will download audio via yt-dlp.)

`subtitle` package API:
```ts
import { parseSync } from 'subtitle';
const cues = parseSync(vttOrSrtString);
// Array<{ type: 'cue', data: { start, end, text } }>
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Define the TranscriptProvider contract types + barrel</name>
  <files>
    packages/core/src/transcripts/types.ts,
    packages/core/src/transcripts/index.ts,
    packages/core/src/index.ts
  </files>
  <read_first>
    - packages/core/src/index.ts (current barrel — append transcripts export)
    - packages/core/src/llm/provider.ts + packages/core/src/llm/types.ts (mirror shape and export style)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 1 TranscriptProvider Abstraction"
  </read_first>
  <behavior>
    - `WordTimestamped` type has `text: string`, `start: number`, `end: number`, optional `confidence: number`
    - `TranscriptResult` type has `videoId`, `source` ('youtube_captions'|'deepgram'|'manual'), `language`, `words: WordTimestamped[]`, `rawText`, `segments: Array<{start,end,text}>`, `fetchedAt: Date`
    - `TranscriptProvider` interface has `name: string`, `canHandle(input)`, `fetch(input): Promise<TranscriptResult>`
    - Barrel `packages/core/src/transcripts/index.ts` re-exports types + orchestrator entry
    - Root barrel `packages/core/src/index.ts` re-exports transcripts
  </behavior>
  <action>
Create `packages/core/src/transcripts/types.ts` VERBATIM:
```ts
export type TranscriptSource = 'youtube_captions' | 'deepgram' | 'manual';

export type WordTimestamped = {
  text: string;
  start: number;        // seconds, float
  end: number;          // seconds, float
  confidence?: number;  // 0..1 (deepgram), undefined for YouTube captions
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptResult = {
  videoId: string;
  source: TranscriptSource;
  language: string;     // 'en', 'en-US', etc
  words: WordTimestamped[];
  rawText: string;      // joined for tsvector + display
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
```

Create `packages/core/src/transcripts/index.ts` VERBATIM:
```ts
export * from './types';
export { fetchTranscript } from './orchestrator';
export { extractVideoId } from './normalize';
```

Append to `packages/core/src/index.ts` (preserve existing llm re-exports):
```ts
export * from './transcripts';
```
  </action>
  <verify>
    <automated>pnpm --filter @hdiary/core exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export interface TranscriptProvider" packages/core/src/transcripts/types.ts` exits 0
    - `grep -q "export type TranscriptResult" packages/core/src/transcripts/types.ts` exits 0
    - `grep -q "export \* from './transcripts'" packages/core/src/index.ts` exits 0
    - `pnpm --filter @hdiary/core exec tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Types compile; barrel exports reachable.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement YouTube + manual providers + normalize util (TDD with mock fetch)</name>
  <files>
    packages/core/src/transcripts/normalize.ts,
    packages/core/src/transcripts/youtube.ts,
    packages/core/src/transcripts/manual.ts,
    packages/core/src/transcripts/youtube.test.ts,
    packages/core/src/transcripts/manual.test.ts
  </files>
  <read_first>
    - packages/core/src/transcripts/types.ts (Task 1 contract)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 1" + §"Pitfall 1 YouTube caption fetch breaks silently" + §"Pitfall 7 Word-level timestamp drift"
  </read_first>
  <behavior>
    youtube.test.ts:
      - Test 1: extractVideoId("https://www.youtube.com/watch?v=abc123XYZ_-") returns "abc123XYZ_-"
      - Test 2: extractVideoId("https://youtu.be/abc123XYZ_-") returns "abc123XYZ_-"
      - Test 3: extractVideoId("https://www.youtube.com/shorts/abc123XYZ_-") returns "abc123XYZ_-"
      - Test 4: extractVideoId("not a url") throws
      - Test 5: youtubeProvider.fetch with mocked youtube-transcript-plus returns TranscriptResult with words[] derived from segments, rawText joined, source='youtube_captions'
      - Test 6: youtubeProvider.fetch returns language='en' when caption track lang is 'en' or undefined; throws when no captions
    manual.test.ts:
      - Test 1: parsing a 3-cue VTT string yields 3 segments with correct start/end
      - Test 2: parsing an SRT string with same cues yields equivalent result
      - Test 3: rawText is the joined cue text
      - Test 4: words[] approximates 1 word per ~0.5s within each cue (even split)
  </behavior>
  <action>
Create `packages/core/src/transcripts/normalize.ts`:
```ts
export function extractVideoId(input: string): string {
  // Accept full URLs (watch?v=, youtu.be/, /shorts/) or raw 11-char IDs
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const m =
    input.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    input.match(/\/shorts\/([A-Za-z0-9_-]{11})/) ||
    input.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (!m) throw new Error(`Could not extract YouTube video ID from: ${input}`);
  return m[1]!;
}

export function evenSplitWords(text: string, start: number, end: number) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const duration = Math.max(end - start, 0.001);
  const per = duration / tokens.length;
  return tokens.map((t, i) => ({
    text: t,
    start: start + i * per,
    end: start + (i + 1) * per,
  }));
}
```

Create `packages/core/src/transcripts/youtube.ts`:
```ts
import type {
  TranscriptFetchInput, TranscriptProvider, TranscriptResult, TranscriptSegment, WordTimestamped,
} from './types';
import { extractVideoId, evenSplitWords } from './normalize';

// Hoisted for test injection: tests replace `youtubeFetchImpl` with a mock before calling provider.
export let youtubeFetchImpl: (videoId: string) => Promise<Array<{ text: string; duration: number; offset: number; lang?: string }>> =
  async (videoId) => {
    const mod = await import('youtube-transcript-plus');
    // The package exports `fetchTranscript` (verify at install time — fallback to `.default` if needed)
    const fn = (mod as any).fetchTranscript ?? (mod as any).default ?? mod;
    return fn(videoId, { lang: 'en' });
  };

export function __setYoutubeFetchImpl(impl: typeof youtubeFetchImpl) {
  youtubeFetchImpl = impl;
}

export const youtubeProvider: TranscriptProvider = {
  name: 'youtube_captions',
  canHandle(input) {
    return !!(input.url || input.videoId);
  },
  async fetch(input: TranscriptFetchInput): Promise<TranscriptResult> {
    const videoId = input.videoId ?? extractVideoId(input.url!);
    const raw = await youtubeFetchImpl(videoId);
    if (!raw || raw.length === 0) {
      throw new Error(`No YouTube captions found for ${videoId}`);
    }
    const language = raw[0]?.lang ?? 'en';
    const segments: TranscriptSegment[] = raw.map((s) => ({
      start: s.offset / 1000,                            // offset is ms in some versions; if seconds, divide test against fixture
      end: (s.offset + s.duration) / 1000,
      text: s.text,
    }));
    const words: WordTimestamped[] = segments.flatMap((seg) => evenSplitWords(seg.text, seg.start, seg.end));
    const rawText = segments.map((s) => s.text).join(' ');
    return {
      videoId, source: 'youtube_captions', language,
      words, rawText, segments,
      fetchedAt: new Date(),
    };
  },
};
```

Create `packages/core/src/transcripts/manual.ts`:
```ts
import { parseSync } from 'subtitle';
import type { TranscriptFetchInput, TranscriptProvider, TranscriptResult, TranscriptSegment, WordTimestamped } from './types';
import { evenSplitWords } from './normalize';

export const manualProvider: TranscriptProvider = {
  name: 'manual',
  canHandle(input) {
    return !!input.file;
  },
  async fetch(input: TranscriptFetchInput): Promise<TranscriptResult> {
    if (!input.file) throw new Error('manualProvider requires file input');
    const parsed = parseSync(input.file.content);
    const cues = parsed.filter((n: any) => n.type === 'cue') as Array<{ type: 'cue'; data: { start: number; end: number; text: string } }>;
    if (cues.length === 0) throw new Error('No cues parsed from uploaded transcript');
    const segments: TranscriptSegment[] = cues.map((c) => ({
      start: c.data.start / 1000,         // subtitle returns ms
      end: c.data.end / 1000,
      text: c.data.text.replace(/<[^>]+>/g, '').trim(),
    }));
    const words: WordTimestamped[] = segments.flatMap((s) => evenSplitWords(s.text, s.start, s.end));
    const rawText = segments.map((s) => s.text).join(' ');
    return {
      videoId: input.videoId ?? 'manual-upload',
      source: 'manual',
      language: 'en',
      words, rawText, segments,
      fetchedAt: new Date(),
    };
  },
};
```

Create `packages/core/src/transcripts/youtube.test.ts` and `manual.test.ts` per behavior block above — use `__setYoutubeFetchImpl` for the YouTube test fixture; manual.test.ts uses a small inline VTT/SRT literal.

VTT fixture for tests:
```
WEBVTT

00:00:01.000 --> 00:00:03.500
Hello world this is one cue

00:00:03.500 --> 00:00:06.000
Second cue with more words

00:00:06.000 --> 00:00:08.000
Final cue
```
  </action>
  <verify>
    <automated>pnpm --filter @hdiary/core exec vitest run transcripts/youtube.test.ts transcripts/manual.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `pnpm --filter @hdiary/core exec vitest run transcripts/youtube.test.ts` exits 0 with all 6 tests passing
    - `pnpm --filter @hdiary/core exec vitest run transcripts/manual.test.ts` exits 0 with all 4 tests passing
    - `grep -q "export const youtubeProvider: TranscriptProvider" packages/core/src/transcripts/youtube.ts` exits 0
    - `grep -q "export const manualProvider: TranscriptProvider" packages/core/src/transcripts/manual.ts` exits 0
  </acceptance_criteria>
  <done>YouTube + manual providers compile, tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement Deepgram provider + orchestrator with YouTube → Deepgram → manual dispatch</name>
  <files>
    packages/core/src/transcripts/deepgram.ts,
    packages/core/src/transcripts/orchestrator.ts,
    packages/core/src/transcripts/deepgram.test.ts,
    packages/core/src/transcripts/orchestrator.test.ts
  </files>
  <read_first>
    - packages/core/src/transcripts/types.ts (contract)
    - packages/core/src/transcripts/youtube.ts (mock-injection pattern to mirror)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 1 TranscriptProvider Abstraction" §"Pitfall 1"
  </read_first>
  <behavior>
    deepgram.test.ts:
      - Test 1: Given a mock Deepgram response with 3 words, fetch returns TranscriptResult with source='deepgram', words[] populated with confidence, language echoed
      - Test 2: Empty words[] from Deepgram throws
      - Test 3: deepgramProvider.canHandle({audioUrl: '...'}) === true; canHandle({url: 'youtube...'}) === false (Phase 2 Deepgram is audio-URL or manual-content only, not YouTube URL)
    orchestrator.test.ts (uses mocked youtube/deepgram providers via __set* injection):
      - Test 1: File input → manual provider used
      - Test 2: YouTube URL with captions returning >50 English words → youtube_captions result returned
      - Test 3: YouTube URL with captions returning empty/non-English → falls back, but since Deepgram cannot fetch YouTube URLs (Phase 2 limitation), throws an explicit "captions missing — upload manual transcript" error containing the string 'manual transcript'
      - Test 4: audioUrl input (Phase 5-style) → deepgram provider used
  </behavior>
  <action>
Create `packages/core/src/transcripts/deepgram.ts`:
```ts
import type {
  TranscriptFetchInput, TranscriptProvider, TranscriptResult, TranscriptSegment, WordTimestamped,
} from './types';

type DeepgramWord = { word: string; start: number; end: number; confidence: number; punctuated_word?: string };
type DeepgramResult = {
  results: { channels: Array<{ alternatives: Array<{ words: DeepgramWord[]; transcript: string }> }>; utterances?: Array<{ start: number; end: number; transcript: string }> };
  metadata?: { language?: string };
};

export let deepgramFetchImpl: (audioUrl: string) => Promise<DeepgramResult> = async (audioUrl) => {
  const { createClient } = await import('@deepgram/sdk');
  const dg = createClient(process.env['DEEPGRAM_API_KEY']!);
  const { result, error } = await dg.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    { model: 'nova-3', smart_format: true, punctuate: true, diarize: true, utterances: true, language: 'en' },
  );
  if (error) throw error;
  return result as unknown as DeepgramResult;
};

export function __setDeepgramFetchImpl(impl: typeof deepgramFetchImpl) {
  deepgramFetchImpl = impl;
}

export type DeepgramFetchInput = TranscriptFetchInput & { audioUrl?: string };

export const deepgramProvider: TranscriptProvider = {
  name: 'deepgram',
  canHandle(input: DeepgramFetchInput) {
    return !!input.audioUrl;
  },
  async fetch(input: DeepgramFetchInput): Promise<TranscriptResult> {
    if (!input.audioUrl) throw new Error('deepgramProvider requires audioUrl input');
    const result = await deepgramFetchImpl(input.audioUrl);
    const alt = result.results?.channels?.[0]?.alternatives?.[0];
    const dgWords = alt?.words ?? [];
    if (dgWords.length === 0) throw new Error('Deepgram returned no words');
    const words: WordTimestamped[] = dgWords.map((w) => ({
      text: w.punctuated_word ?? w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));
    const segments: TranscriptSegment[] = (result.results.utterances ?? []).map((u) => ({
      start: u.start, end: u.end, text: u.transcript,
    }));
    const rawText = alt?.transcript ?? words.map((w) => w.text).join(' ');
    return {
      videoId: input.videoId ?? 'deepgram-source',
      source: 'deepgram',
      language: result.metadata?.language ?? 'en',
      words, rawText,
      segments: segments.length > 0 ? segments : [{ start: words[0]!.start, end: words[words.length - 1]!.end, text: rawText }],
      fetchedAt: new Date(),
    };
  },
};
```

Create `packages/core/src/transcripts/orchestrator.ts`:
```ts
import type { TranscriptFetchInput, TranscriptResult } from './types';
import { youtubeProvider } from './youtube';
import { manualProvider } from './manual';
import { deepgramProvider, type DeepgramFetchInput } from './deepgram';

export type OrchestratorInput = TranscriptFetchInput & { audioUrl?: string };

export async function fetchTranscript(input: OrchestratorInput): Promise<TranscriptResult> {
  // 1) Manual upload wins if a file is supplied
  if (input.file) return manualProvider.fetch(input);

  // 2) Audio URL → Deepgram (Phase 5-style; rare in Phase 2)
  if (input.audioUrl) return deepgramProvider.fetch(input as DeepgramFetchInput);

  // 3) YouTube URL/videoId path: try captions, fall back with a clear curator-facing error
  if (input.url || input.videoId) {
    try {
      const yt = await youtubeProvider.fetch(input);
      if (yt.words.length > 50 && (yt.language === 'en' || yt.language.startsWith('en-'))) {
        return yt;
      }
      // Captions present but too short / wrong language → fallback path
    } catch {
      // YouTube captions missing or fetch failed → fallback
    }
    // Phase 2 limitation: Deepgram cannot transcribe a YouTube URL directly (no audio extraction in this phase).
    // Curator must paste a manual transcript via the ingestion form.
    throw new Error(
      'YouTube auto-captions are missing or too short. Phase 2 fallback: upload a manual transcript (VTT/SRT/txt). Audio extraction lands in Phase 5.',
    );
  }

  throw new Error('fetchTranscript requires one of: url, videoId, file, audioUrl');
}
```

Create `packages/core/src/transcripts/deepgram.test.ts` and `packages/core/src/transcripts/orchestrator.test.ts` per behavior block. Tests use `__setYoutubeFetchImpl` / `__setDeepgramFetchImpl` to inject mocks.
  </action>
  <verify>
    <automated>pnpm --filter @hdiary/core exec vitest run transcripts/</automated>
  </verify>
  <acceptance_criteria>
    - All four transcripts tests (youtube, manual, deepgram, orchestrator) exit 0
    - `grep -q "export async function fetchTranscript" packages/core/src/transcripts/orchestrator.ts` exits 0
    - `grep -q "manual transcript" packages/core/src/transcripts/orchestrator.ts` exits 0 (the error message contract)
    - `grep -q "model: 'nova-3'" packages/core/src/transcripts/deepgram.ts` exits 0
  </acceptance_criteria>
  <done>Orchestrator dispatches correctly; manual fallback error is clear; tests green.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @hdiary/core exec tsc --noEmit` exits 0
- `pnpm --filter @hdiary/core exec vitest run transcripts/` exits 0 with all four test files green
- `fetchTranscript`, `TranscriptResult`, `TranscriptProvider`, `extractVideoId` exported from `@hdiary/core`
</verification>

<success_criteria>
1. Single `fetchTranscript()` entrypoint dispatches across YouTube / Deepgram / manual providers.
2. Each provider implements the `TranscriptProvider` contract; swap surface is one file each.
3. Phase 2 limitation is encoded as an explicit curator-facing error message ("Phase 2 fallback: upload a manual transcript") — no silent fallback to Deepgram for a YouTube URL.
4. Provider impl modules expose `__set*FetchImpl` test seams so downstream plans can integration-test ingestion without hitting external APIs.
</success_criteria>

<output>
After completion, create `.planning/phases/02-curation-tooling-doac-corpus/02-02-SUMMARY.md`.
</output>
