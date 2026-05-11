---
phase: 02-curation-tooling-doac-corpus
plan: 03
type: execute
wave: 3
depends_on: ["02-01", "02-02"]
files_modified:
  - apps/web/lib/curate/chunking.ts
  - apps/web/lib/curate/chunking.test.ts
  - packages/core/src/embeddings/embedClip.ts
  - packages/core/src/embeddings/embedTranscriptChunks.ts
  - packages/core/src/embeddings/embedTranscriptChunks.test.ts
  - packages/core/src/embeddings/index.ts
  - packages/core/src/index.ts
  - apps/web/app/api/admin/ingest/route.ts
  - apps/web/app/api/admin/ingest/route.test.ts
  - apps/web/app/actions/curate/addPodcast.ts
  - apps/web/app/actions/curate/addPodcast.test.ts
  - apps/web/app/actions/curate/schemas.ts
autonomous: true
requirements: [ADMN-04, ADMN-12, ADMN-13, ADMN-16]
must_haves:
  truths:
    - "Posting a YouTube URL to /api/admin/ingest fetches captions, persists transcripts row, chunks + batch-embeds into transcript_chunks"
    - "embedClip(claim, rationale) returns a 1536-dim vector via OpenAI text-embedding-3-small"
    - "embedTranscriptChunks batches calls (≤100 inputs per OpenAI request) and inserts vectors with HNSW-indexed column"
    - "addPodcast server action inserts podcasts row when curator adds a new source from the ingestion form (ADMN-16)"
    - "Manual VTT/SRT upload path stores the transcript and chunks/embeds it identically to the YouTube path"
  artifacts:
    - path: "apps/web/lib/curate/chunking.ts"
      provides: "chunkTranscript() — 512-token sliding window with 64-token overlap"
    - path: "packages/core/src/embeddings/embedClip.ts"
      provides: "Single-vector embedding for clip claim+rationale"
    - path: "packages/core/src/embeddings/embedTranscriptChunks.ts"
      provides: "Batched embedding for transcript chunks"
    - path: "apps/web/app/api/admin/ingest/route.ts"
      provides: "POST handler: URL or file → transcript → chunks → embed → persist"
    - path: "apps/web/app/actions/curate/addPodcast.ts"
      provides: "ADMN-16 inline add-podcast server action"
  key_links:
    - from: "apps/web/app/api/admin/ingest/route.ts"
      to: "@hdiary/core fetchTranscript + embedTranscriptChunks"
      via: "fetchTranscript({url}) then chunkTranscript then embedTranscriptChunks"
      pattern: "fetchTranscript|embedTranscriptChunks"
    - from: "packages/core/src/embeddings/*.ts"
      to: "packages/core/src/llm/registry.getEmbeddings()"
      via: "AION-09 wrapper — no direct OpenAI SDK imports outside llm/"
      pattern: "getEmbeddings\(\)"
---

<objective>
Implement the transcript ingestion pipeline behind `POST /api/admin/ingest` (ADMN-12 + ADMN-13) plus the embedding utilities Plans 04–05 will consume: `embedClip()` (single vector for clip approval) and `embedTranscriptChunks()` (batched, ≤100 inputs/call, OpenAI text-embedding-3-small). The route accepts either a YouTube URL or a pasted VTT/SRT body, runs the Plan 02 `fetchTranscript` orchestrator, persists the `transcripts` row, runs `chunkTranscript` (Plan 03 task), and writes 1536-dim vectors into `transcript_chunks`. The inline "add podcast" server action (ADMN-16) lives here because the ingestion form is its consumer.

Purpose: Land the data flow that makes the corpus searchable (ADMN-13) before clips are extracted from it. Phase 3's onboarding RAG can already cite ingested-but-unclipped episodes once this plan is green.

Output: chunking util, two embeddings utilities, one route handler, one server action, and their tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md
@.planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md
@packages/db/src/schema/transcripts.ts
@packages/db/src/schema/transcript-chunks.ts
@packages/db/src/schema/episodes.ts
@packages/db/src/schema/podcasts.ts
@packages/db/src/client.ts
@packages/core/src/llm/registry.ts
@packages/core/src/transcripts/orchestrator.ts

