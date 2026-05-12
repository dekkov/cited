import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks (must be hoisted before static imports) ---
vi.mock('server-only', () => ({}));

// Use vi.hoisted to create mocks that are available inside factory functions
const { mockGetSessionUser } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
}));
vi.mock('@/lib/auth/guards', () => ({ getSessionUser: mockGetSessionUser }));

// Track calls for test assertions
type TxCall = { op: 'update' | 'insert' | 'delete'; args: unknown[] };
const txCalls: TxCall[] = [];

// Shared tx mock — same instance across tests; tests inspect txCalls
const makeTx = (updateReturnRows: unknown[], deleteReturnRows: unknown[]) => ({
  update: (_table: unknown) => ({
    set: (vals: unknown) => ({
      where: (_cond: unknown) => ({
        returning: () => {
          txCalls.push({ op: 'update', args: [vals] });
          return Promise.resolve(updateReturnRows);
        },
      }),
    }),
  }),
  delete: (_table: unknown) => ({
    where: (_cond: unknown) => ({
      returning: () => {
        txCalls.push({ op: 'delete', args: [] });
        return Promise.resolve(deleteReturnRows);
      },
    }),
  }),
  insert: (_table: unknown) => ({
    values: (vals: unknown) => {
      txCalls.push({ op: 'insert', args: [vals] });
      return Promise.resolve();
    },
  }),
});

let currentTxConfig = {
  updateRows: [
    { id: 'clip-1', removedAt: new Date(), removalReason: 'factual-error', removalNotes: 'X' },
  ] as unknown[],
  deleteRows: [{ habitTemplateId: 'ht-1', clipId: 'clip-1', position: 0 }] as unknown[],
};

vi.mock('@cited/db', () => {
  return {
    clips: { id: 'clips_id' },
    clipEdits: { id: 'clip_edits_id' },
    habitTemplateClips: { clipId: 'htc_clip_id' },
    eq: (..._args: unknown[]) => ({ __eq: _args }),
    createDb: () => ({
      transaction: (cb: (tx: unknown) => Promise<unknown>) =>
        cb(makeTx(currentTxConfig.updateRows, currentTxConfig.deleteRows)),
    }),
  };
});

import { removeClip } from './removeClip';

const curatorUser = { id: 'user-1', email: 'curator@test.com', role: 'curator' as const };

describe('removeClip', () => {
  beforeEach(() => {
    txCalls.length = 0;
    mockGetSessionUser.mockReset();
    mockGetSessionUser.mockResolvedValue(curatorUser);
    process.env.DATABASE_URL = 'postgres://test';
    currentTxConfig = {
      updateRows: [
        { id: 'clip-1', removedAt: new Date(), removalReason: 'factual-error', removalNotes: 'X' },
      ],
      deleteRows: [{ habitTemplateId: 'ht-1', clipId: 'clip-1', position: 0 }],
    };
  });

  it('Test 1: sets removedAt + removalReason + removalNotes; inserts clip_edits action=removed with affectedHabitTemplateCount', async () => {
    const result = await removeClip({
      clipId: 'a0000000-0000-0000-0000-000000000001',
      reason: 'factual-error',
      notes: 'X',
    });

    const updateCall = txCalls.find((c) => c.op === 'update');
    expect(updateCall).toBeDefined();
    expect(updateCall?.args[0]).toMatchObject({
      removedAt: expect.any(Date),
      removalReason: 'factual-error',
      removalNotes: 'X',
    });

    const insertCall = txCalls.find((c) => c.op === 'insert');
    expect(insertCall).toBeDefined();
    expect(insertCall?.args[0]).toMatchObject({
      action: 'removed',
      payload: expect.objectContaining({
        reason: 'factual-error',
        notes: 'X',
        affectedHabitTemplateCount: 1,
      }),
    });

    expect(result).toMatchObject({ affectedHabitTemplates: 1 });
  });

  it('Test 2: deletes habit_template_clips rows for the clipId', async () => {
    await removeClip({
      clipId: 'a0000000-0000-0000-0000-000000000001',
      reason: 'factual-error',
    });

    const deleteCall = txCalls.find((c) => c.op === 'delete');
    expect(deleteCall).toBeDefined();
  });

  it('Test 3: reason=dmca without takedownRefUrl → zod rejection', async () => {
    await expect(
      removeClip({
        clipId: 'a0000000-0000-0000-0000-000000000001',
        reason: 'dmca',
        // takedownRefUrl intentionally omitted
      }),
    ).rejects.toThrow();
  });

  it('Test 4: non-curator user → throws forbidden', async () => {
    mockGetSessionUser.mockResolvedValue({ id: 'user-2', email: 'u@t.com', role: 'user' });
    await expect(
      removeClip({
        clipId: 'a0000000-0000-0000-0000-000000000001',
        reason: 'factual-error',
      }),
    ).rejects.toThrow('forbidden');
  });
});
