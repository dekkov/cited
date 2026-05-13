import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only so it doesn't throw in test environment
vi.mock('server-only', () => ({}));

// Mock @ai-sdk/anthropic and @ai-sdk/openai to avoid network calls
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => ({ modelId: 'claude-haiku-4-5', provider: 'anthropic' })),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => ({ modelId: 'gpt-4o-mini', provider: 'openai' })),
}));

// Mock the ai SDK's streamText to return a fake stream
const mockToUIMessageStreamResponse = vi.fn(() => new Response('data: test\n\n', {
  headers: { 'Content-Type': 'text/event-stream' },
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: mockToUIMessageStreamResponse,
    })),
    convertToModelMessages: vi.fn((msgs) => msgs),
    tool: vi.fn((def) => def),
  };
});

// Mock auth
vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: vi.fn(() => Promise.resolve({ id: 'user-123', email: 'test@example.com', role: 'user' })),
}));

// Mock db
const mockFindFirst = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(() => ({
    query: {
      profiles: { findFirst: mockFindFirst },
      consentRecords: { findFirst: mockFindFirst },
    },
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      execute: vi.fn(() => Promise.resolve([])),
    })),
  })),
}));

describe('POST /api/interview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null); // no consent record = no free-text
  });

  it('Test 1: valid POST returns a streaming response', async () => {
    const { POST } = await import('./route');

    const body = {
      messages: [{ role: 'user', content: 'Hello' }],
      runId: '00000000-0000-0000-0000-000000000001',
      turnCount: 0,
      domainCoverage: { sleep: 0, nutrition_gut: 0, exercise_longevity: 0, mental_health: 0 },
      userDoneSignal: false,
    };

    const req = new Request('http://localhost/api/interview', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('Test 2: unauthenticated request returns 401', async () => {
    const { getSessionUser } = await import('@/lib/auth/guards');
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);

    const { POST } = await import('./route');
    const body = {
      messages: [],
      runId: '00000000-0000-0000-0000-000000000001',
      turnCount: 0,
      domainCoverage: {},
      userDoneSignal: false,
    };
    const req = new Request('http://localhost/api/interview', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
