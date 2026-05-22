import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock AI SDK providers
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({ modelId: 'claude-sonnet-4-5', provider: 'anthropic' })),
}));
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({ modelId: 'gpt-4o-mini', provider: 'openai' })),
}));

// Mock embeddings for groundingCheck
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({ modelId: 'gpt-4o-mini' })),
}));

// A canned synthesis output satisfying SynthesisOutputSchema
const goodOutput = {
  profileSummary: {
    gapDomains: ['sleep', 'exercise_longevity'],
    summaries: {
      sleep: 'User struggles with sleep',
      nutrition_gut: 'Good diet',
      exercise_longevity: 'Rarely exercises',
      mental_health: 'Manages well',
    },
  },
  candidates: [
    {
      templateSlug: 'sleep-wind-down',
      title: 'Evening wind-down routine',
      rationale:
        'Dr. Matthew Walker recommends a consistent wind-down ritual for better sleep quality.',
      domain: 'sleep',
      trigger: 'When it is 9pm each evening',
      tinyAction: 'Turn off overhead lights',
      citations: [
        {
          clipId: '00000000-0000-0000-0000-000000000001',
          claim: 'Consistent bedtime improves sleep quality',
          speaker: 'Dr. Matthew Walker',
        },
        {
          clipId: '00000000-0000-0000-0000-000000000002',
          claim: 'Blue light suppresses melatonin',
          speaker: 'Dr. Andrew Huberman',
        },
      ],
    },
    {
      templateSlug: 'morning-walk',
      title: '10-minute morning walk',
      rationale: 'Exercise in the morning boosts mood and longevity markers.',
      domain: 'exercise_longevity',
      trigger: 'Right after breakfast',
      tinyAction: 'Walk to the end of the street',
      citations: [
        {
          clipId: '00000000-0000-0000-0000-000000000003',
          claim: 'Morning exercise boosts cortisol positively',
          speaker: 'Dr. Rangan Chatterjee',
        },
        {
          clipId: '00000000-0000-0000-0000-000000000004',
          claim: 'Walking reduces all-cause mortality',
          speaker: 'Professor Tim Spector',
        },
      ],
    },
    {
      templateSlug: 'sleep-temp',
      title: 'Cool bedroom for deep sleep',
      rationale: 'Core body temperature drop signals the brain to enter deep sleep.',
      domain: 'sleep',
      trigger: 'Before getting into bed',
      tinyAction: 'Set thermostat to 18C',
      citations: [
        {
          clipId: '00000000-0000-0000-0000-000000000001',
          claim: 'Room temperature affects sleep stages',
          speaker: 'Dr. Matthew Walker',
        },
        {
          clipId: '00000000-0000-0000-0000-000000000002',
          claim: 'Core temp drop triggers sleep onset',
          speaker: 'Dr. Andrew Huberman',
        },
      ],
    },
  ],
};

// Mock generateObject from ai
vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    generateObject: vi.fn(async () => ({ object: goodOutput })),
  };
});

// Mock auth
vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: vi.fn(() =>
    Promise.resolve({ id: 'user-123', email: 'test@example.com', role: 'user' }),
  ),
}));

// Mock consent records — default: no ai_free_text consent
const mockConsentFindFirst = vi.fn(() => Promise.resolve(null));
const mockClipsFindMany = vi.fn(() =>
  Promise.resolve([
    {
      id: '00000000-0000-0000-0000-000000000001',
      claim: 'Consistent bedtime improves sleep quality',
      speaker: 'Dr. Matthew Walker',
      domain: 'sleep',
      status: 'approved',
      removedAt: null,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      claim: 'Blue light suppresses melatonin',
      speaker: 'Dr. Andrew Huberman',
      domain: 'sleep',
      status: 'approved',
      removedAt: null,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      claim: 'Morning exercise boosts cortisol positively',
      speaker: 'Dr. Rangan Chatterjee',
      domain: 'exercise_longevity',
      status: 'approved',
      removedAt: null,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      claim: 'Walking reduces all-cause mortality',
      speaker: 'Professor Tim Spector',
      domain: 'exercise_longevity',
      status: 'approved',
      removedAt: null,
    },
  ]),
);
const mockDbUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }));
const mockDbExecute = vi.fn(() => Promise.resolve([{ similarity: 0.92 }]));
const mockClipFindFirst = vi.fn((_opts?: { where?: unknown }) => {
  // Return the clip based on the query — simplified: always return approved
  return Promise.resolve({ id: 'clip-id', status: 'approved', claim: 'test', removedAt: null });
});

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    query: {
      consentRecords: { findFirst: mockConsentFindFirst },
      clips: { findMany: mockClipsFindMany, findFirst: mockClipFindFirst },
    },
    update: mockDbUpdate,
    execute: mockDbExecute,
  })),
}));