<interfaces>
From Plan 02:
- `fetchTranscript({url?, file?, videoId?}): Promise<TranscriptResult>`
- `TranscriptResult.words: WordTimestamped[]`, `.rawText: string`, `.segments`, `.language`, `.source`, `.videoId`, `.fetchedAt`

From Phase 1 schema (`packages/db/src/client.ts`):
- `db` Drizzle client exported. Use `db.insert(transcripts).values(...)`, `db.insert(transcriptChunks).values(...)`, `db.insert(episodes)...`.

From Phase 1 LLM wrapper (packages/core/src/llm/registry.ts):
- `getEmbeddings(): EmbeddingProvider` returns `{ embed: ({input: string|string[]}) => Promise<{embeddings: number[][]}> }`
- Default provider is OpenAI `text-embedding-3-small`, 1536 dims.

Existing Drizzle schema columns for `transcript_chunks` (packages/db/src/schema/transcript-chunks.ts):
```ts
id, episodeId (FK), chunkIndex, content, startSeconds, endSeconds, embedding vector(1536)
```
Insertion shape:
```ts
{ episodeId, chunkIndex, content: chunk.text, startSeconds: chunk.startSeconds, endSeconds: chunk.endSeconds, embedding: vector }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Implement chunkTranscript util + embedding utilities (embedClip, embedTranscriptChunks) with batched calls</name>
  <files>
    apps/web/lib/curate/chunking.ts,
    apps/web/lib/curate/chunking.test.ts,
    packages/core/src/embeddings/embedClip.ts,
    packages/core/src/embeddings/embedTranscriptChunks.ts,
    packages/core/src/embeddings/embedTranscriptChunks.test.ts,
    packages/core/src/embeddings/index.ts,
    packages/core/src/index.ts
  </files>
  <read_first>
    - packages/core/src/llm/registry.ts (use `getEmbeddings()` — do NOT import @ai-sdk/openai directly here; AION-09 forbids it)
    - packages/core/src/transcripts/types.ts (WordTimestamped shape)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 4 Transcript Chunking" + §"Pitfall 2 Embedding cost explosion"
  </read_first>
  <behavior>
    chunking.test.ts:
      - Test 1: 1000 words with default opts → ~Math.ceil(1000 / (683-85)) ≈ 2 chunks, each with startSeconds/endSeconds derived from word boundaries
      - Test 2: overlap is honored — consecutive chunks share `overlapWords` worth of text
      - Test 3: words=[] returns []
      - Test 4: each chunk has chunkIndex starting at 0
    embedTranscriptChunks.test.ts (with injected mock embedder via __setEmbeddingsImpl):
      - Test 1: 250 chunks → mock embedder called 3 times (100, 100, 50)
      - Test 2: returned vectors are 1536-dim (mocked)
      - Test 3: insertion side effect not asserted here (route test handles it) — this test only verifies batching arithmetic and return shape
  </behavior>
  <action>
Create `apps/web/lib/curate/chunking.ts` VERBATIM:
```ts
import type { WordTimestamped } from '@hdiary/core';

