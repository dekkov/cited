import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- mocks ----------

const mockSession = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: () => mockSession(),
}));
vi.mock('server-only', () => ({}));

const mockFetchTranscript = vi.fn();
const mockEmbedTranscriptChunks = vi.fn();
vi.mock('@cited/core', async () => {
  const actual = await vi.importActual<typeof import('@cited/core')>('@cited/core');
  return {
    ...actual,
    embedTranscriptChunks: (...args: unknown[]) => mockEmbedTranscriptChunks(...args),
  };
});
vi.mock('@cited/core/transcripts', async () => {
  const actual =
    await vi.importActual<typeof import('@cited/core/transcripts')>(
      '@cited/core/transcripts',
    );
  return {
    ...actual,
    fetchTranscript: (...args: unknown[]) => mockFetchTranscript(...args),
    extractVideoId: actual.extractVideoId,
  };
});

// In-memory DB mock — chainable per Drizzle's fluent API.
type Row = Record<string, unknown>;
const tables = {
  episode_blacklist: [] as Row[],
  podcasts: [] as Row[],
  episodes: [] as Row[],
  transcripts: [] as Row[],
  transcript_chunks: [] as Row[],
};

// Tag drizzle table objects with their kind so the mock select/insert/delete can route.
const tableKey = (t: unknown) => (t as { __k: keyof typeof tables }).__k;

vi.mock('@cited/db', () => {
  const mark = (k: keyof typeof tables): Record<string, unknown> => ({
    __k: k,
    id: 'id',
    youtubeVideoId: 'youtubeVideoId',
    episodeId: 'episodeId',
    videoId: 'videoId',
  });

  return {
    eq: (col: unknown, val: unknown) => ({ __op: 'eq', col, val }),
    podcasts: mark('podcasts'),
    episodes: mark('episodes'),
    transcripts: mark('transcripts'),
    transcriptChunks: mark('transcript_chunks'),
    episodeBlacklist: mark('episode_blacklist'),
    createDb: () => ({
      select: (_cols?: unknown) => ({
        from: (table: unknown) => {
          const k = tableKey(table);
          const base = tables[k];
          const builder = {
            where: (_pred: unknown) => Promise.resolve(base.slice()),
            limit: (_n: number) => Promise.resolve(base.slice(0, _n)),
          };
          // Make it awaitable directly too (returns all rows of that table).
          return Object.assign(Promise.resolve(base.slice()), builder);
        },
      }),
      insert: (table: unknown) => {
        const k = tableKey(table);
        return {
          values: (v: Row | Row[]) => {
            const rows = Array.isArray(v) ? v : [v];
            const withIds: Row[] = rows.map((r) => ({
              id: r.id ?? `id-${tables[k].length + 1}`,
              ...r,
            }));
            const apply = () => {
              // For episodes, dedupe on youtubeVideoId (mimics onConflictDoUpdate).
              if (k === 'episodes') {
                for (const r of withIds) {
                  const exists = tables.episodes.find((e) => e.youtubeVideoId === r.youtubeVideoId);
                  if (exists) Object.assign(exists, r, { id: exists.id });
                  else tables.episodes.push(r);
                }
              } else if (k === 'transcripts') {
                for (const r of withIds) {
                  const exists = tables.transcripts.find((t) => t.videoId === r.videoId);
                  if (exists) Object.assign(exists, r);
                  else tables.transcripts.push(r);
                }
              } else {
                tables[k].push(...withIds);
              }
            };
            const returning = (_cols?: unknown) => {
              apply();
              // Return matching rows from table (post-upsert) so callers can pick up resolved IDs.
              if (k === 'episodes') {
                const first = withIds[0];
                const last = first
                  ? tables.episodes.find((e) => e.youtubeVideoId === first.youtubeVideoId)
                  : undefined;
                return Promise.resolve(last ? [last] : []);
              }
              return Promise.resolve(withIds);
            };
            const onConflictDoUpdate = (_args: unknown) => ({
              returning,
              // biome-ignore lint/suspicious/noThenProperty: mimics Drizzle's awaitable QueryPromise
              then: (resolve: (v: unknown) => unknown) => {
                apply();
                return Promise.resolve(undefined).then(resolve);
              },
            });
            return {
              onConflictDoUpdate,
              returning,
              // biome-ignore lint/suspicious/noThenProperty: mimics Drizzle's awaitable QueryPromise
              then: (resolve: (v: unknown) => unknown) => {
                apply();
                return Promise.resolve(undefined).then(resolve);
              },
            };
          },
        };
      },
      delete: (table: unknown) => {
        const k = tableKey(table);
        return {
          where: (_pred: unknown) => {
            tables[k].length = 0; // Phase 2 tests only delete-all-for-episode patterns
            return Promise.resolve();
          },
        };
      },
    }),
  };
});