// Canned hybrid-retrieval result (route maps r.clipId → retrievedIds). The clip
// bodies come from the mocked db.query.clips.findMany below.
const rankedClips = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
].map((clipId, i) => ({
  clipId,
  similarityScore: 0.9 - i * 0.1,
  vectorScore: 0.5,
  textScore: 0.4,
  claim: 'canned',
  speaker: 'canned',
  domain: 'sleep' as const,
}));

// Mock @cited/core: stub hybrid retrieval + citation validation + embeddings.
// Keeps the real QUESTION_POOL_BY_ID / schemas via the actual spread.
vi.mock('@cited/core', async () => {
  const actual = await vi.importActual<typeof import('@cited/core')>('@cited/core');
  return {
    ...actual,
    hybridRetrieve: vi.fn(async () => rankedClips),
    // Override validateCitations to always validate (high similarity)
    validateCitations: vi.fn(async (citations: unknown[]) => ({
      valid: citations,
      dropped: [],
    })),
    getAiSdkModel: vi.fn(() => ({ modelId: 'claude-sonnet-4-5' })),
    getEmbeddings: vi.fn(() => ({
      embed: vi.fn(async () => ({
        embeddings: [[0.5, 0.5, 0.5]],
        provider: 'fake',
        model: 'fake',
      })),
    })),
  };
});

// Current request contract: runId + freeFormText + answers[{ questionId, choiceId }].
// questionId/choiceId must exist in QUESTION_POOL_BY_ID to be hydrated into the prompt.
const baseRequestBody = {
  runId: '00000000-0000-0000-0000-000000000099',
  freeFormText: '',
  answers: [{ questionId: 'sleep-quality', choiceId: 'restless' }],
};

describe('POST /api/synthesize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsentFindFirst.mockResolvedValue(null);
    mockClipsFindMany.mockResolvedValue([
      {
        id: '00000000-0000-0000-0000-000000000001',
        claim: 'Consistent bedtime improves sleep quality',
        speaker: 'Dr. Matthew Walker',
        domain: 'sleep',
        status: 'approved',
        removedAt: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        claim: 'Blue light suppresses melatonin',
        speaker: 'Dr. Andrew Huberman',
        domain: 'sleep',
        status: 'approved',
        removedAt: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        claim: 'Morning exercise boosts cortisol positively',
        speaker: 'Dr. Rangan Chatterjee',
        domain: 'exercise_longevity',
        status: 'approved',
        removedAt: null,
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        claim: 'Walking reduces all-cause mortality',
        speaker: 'Professor Tim Spector',
        domain: 'exercise_longevity',
        status: 'approved',
        removedAt: null,
      },
    ]);
    mockDbUpdate.mockReturnValue({ set: vi.fn(() => ({ where: vi.fn() })) });
    mockDbExecute.mockResolvedValue([{ similarity: 0.92 }]);
    mockClipFindFirst.mockResolvedValue({
      id: 'clip-id',
      status: 'approved',
      claim: 'test',
      removedAt: null,
    });
  });

  it('Test 1: valid synthesis returns 200 with candidates array', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/synthesize', {
      method: 'POST',
      body: JSON.stringify(baseRequestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const data = (await response.json()) as { candidates: unknown[] };
    expect(data.candidates).toBeDefined();
    expect(Array.isArray(data.candidates)).toBe(true);
    expect(data.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it('Test 4: AUTH-05c opt-out — tellMeMoreFreeText dropped when consent absent', async () => {
    const { generateObject } = await import('ai');
    const { POST } = await import('./route');

    const req = new Request('http://localhost/api/synthesize', {
      method: 'POST',
      body: JSON.stringify({
        runId: baseRequestBody.runId,
        freeFormText: 'I also have anxiety issues and insomnia.',
        answers: [
          { questionId: 'sleep-quality', choiceId: 'restless', freeText: 'terrible sleep' },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await POST(req);

    // Verify generateObject was called; the prompt should NOT contain the free-text
    const calls = vi.mocked(generateObject).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const callArgs = calls[0]![0] as { prompt: string };
    expect(callArgs.prompt).not.toContain('anxiety issues');
    expect(callArgs.prompt).not.toContain('terrible sleep');
  });

  it('returns 401 for unauthenticated request', async () => {
    const { getSessionUser } = await import('@/lib/auth/guards');
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/synthesize', {
      method: 'POST',
      body: JSON.stringify(baseRequestBody),
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