export type TranscriptChunk = {
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export function chunkTranscript(
  words: WordTimestamped[],
  opts: { tokensPerChunk?: number; overlapTokens?: number } = {},
): TranscriptChunk[] {
  const tokensPerChunk = opts.tokensPerChunk ?? 512;
  const overlapTokens = opts.overlapTokens ?? 64;
  // English heuristic: 1 token ≈ 0.75 words
  const wordsPerChunk = Math.round(tokensPerChunk / 0.75);
  const overlapWords = Math.round(overlapTokens / 0.75);
  const stride = wordsPerChunk - overlapWords;
  const chunks: TranscriptChunk[] = [];
  for (let i = 0; i < words.length; i += stride) {
    const slice = words.slice(i, i + wordsPerChunk);
    if (slice.length === 0) break;
    chunks.push({
      chunkIndex: chunks.length,
      startSeconds: Math.floor(slice[0]!.start),
      endSeconds: Math.ceil(slice[slice.length - 1]!.end),
      text: slice.map((w) => w.text).join(' '),
    });
    if (i + wordsPerChunk >= words.length) break;
  }
  return chunks;
}
```

Create `packages/core/src/embeddings/embedClip.ts`:
```ts
import { getEmbeddings } from '../llm/registry';

// embedClip — single-vector embedding of `${claim}\n\n${rationale}` for ADMN-04 embed-on-approve.
export async function embedClip(input: { claim: string; rationale?: string | null }): Promise<number[]> {
  const text = input.rationale ? `${input.claim}\n\n${input.rationale}` : input.claim;
  const provider = getEmbeddings();
  const result = await provider.embed({ input: [text] });
  const vec = result.embeddings[0];
  if (!vec || vec.length !== 1536) {
    throw new Error(`embedClip: expected 1536-dim vector, got ${vec?.length ?? 0}`);
  }
  return vec;
}
```

Create `packages/core/src/embeddings/embedTranscriptChunks.ts`:
```ts
import { getEmbeddings } from '../llm/registry';

export const BATCH_SIZE = 100;

export async function embedTranscriptChunks(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = getEmbeddings();
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const result = await provider.embed({ input: batch });
    for (const v of result.embeddings) {
      if (v.length !== 1536) throw new Error(`embedTranscriptChunks: expected 1536-dim vector, got ${v.length}`);
      out.push(v);
    }
  }
  return out;
}
```

Create `packages/core/src/embeddings/index.ts`:
```ts
export { embedClip } from './embedClip';
export { embedTranscriptChunks, BATCH_SIZE } from './embedTranscriptChunks';
```

Append to `packages/core/src/index.ts`:
```ts
export * from './embeddings';
```

For tests, since `getEmbeddings()` reads from `registry`, add a test-only seam: extend `packages/core/src/llm/registry.ts` with an internal override. Add at the bottom:
```ts
let _override: import('./provider').EmbeddingProvider | null = null;
export function __setEmbeddingsForTest(p: import('./provider').EmbeddingProvider | null) { _override = p; }
const _orig = getEmbeddings;
export function getEmbeddings(): import('./provider').EmbeddingProvider { return _override ?? _orig(); }
```
(NOTE: the existing `getEmbeddings` is `export function`, not `const`. Approach: rename existing implementation to `_realGetEmbeddings`, then export a new `getEmbeddings` that consults `_override`. Executor must read the file and adapt accordingly — keep the public API identical.)

embedTranscriptChunks.test.ts:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { embedTranscriptChunks, BATCH_SIZE } from './embedTranscriptChunks';
import { __setEmbeddingsForTest } from '../llm/registry';

describe('embedTranscriptChunks', () => {
  let calls: string[][] = [];
  beforeEach(() => {
    calls = [];
    __setEmbeddingsForTest({
      name: 'mock',
      async embed({ input }) {
        const arr = Array.isArray(input) ? input : [input];
        calls.push(arr);
        return { embeddings: arr.map(() => new Array(1536).fill(0.1)), provider: 'mock', model: 'mock' };
      },
    });
  });
  afterEach(() => __setEmbeddingsForTest(null));

  it('batches at BATCH_SIZE=100', async () => {
    const texts = Array.from({ length: 250 }, (_, i) => `chunk ${i}`);
    const vectors = await embedTranscriptChunks(texts);
    expect(vectors).toHaveLength(250);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toHaveLength(100);
    expect(calls[2]).toHaveLength(50);
  });

  it('returns 1536-dim vectors', async () => {
    const vectors = await embedTranscriptChunks(['one']);
    expect(vectors[0]).toHaveLength(1536);
  });

  it('empty input returns empty array without calling provider', async () => {
    const vectors = await embedTranscriptChunks([]);
    expect(vectors).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
```

