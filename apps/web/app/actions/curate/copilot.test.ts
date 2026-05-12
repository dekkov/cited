import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSession = vi.fn();
const inserted: Array<Record<string, unknown>> = [];

vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: () => mockSession(),
}));

vi.mock('@cited/core', () => {
  const { z } = require('zod');
  return {
    copilot: {
      copilotKindSchema: z.enum(['suggest-start-end', 'refine-claim', 'propose-alternative']),
    },
  };
});

vi.mock('@cited/db', () => {
  const clipEdits = { _tag: 'clipEdits' as const };
  return {
    clipEdits,
    createDb: () => ({
      insert: (_table: unknown) => ({
        values: (v: Record<string, unknown>) => {
          inserted.push(v);
          return Promise.resolve();
        },
      }),
    }),
  };
});

vi.mock('server-only', () => ({}));

import { acceptCopilotSuggestion, rejectCopilotSuggestion } from './copilot';

const validInput = {
  clipId: '11111111-1111-1111-1111-111111111111',
  kind: 'refine-claim' as const,
  suggestion: { refinedClaim: 'X', rationale: 'Y', quotedSpan: 'Z' },
  similarity: 0.91,
};

describe('copilot accept/reject', () => {
  beforeEach(() => {
    inserted.length = 0;
    mockSession.mockReset();
    process.env.DATABASE_URL = 'postgres://test';
  });

  it('acceptCopilotSuggestion inserts clip_edits with action=ai_accepted and full payload', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'curator' });
    await acceptCopilotSuggestion(validInput);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      clipId: validInput.clipId,
      source: 'ai_copilot',
      field: 'refine-claim',
      action: 'ai_accepted',
      accepted: true,
    });
    expect((inserted[0]?.payload as Record<string, unknown>).kind).toBe('refine-claim');
    expect((inserted[0]?.payload as Record<string, unknown>).similarity).toBe(0.91);
  });

  it('rejectCopilotSuggestion inserts clip_edits with action=ai_rejected and reason in payload', async () => {
    mockSession.mockResolvedValue({ id: 'u1', email: 'c@x', role: 'admin' });
    await rejectCopilotSuggestion({ ...validInput, reason: 'drifted from transcript' });
    expect(inserted[0]).toMatchObject({ action: 'ai_rejected', accepted: false });
    expect((inserted[0]?.payload as Record<string, unknown>).reason).toBe(
      'drifted from transcript',
    );
  });

  it('forbids non-curator/non-admin sessions', async () => {
    mockSession.mockResolvedValue({ id: 'u2', email: 'r@x', role: 'user' });
    await expect(acceptCopilotSuggestion(validInput)).rejects.toThrow(/forbidden/);
    await expect(rejectCopilotSuggestion(validInput)).rejects.toThrow(/forbidden/);
    expect(inserted).toHaveLength(0);
  });
});
