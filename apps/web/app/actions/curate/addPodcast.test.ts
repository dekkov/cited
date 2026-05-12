import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- mocks ----------

const mockSession = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: () => mockSession(),
}));

// Capture insert payloads so tests can inspect what reached the DB layer.
const inserted: Array<Record<string, unknown>> = [];
let nextInsertedRow: Record<string, unknown> | null = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Diary of a CEO',
  host: 'Steven Bartlett',
  trustTier: 5,
};

vi.mock('@cited/db', () => {
  const podcasts = {
    id: 'id',
    name: 'name',
    host: 'host',
    trustTier: 'trustTier',
  } as const;
  return {
    podcasts,
    createDb: () => ({
      insert: (_table: unknown) => ({
        values: (v: Record<string, unknown>) => ({
          returning: (_cols?: unknown) => {
            inserted.push(v);
            return nextInsertedRow ? Promise.resolve([nextInsertedRow]) : Promise.resolve([]);
          },
        }),
      }),
    }),
  };
});

// server-only is a Next.js sentinel — stub it for the test runner.
vi.mock('server-only', () => ({}));

// ---------- tests ----------

import { addPodcast } from './addPodcast';

describe('addPodcast', () => {
  beforeEach(() => {
    inserted.length = 0;
    mockSession.mockReset();
    nextInsertedRow = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Diary of a CEO',
      host: 'Steven Bartlett',
      trustTier: 5,
    };
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('inserts a podcast for a curator session and returns the row', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    const row = await addPodcast({ name: 'Diary of a CEO', host: 'Steven Bartlett', trustTier: 5 });
    expect(row.id).toBeTruthy();
    expect(inserted[0]).toMatchObject({
      name: 'Diary of a CEO',
      host: 'Steven Bartlett',
      trustTier: 5,
    });
  });

  it('rejects empty name via zod', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    await expect(addPodcast({ name: '', trustTier: 1 } as never)).rejects.toThrow();
  });

  it('defaults trustTier to 1 when omitted', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'admin' });
    nextInsertedRow = { id: 'p2', name: 'New Pod', host: null, trustTier: 1 };
    await addPodcast({ name: 'New Pod' } as never);
    expect(inserted[0]).toMatchObject({ name: 'New Pod', trustTier: 1, host: null });
  });

  it('throws forbidden for a non-curator/admin user', async () => {
    mockSession.mockResolvedValue({ id: 'u2', email: 'r@x', role: 'user' });
    await expect(addPodcast({ name: 'X', trustTier: 1 })).rejects.toThrow(/forbidden/);
    expect(inserted).toHaveLength(0);
  });

  it('throws forbidden for an unauthenticated request', async () => {
    mockSession.mockResolvedValue(null);
    await expect(addPodcast({ name: 'X', trustTier: 1 })).rejects.toThrow(/forbidden/);
    expect(inserted).toHaveLength(0);
  });
});
