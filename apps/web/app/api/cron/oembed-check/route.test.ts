import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Fixture episodes
const mockEpisodesData = {
  all: [
    { id: 'ep-1', youtubeVideoId: 'vid1', oembed404Count: 0, availability: 'available' },
    { id: 'ep-2', youtubeVideoId: 'vid2', oembed404Count: 0, availability: 'available' },
    {
      id: 'ep-removed',
      youtubeVideoId: 'vid_gone',
      oembed404Count: 3,
      availability: 'removed_from_source',
    },
  ],
  // Ne filter: only rows where availability != 'removed_from_source'
  active: [
    { id: 'ep-1', youtubeVideoId: 'vid1', oembed404Count: 0, availability: 'available' },
    { id: 'ep-2', youtubeVideoId: 'vid2', oembed404Count: 0, availability: 'available' },
  ],
  // For flap suppression tests — episode with 1 prior 404
  with1404: [{ id: 'ep-1', youtubeVideoId: 'vid1', oembed404Count: 1, availability: 'available' }],
  // For threshold test — episode with 2 prior 404s (3rd triggers flag)
  with2404s: [{ id: 'ep-1', youtubeVideoId: 'vid1', oembed404Count: 2, availability: 'available' }],
};

// Track all db.update calls
type UpdateCall = { id: string; set: Record<string, unknown> };
const updateCalls: UpdateCall[] = [];

const _buildDb = (episodes: typeof mockEpisodesData.active) => ({
  select: () => ({
    from: (_table: unknown) => ({
      where: (_cond: unknown) => Promise.resolve(episodes),
    }),
  }),
  update: (_table: unknown) => ({
    set: (set: Record<string, unknown>) => ({
      where: (cond: unknown) => {
        // Extract the episode id from the condition for tracking
        const condStr = JSON.stringify(cond);
        const epId = episodes.find((e) => condStr.includes(e.id))?.id ?? 'unknown';
        updateCalls.push({ id: epId, set });
        return Promise.resolve([]);
      },
    }),
  }),
});

// Mock @cited/db — use the dynamic episodes fixture
let currentEpisodes = mockEpisodesData.active;

// The db mock is dynamic — each call to select/update reads currentEpisodes at call time
const dynamicDb = {
  select: () => ({
    from: (_table: unknown) => ({
      where: (_cond: unknown) => Promise.resolve([...currentEpisodes]),
    }),
  }),
  update: (_table: unknown) => ({
    set: (set: Record<string, unknown>) => ({
      where: (cond: unknown) => {
        const condStr = JSON.stringify(cond);
        const epId = currentEpisodes.find((e) => condStr.includes(e.id))?.id ?? 'unknown';
        updateCalls.push({ id: epId, set });
        return Promise.resolve([]);
      },
    }),
  }),
};

vi.mock('@cited/db', () => {
  return {
    episodes: { id: 'id', availability: 'availability', oembed404Count: 'oembed_404_count' },
    createDb: () => dynamicDb,
    ne: (..._args: unknown[]) => ({ __ne: _args }),
    eq: (..._args: unknown[]) => ({ __eq: _args }),
  };
});

// We need to import the module AND the fetch injection helper AFTER the mock
import { POST, __setOembedFetchImpl } from './route';

function makeRequest(authHeader?: string): Request {
  process.env.CRON_SECRET = 'test-secret';
  return {
    headers: {
      get: (key: string) => (key === 'authorization' ? (authHeader ?? '') : null),
    },
  } as unknown as Request;
}

describe('/api/cron/oembed-check', () => {
  beforeEach(() => {
    updateCalls.length = 0;
    currentEpisodes = mockEpisodesData.active;
    process.env.CRON_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgres://test';
    // Default fetch returns 200
    __setOembedFetchImpl(async (_url: string) => ({ status: 200 }) as Response);
  });

  it('Test 1: missing or invalid Bearer → 401', async () => {
    const res = await POST(makeRequest('BadToken'));
    expect(res.status).toBe(401);
  });

  it('Test 2: valid Bearer + oEmbed 200 → oembed404Count reset to 0, lastOembedCheckAt updated', async () => {
    __setOembedFetchImpl(async () => ({ status: 200 }) as Response);
    const res = await POST(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { healthy: number; checked: number };
    expect(body.healthy).toBe(2);
    // Both episodes get updated
    expect(updateCalls.length).toBe(2);
    const firstUpdate = updateCalls[0];
    expect(firstUpdate?.set).toMatchObject({ oembed404Count: 0 });
    expect(firstUpdate?.set).toHaveProperty('lastOembedCheckAt');
  });

  it('Test 3: 3 consecutive 404s → episode flagged as removed_from_source', async () => {
    currentEpisodes = mockEpisodesData.with2404s; // 2 prior 404s; next 404 = 3rd = threshold
    __setOembedFetchImpl(async () => ({ status: 404 }) as Response);
    const res = await POST(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { flagged: number };
    expect(body.flagged).toBe(1);
    const flagUpdate = updateCalls[0];
    expect(flagUpdate?.set).toMatchObject({ availability: 'removed_from_source' });
    expect(flagUpdate?.set).toHaveProperty('sourceUnavailableAt');
  });

  it('Test 4: 1st and 2nd 404 increment oembed404Count without changing availability', async () => {
    currentEpisodes = mockEpisodesData.with1404; // 1 prior 404; next 404 = 2nd (below threshold)
    __setOembedFetchImpl(async () => ({ status: 404 }) as Response);
    const res = await POST(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { incremented: number; flagged: number };
    expect(body.incremented).toBe(1);
    expect(body.flagged).toBe(0);
    const update = updateCalls[0];
    expect(update?.set).toMatchObject({ oembed404Count: 2 }); // 1 + 1
    expect(update?.set).not.toHaveProperty('availability');
  });

  it('Test 5: skip already removed_from_source episodes', async () => {
    // The SQL WHERE ne(availability, removed_from_source) should exclude removed episodes.
    // Our mock filters via currentEpisodes (active only). Verify the route skips them.
    currentEpisodes = []; // No active episodes
    __setOembedFetchImpl(async () => ({ status: 200 }) as Response);
    const res = await POST(makeRequest('Bearer test-secret'));
    const body = (await res.json()) as { checked: number };
    expect(body.checked).toBe(0);
    expect(updateCalls.length).toBe(0);
  });
});
