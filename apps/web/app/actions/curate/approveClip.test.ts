import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- mocks ----------

const mockSession = vi.fn();
const mockEmbedClip = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: () => mockSession(),
}));

vi.mock('@cited/core', () => ({
  embedClip: (input: { claim: string; rationale: string | null }) => mockEmbedClip(input),
}));

// Capture writes so tests can inspect what reached the DB.
type Insert = { table: 'clips' | 'clipEdits'; values: Record<string, unknown> };
type Update = { table: 'clips' | 'clipEdits'; set: Record<string, unknown>; where: unknown };
const writes: { inserts: Insert[]; updates: Update[] } = { inserts: [], updates: [] };

let updatedClipRow: Record<string, unknown> | null = null;

function makeInsertBuilder(table: 'clips' | 'clipEdits') {
  return {
    values: (v: Record<string, unknown>) => {
      writes.inserts.push({ table, values: v });
      return Promise.resolve();
    },
  };
}

function makeUpdateBuilder(table: 'clips' | 'clipEdits') {
  return {
    set: (s: Record<string, unknown>) => ({
      where: (w: unknown) => {
        writes.updates.push({ table, set: s, where: w });
        // Awaitable Promise that also exposes .returning() for the production
        // `db.update(...).set(...).where(...).returning()` chain.
        const settled = Promise.resolve(undefined) as Promise<unknown> & {
          returning?: (_cols?: unknown) => Promise<unknown[]>;
        };
        settled.returning = (_cols?: unknown) => {
          if (table === 'clips') {
            return Promise.resolve(updatedClipRow ? [updatedClipRow] : []);
          }
          return Promise.resolve([]);
        };
        return settled;
      },
    }),
  };
}

const mockTx = {
  insert: (table: { _tag: 'clips' | 'clipEdits' }) => makeInsertBuilder(table._tag),
  update: (table: { _tag: 'clips' | 'clipEdits' }) => makeUpdateBuilder(table._tag),
};

vi.mock('@cited/db', () => {
  const clips = { _tag: 'clips' as const, id: 'id' };
  const clipEdits = { _tag: 'clipEdits' as const, id: 'id' };
  return {
    clips,
    clipEdits,
    eq: (..._args: unknown[]) => ({ __eq: _args }),
    createDb: () => ({
      transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
      insert: (table: { _tag: 'clips' | 'clipEdits' }) => makeInsertBuilder(table._tag),
      update: (table: { _tag: 'clips' | 'clipEdits' }) => makeUpdateBuilder(table._tag),
    }),
  };
});

vi.mock('server-only', () => ({}));

// ---------- tests ----------

import { approveClip } from './approveClip';

const validInput = {
  clipId: '11111111-1111-1111-1111-111111111111',
  claim: 'Sleeping seven hours improves consolidation of declarative memory.',
  rationale: 'Matthew Walker references a meta-analysis showing memory consolidation effects.',
  speaker: 'Matthew Walker',
  speakerStatus: 'verified' as const,
  domain: 'sleep' as const,
  riskFlags: ['general' as const],
  startSec: 100,
  endSec: 170,
};

describe('approveClip', () => {
  beforeEach(() => {
    writes.inserts.length = 0;
    writes.updates.length = 0;
    mockSession.mockReset();
    mockEmbedClip.mockReset();
    updatedClipRow = {
      id: validInput.clipId,
      status: 'approved',
      claim: validInput.claim,
      rationale: validInput.rationale,
    };
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('happy path: updates clip, inserts clip_edits action=approved, then embeds and writes action=embedded', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    mockEmbedClip.mockResolvedValue(new Array(1536).fill(0.1));
    const res = await approveClip(validInput);
    expect(res.embeddingPending).toBe(false);
    expect(res.status).toBe('approved');
    // first insert (in tx): clip_edits 'approved'
    expect(writes.inserts[0]?.table).toBe('clipEdits');
    expect(writes.inserts[0]?.values).toMatchObject({ action: 'approved', source: 'manual' });
    // second insert (post-embed): clip_edits 'embedded'
    expect(writes.inserts[1]?.table).toBe('clipEdits');
    expect(writes.inserts[1]?.values).toMatchObject({ action: 'embedded' });
    // updates: clips status+fields, then clips embedding
    expect(writes.updates[0]?.table).toBe('clips');
    expect(writes.updates[0]?.set).toMatchObject({ status: 'approved' });
    expect(writes.updates[1]?.table).toBe('clips');
    expect(writes.updates[1]?.set).toHaveProperty('embedding');
  });

  it('rejects empty riskFlags via zod (no DB writes)', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    await expect(approveClip({ ...validInput, riskFlags: [] as never })).rejects.toThrow(
      /risk_flags is mandatory/,
    );
    expect(writes.inserts).toHaveLength(0);
    expect(writes.updates).toHaveLength(0);
  });

  it('rejects hard-block content (dosing) with MEDICAL_REVIEW.md message', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    await expect(
      approveClip({
        ...validInput,
        claim: 'Take 500mg of magnesium glycinate at bedtime for better sleep.',
      }),
    ).rejects.toThrow(/MEDICAL_REVIEW\.md/);
    expect(writes.inserts).toHaveLength(0);
  });

  it('embed failure: clip stays approved, clip_edits action=embed_failed logged, no throw to caller', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    mockEmbedClip.mockRejectedValue(new Error('OpenAI 503'));
    const res = await approveClip(validInput);
    expect(res.embeddingPending).toBe(true);
    expect(res.status).toBe('approved');
    const failedRow = writes.inserts.find(
      (i) => i.table === 'clipEdits' && i.values.action === 'embed_failed',
    );
    expect(failedRow).toBeTruthy();
    expect(failedRow?.values.payload).toMatchObject({ error: 'OpenAI 503' });
  });

  it('forbids non-curator/non-admin sessions', async () => {
    mockSession.mockResolvedValue({ id: 'u2', email: 'r@x', role: 'user' });
    await expect(approveClip(validInput)).rejects.toThrow(/forbidden/);
    expect(writes.inserts).toHaveLength(0);
  });
});
