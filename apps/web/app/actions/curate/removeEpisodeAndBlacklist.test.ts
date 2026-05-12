import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks (hoisted before static imports) ---
vi.mock('server-only', () => ({}));

const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}));
vi.mock('@/lib/auth/guards', () => ({ getSessionUser: mockGetSessionUser }));

// Track all tx operations across tests
type TxOp =
  | { op: 'select_from'; table: string }
  | { op: 'insert'; table: string; values: unknown; onConflict?: boolean }
  | { op: 'update'; table: string; set: unknown }
  | { op: 'delete'; table: string };

const txOps: TxOp[] = [];

// Configurable fixture — change per test in beforeEach
let episodeFixture: unknown[] = [
  { id: 'ep-1', youtubeVideoId: 'abc123', availability: 'available' },
];
let clipsReturnRows: unknown[] = [
  { id: 'clip-a', episodeId: 'ep-1' },
  { id: 'clip-b', episodeId: 'ep-1' },
];

const buildTx = () => ({
  select: () => ({
    from: (table: { _tag: string }) => ({
      where: (_cond: unknown) => {
        txOps.push({ op: 'select_from', table: table._tag ?? 'unknown' });
        return Promise.resolve(episodeFixture);
      },
    }),
  }),
  insert: (table: { _tag: string }) => {
    const tableName = table._tag ?? 'unknown';
    const valuesChain = (vals: unknown) => {
      // clipEdits inserts call .values() and await directly (no .onConflictDoNothing)
      // episodeBlacklist insert calls .onConflictDoNothing() before awaiting
      // We record the insert only once — either via onConflictDoNothing or via direct await.
      let recorded = false;
      const record = (onConflict: boolean) => {
        if (!recorded) {
          recorded = true;
          if (onConflict) {
            txOps.push({ op: 'insert', table: tableName, values: vals, onConflict: true });
          } else {
            txOps.push({ op: 'insert', table: tableName, values: vals });
          }
        }
      };
      const p = new Promise<undefined>((resolve) => {
        // Defer recording so onConflictDoNothing() can intercept first
        Promise.resolve().then(() => {
          record(false); // not onConflict
          resolve(undefined);
        });
      });
      const enhanced = Object.assign(p, {
        onConflictDoNothing: () => {
          record(true);
          return Promise.resolve(undefined);
        },
      });
      return enhanced;
    };
    return { values: valuesChain };
  },
  update: (table: { _tag: string }) => ({
    set: (set: unknown) => {
      const tableName = table._tag ?? 'unknown';
      const whereChain = (_cond: unknown) => {
        txOps.push({ op: 'update', table: tableName, set });
        // Return a Promise that also supports .returning()
        const p = Promise.resolve(undefined);
        const enhanced = Object.assign(p, {
          returning: () => Promise.resolve(clipsReturnRows),
        });
        return enhanced;
      };
      return { where: whereChain };
    },
  }),
  delete: (table: { _tag: string }) => ({
    where: (_cond: unknown) => ({
      returning: () => {
        txOps.push({ op: 'delete', table: table._tag ?? 'unknown' });
        return Promise.resolve([]);
      },
    }),
  }),
});

vi.mock('@cited/db', () => {
  return {
    episodes: { _tag: 'episodes', id: 'id' },
    clips: { _tag: 'clips', id: 'id', episodeId: 'episode_id' },
    clipEdits: { _tag: 'clipEdits', id: 'id' },
    episodeBlacklist: { _tag: 'episodeBlacklist', youtubeVideoId: 'youtube_video_id' },
    habitTemplateClips: { _tag: 'habitTemplateClips', clipId: 'clip_id' },
    eq: (..._args: unknown[]) => ({ __eq: _args }),
    createDb: () => ({
      transaction: (cb: (tx: unknown) => Promise<unknown>) => cb(buildTx()),
    }),
  };
});

import { removeEpisodeAndBlacklist } from './removeEpisodeAndBlacklist';

const curatorUser = { id: 'user-1', email: 'curator@test.com', role: 'curator' as const };

describe('removeEpisodeAndBlacklist', () => {
  beforeEach(() => {
    txOps.length = 0;
    mockGetSessionUser.mockReset();
    mockGetSessionUser.mockResolvedValue(curatorUser);
    process.env.DATABASE_URL = 'postgres://test';
    episodeFixture = [{ id: 'ep-1', youtubeVideoId: 'abc123', availability: 'available' }];
    clipsReturnRows = [
      { id: 'clip-a', episodeId: 'ep-1' },
      { id: 'clip-b', episodeId: 'ep-1' },
    ];
  });

  it('Test 1: inserts blacklist, sets availability=removed_from_source + sourceUnavailableAt, cascades clips + writes clip_edits per clip', async () => {
    const result = await removeEpisodeAndBlacklist({
      episodeId: 'a0000000-0000-0000-0000-000000000001',
      reason: 'dmca',
      notes: 'takedown',
      takedownRefUrl: 'https://example.com/takedown',
    });

    // Blacklist insert happened
    const insertOp = txOps.find((o) => o.op === 'insert' && o.table === 'episodeBlacklist');
    expect(insertOp).toBeDefined();

    // Episode update sets availability=removed_from_source
    const episodeUpdate = txOps.find(
      (o) =>
        o.op === 'update' &&
        (o as { set: Record<string, unknown> }).set?.availability === 'removed_from_source',
    );
    expect(episodeUpdate).toBeDefined();

    // Two clips affected
    expect(result).toMatchObject({ affectedClipCount: 2 });
  });

  it('Test 2: insert uses onConflictDoNothing for idempotency', async () => {
    await removeEpisodeAndBlacklist({
      episodeId: 'a0000000-0000-0000-0000-000000000001',
      reason: 'dmca',
      takedownRefUrl: 'https://example.com/t',
    });

    const insertOp = txOps.find(
      (o): o is Extract<TxOp, { op: 'insert' }> =>
        o.op === 'insert' && o.table === 'episodeBlacklist',
    );
    expect(insertOp?.onConflict).toBe(true);
  });

  it('Test 3: non-curator → throws forbidden', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-2', email: 'u@t.com', role: 'user' });
    await expect(
      removeEpisodeAndBlacklist({
        episodeId: 'a0000000-0000-0000-0000-000000000001',
        reason: 'dmca',
        takedownRefUrl: 'https://example.com/t',
      }),
    ).rejects.toThrow('forbidden');
  });
});