chunking.test.ts:
```ts
import { describe, it, expect } from 'vitest';
import { chunkTranscript } from './chunking';

const mkWords = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ text: `w${i}`, start: i * 0.5, end: (i + 1) * 0.5 }));

describe('chunkTranscript', () => {
  it('returns [] for empty input', () => {
    expect(chunkTranscript([])).toEqual([]);
  });
  it('produces ~2 chunks for 1000 words', () => {
    const chunks = chunkTranscript(mkWords(1000));
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].chunkIndex).toBe(0);
  });
  it('chunks have monotonic chunkIndex and start/end seconds', () => {
    const chunks = chunkTranscript(mkWords(1500));
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i);
      expect(c.endSeconds).toBeGreaterThanOrEqual(c.startSeconds);
    });
  });
});
```
  </action>
  <verify>
    <automated>pnpm --filter @hdiary/core exec vitest run embeddings/ && pnpm --filter web exec vitest run lib/curate/chunking.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export function chunkTranscript" apps/web/lib/curate/chunking.ts` exits 0
    - `grep -q "export async function embedClip" packages/core/src/embeddings/embedClip.ts` exits 0
    - `grep -q "BATCH_SIZE = 100" packages/core/src/embeddings/embedTranscriptChunks.ts` exits 0
    - `grep -q "export \* from './embeddings'" packages/core/src/index.ts` exits 0
    - All three test files pass
    - No direct `@ai-sdk/openai` or `openai` imports in `apps/web/lib/curate/` or `packages/core/src/embeddings/` (enforced by Biome noRestrictedImports from Phase 1 — confirm `grep -r "from '@ai-sdk/openai'" packages/core/src/embeddings/` returns nothing)
  </acceptance_criteria>
  <done>Chunking + batched embeddings green; ready for the ingestion route.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Implement addPodcast server action + shared zod schemas for curation</name>
  <files>
    apps/web/app/actions/curate/schemas.ts,
    apps/web/app/actions/curate/addPodcast.ts,
    apps/web/app/actions/curate/addPodcast.test.ts
  </files>
  <read_first>
    - packages/db/src/schema/podcasts.ts (target table: id, name, host, trustTier integer default 1)
    - packages/db/src/client.ts (db export pattern)
    - apps/web/app/auth/ or apps/web/lib/auth (Phase 1 getSessionUser pattern — find via `grep -r "getSessionUser" apps/web/`) for curator role gate
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA3" + §"GA7"
    - .planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md §"Surface-Specific Layout Contracts" #4
  </read_first>
  <behavior>
    addPodcast.test.ts:
      - Test 1: Calling addPodcast({name: 'Diary of a CEO', host: 'Steven Bartlett', trustTier: 5}) returns inserted row with id
      - Test 2: Zod rejects empty name
      - Test 3: trustTier defaults to 1 when omitted
      - Test 4: Non-curator session throws auth error (mock getSessionUser to return user role)
  </behavior>
  <action>
Create `apps/web/app/actions/curate/schemas.ts`:
```ts
import { z } from 'zod';

export const domainEnum = z.enum(['sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health']);
export const speakerStatusEnum = z.enum(['verified', 'unverified', 'host']);
export const riskFlagEnum = z.enum(['medical_advice', 'supplement', 'contraindication', 'general']);

export const addPodcastSchema = z.object({
  name: z.string().min(1).max(200),
  host: z.string().max(200).optional(),
  trustTier: z.number().int().min(1).max(5).default(1),
});

export const ingestUrlSchema = z.object({
  url: z.string().url().optional(),
  manualTranscript: z.object({
    podcastId: z.string().uuid(),
    youtubeVideoId: z.string().min(11).max(11),
    title: z.string().optional(),
    content: z.string().min(50),
    filename: z.string(),
  }).optional(),
}).refine((d) => !!d.url || !!d.manualTranscript, {
  message: 'Provide either url or manualTranscript',
});

export type AddPodcastInput = z.infer<typeof addPodcastSchema>;
export type IngestInput = z.infer<typeof ingestUrlSchema>;
```

Create `apps/web/app/actions/curate/addPodcast.ts`:
```ts
'use server';
import { db } from '@hdiary/db';
import { podcasts } from '@hdiary/db/schema';
import { getSessionUser } from '@/lib/auth';
import { addPodcastSchema, type AddPodcastInput } from './schemas';

export async function addPodcast(input: AddPodcastInput) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = addPodcastSchema.parse(input);
  const [row] = await db.insert(podcasts).values(parsed).returning();
  return row;
}
```