// ---------- imports under test ----------

import { POST } from './route';

const VID = 'dQw4w9WgXcQ';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function resetTables(): void {
  for (const k of Object.keys(tables) as Array<keyof typeof tables>) tables[k].length = 0;
}

// Build a synthetic TranscriptResult with N words.
function fakeTranscript(n: number) {
  const words = Array.from({ length: n }, (_, i) => ({
    text: `w${i}`,
    start: i * 0.5,
    end: (i + 1) * 0.5,
  }));
  return {
    videoId: VID,
    source: 'youtube_captions' as const,
    language: 'en',
    words,
    rawText: words.map((w) => w.text).join(' '),
    segments: [{ start: 0, end: n * 0.5, text: words.map((w) => w.text).join(' ') }],
    fetchedAt: new Date(),
  };
}

beforeEach(() => {
  resetTables();
  mockSession.mockReset();
  mockFetchTranscript.mockReset();
  mockEmbedTranscriptChunks.mockReset();
  process.env.DATABASE_URL = 'postgres://test';
  // Seed a default podcast so url-path doesn't 422 on "no podcast rows".
  tables.podcasts.push({ id: 'pod-1', name: 'Diary of a CEO' });
  // Default mock embedder returns 1536-dim vectors per input.
  mockEmbedTranscriptChunks.mockImplementation((texts: string[]) =>
    Promise.resolve(texts.map(() => new Array(1536).fill(0.1) as number[])),
  );
});

describe('POST /api/admin/ingest', () => {
  it('happy path — YouTube URL → 200 with chunkCount ≥ 1', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    mockFetchTranscript.mockResolvedValue(fakeTranscript(800));
    const res = await POST(makeRequest({ url: `https://www.youtube.com/watch?v=${VID}` }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      episodeId: string;
      transcriptVideoId: string;
      chunkCount: number;
    };
    expect(json.transcriptVideoId).toBe(VID);
    expect(json.chunkCount).toBeGreaterThanOrEqual(1);
    expect(tables.transcripts).toHaveLength(1);
    expect(tables.transcript_chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('malformed URL → 400 "Could not extract"', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    const res = await POST(makeRequest({ url: 'https://example.com/not-youtube' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/Could not extract/);
  });

  it('non-curator session → 401', async () => {
    mockSession.mockResolvedValue({ id: 'u2', email: 'r@x', role: 'user' });
    const res = await POST(makeRequest({ url: `https://youtu.be/${VID}` }));
    expect(res.status).toBe(401);
  });

  it('manualTranscript VTT path → 200 with source=manual', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'admin' });
    mockFetchTranscript.mockResolvedValue({ ...fakeTranscript(120), source: 'manual' });
    const res = await POST(
      makeRequest({
        manualTranscript: {
          podcastId: '00000000-0000-0000-0000-000000000001',
          youtubeVideoId: VID,
          title: 'Sleep ep',
          filename: 'episode.vtt',
          content:
            'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nhello world this is fifty plus characters of content here.\n',
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { source: string };
    expect(json.source).toBe('manual');
    expect(tables.transcripts[0]?.source).toBe('manual');
  });

  it('blacklisted episode → 403 "blacklisted"', async () => {
    tables.episode_blacklist.push({ youtubeVideoId: VID, reason: 'dmca' });
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    mockFetchTranscript.mockResolvedValue(fakeTranscript(100));
    const res = await POST(makeRequest({ url: `https://www.youtube.com/watch?v=${VID}` }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/blacklisted/);
    // Should not have proceeded to insert anything.
    expect(tables.transcripts).toHaveLength(0);
  });
});