Adjust import paths in `addPodcast.ts` to match Phase 1 conventions — if `getSessionUser` lives at a different path (executor: `grep -rn "function getSessionUser" apps/web/lib/`), use that exact import.

Create `addPodcast.test.ts` per behavior block. Use a vitest mock for `@/lib/auth` and an in-memory mock of `db.insert(...).values(...).returning()`. Pattern (mirror Phase 1 server-action tests — executor: `find apps/web -name "*.test.ts" -path "*/actions/*"` for an example).
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run app/actions/curate/addPodcast.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export const addPodcastSchema" apps/web/app/actions/curate/schemas.ts` exits 0
    - `grep -q "'use server'" apps/web/app/actions/curate/addPodcast.ts` exits 0
    - `grep -q "forbidden" apps/web/app/actions/curate/addPodcast.ts` exits 0
    - Test exits 0 with all 4 cases passing
  </acceptance_criteria>
  <done>Curator-gated addPodcast action covered by tests; shared zod schemas exported for the ingestion route.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Implement POST /api/admin/ingest route handler — URL or manual content → transcript → chunks → embeddings → persistence</name>
  <files>
    apps/web/app/api/admin/ingest/route.ts,
    apps/web/app/api/admin/ingest/route.test.ts
  </files>
  <read_first>
    - apps/web/app/actions/curate/schemas.ts (Task 2 — ingestUrlSchema)
    - packages/core/src/transcripts/orchestrator.ts (Plan 02 — fetchTranscript signature)
    - apps/web/lib/curate/chunking.ts (Task 1 — chunkTranscript)
    - packages/core/src/embeddings/embedTranscriptChunks.ts (Task 1)
    - packages/db/src/schema/transcripts.ts + transcript-chunks.ts + episodes.ts (target inserts)
    - packages/db/src/client.ts (db export)
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA3 — Transcript Ingestion"
    - .planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md §"4. Transcript ingestion form"
  </read_first>
  <behavior>
    route.test.ts (mocks fetchTranscript via dependency injection or vi.mock):
      - Test 1: POST with valid YouTube URL → 200 JSON `{ episodeId, transcriptVideoId, chunkCount }`; mock fetchTranscript returns 150 words → expect chunkCount >= 1
      - Test 2: POST with malformed URL → 400 with error message containing 'Could not extract'
      - Test 3: POST without curator session → 401 forbidden
      - Test 4: POST with manualTranscript object containing VTT content → 200; transcripts row inserted with source='manual'
      - Test 5: Blacklisted youtube_video_id (insert episode_blacklist row first in test setup) → 403 with 'blacklisted' in error message
  </behavior>
  <action>
Create `apps/web/app/api/admin/ingest/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { db } from '@hdiary/db';
import {
  episodes, podcasts, transcripts, transcriptChunks, episodeBlacklist,
} from '@hdiary/db/schema';
import { eq } from 'drizzle-orm';
import { fetchTranscript, extractVideoId } from '@hdiary/core';
import { chunkTranscript } from '@/lib/curate/chunking';
import { embedTranscriptChunks } from '@hdiary/core';
import { ingestUrlSchema } from '@/app/actions/curate/schemas';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }
  const parsed = ingestUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  // 1) Resolve videoId + ensure not blacklisted
  let videoId: string;
  try {
    videoId = parsed.data.url
      ? extractVideoId(parsed.data.url)
      : parsed.data.manualTranscript!.youtubeVideoId;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const [bl] = await db.select().from(episodeBlacklist).where(eq(episodeBlacklist.youtubeVideoId, videoId));
  if (bl) {
    return NextResponse.json({ error: `episode is blacklisted (reason: ${bl.reason})` }, { status: 403 });
  }

  // 2) Fetch transcript via orchestrator
  let transcript;
  try {
    transcript = parsed.data.manualTranscript
      ? await fetchTranscript({
          videoId,
          file: { name: parsed.data.manualTranscript.filename, content: parsed.data.manualTranscript.content },
        })
      : await fetchTranscript({ url: parsed.data.url! });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  // 3) Upsert episode (Phase 2 single-curator: pick default podcast OR require explicit podcastId in manual path)
  const podcastId =
    parsed.data.manualTranscript?.podcastId ??
    // YouTube URL path: default to first podcast row (Phase 2 single curator). ADMN-16 inline-add lives in the UI form.
    (await db.select().from(podcasts).limit(1))[0]?.id;
  if (!podcastId) {
    return NextResponse.json({ error: 'no podcast rows in db — use ADMN-16 inline add first' }, { status: 422 });
  }
  const [episode] = await db
    .insert(episodes)
    .values({
      podcastId,
      youtubeVideoId: videoId,
      title: parsed.data.manualTranscript?.title,
    })
    .onConflictDoUpdate({
      target: episodes.youtubeVideoId,
      set: { updatedAt: new Date() },
    })
    .returning();

  // 4) Persist transcripts row (upsert)
  await db
    .insert(transcripts)
    .values({
      videoId,
      source: transcript.source,
      segments: transcript.segments,
      rawText: transcript.rawText,
      language: transcript.language,
    })
    .onConflictDoUpdate({
      target: transcripts.videoId,
      set: { source: transcript.source, segments: transcript.segments, rawText: transcript.rawText, language: transcript.language, fetchedAt: new Date() },
    });

  // 5) Chunk + embed + insert transcript_chunks (delete any existing for the episode to make re-ingest idempotent)
  await db.delete(transcriptChunks).where(eq(transcriptChunks.episodeId, episode.id));
  const chunks = chunkTranscript(transcript.words);
  const vectors = await embedTranscriptChunks(chunks.map((c) => c.text));
  if (chunks.length > 0) {
    await db.insert(transcriptChunks).values(
      chunks.map((c, i) => ({
        episodeId: episode.id,
        chunkIndex: c.chunkIndex,
        content: c.text,
        startSeconds: c.startSeconds,
        endSeconds: c.endSeconds,
        embedding: vectors[i],
      })),
    );
  }

  return NextResponse.json({
    episodeId: episode.id,
    transcriptVideoId: videoId,
    chunkCount: chunks.length,
    source: transcript.source,
  });
}
```

Create `route.test.ts` per behavior block. Use vi.mock to stub `@hdiary/core` for `fetchTranscript` and `embedTranscriptChunks`, and a transactional test DB helper (executor: reuse `tests/helpers/testDb.ts` if Phase 1 provides it; otherwise mock `@hdiary/db` module).
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run app/api/admin/ingest/route.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export async function POST" apps/web/app/api/admin/ingest/route.ts` exits 0
    - `grep -q "episodeBlacklist" apps/web/app/api/admin/ingest/route.ts` exits 0
    - `grep -q "fetchTranscript" apps/web/app/api/admin/ingest/route.ts` exits 0
    - `grep -q "embedTranscriptChunks" apps/web/app/api/admin/ingest/route.ts` exits 0
    - All 5 route tests pass; non-curator returns 401, blacklisted returns 403, invalid URL returns 400, happy path returns 200 with chunkCount
  </acceptance_criteria>
  <done>End-to-end ingestion pipeline runs in-process under test; persistence is idempotent on re-ingest.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @hdiary/core exec vitest run` exits 0
- `pnpm --filter web exec vitest run app/api/admin/ingest/ app/actions/curate/ lib/curate/` exits 0
- POSTing a sample VTT to `/api/admin/ingest` via integration test inserts rows into `transcripts` and `transcript_chunks` with 1536-dim embeddings
- AION-09 wrapper rule preserved: no direct `@ai-sdk/openai` import in `apps/web/lib/curate/` or `packages/core/src/embeddings/`
</verification>

<success_criteria>
1. Ingestion route accepts both YouTube URL and manual VTT/SRT upload paths.
2. `transcripts` row + N `transcript_chunks` rows (with 1536-dim vectors) persist per ingest.
3. Re-ingesting the same video is idempotent (delete-then-insert chunks; upsert transcripts and episodes).
4. Embedding calls are batched at 100 inputs/call (Pitfall 2 avoided).
5. Blacklisted videos rejected with 403.
6. ADMN-16 inline-add-podcast server action is wired and curator-gated.
</success_criteria>

<output>
After completion, create `.planning/phases/02-curation-tooling-doac-corpus/02-03-SUMMARY.md`.
</output>
