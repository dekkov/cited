import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock sonner
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// Mock addPodcast action
const { mockAddPodcast } = vi.hoisted(() => ({
  mockAddPodcast: vi.fn().mockResolvedValue({ id: 'p-1', name: 'Test Podcast' }),
}));
vi.mock('@/app/actions/curate/addPodcast', () => ({ addPodcast: mockAddPodcast }));

// Import AFTER mocks
import { IngestionForm } from './IngestionForm';

describe('IngestionForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ episodeId: 'ep-1', chunkCount: 120, source: 'youtube_captions' }),
    } as Response);
    mockAddPodcast.mockReset();
    mockAddPodcast.mockResolvedValue({ id: 'p-1', name: 'Test Podcast' });
  });

  it('Test 1: renders URL input with Geist Mono placeholder', () => {
    render(<IngestionForm />);
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    expect(input).toBeDefined();
  });

  it('Test 2: submit button copy is "Fetch transcript"', () => {
    render(<IngestionForm />);
    expect(screen.getByText('Fetch transcript')).toBeDefined();
  });

  it('Test 3: successful POST shows stepped status rows with "Indexed into corpus"', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        episodeId: 'ep-1',
        chunkCount: 120,
        source: 'youtube_captions',
        title: 'Test Episode',
      }),
    } as Response);

    render(<IngestionForm />);
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(screen.getByText('Fetch transcript'));

    await waitFor(() => {
      expect(screen.getByText(/Indexed into corpus/)).toBeDefined();
    });
  });

  it('Test 4: 422 with "Phase 2 fallback" reveals manual upload panel', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Phase 2 fallback: no captions available' }),
    } as Response);

    render(<IngestionForm />);
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    await user.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(screen.getByText('Fetch transcript'));

    await waitFor(() => {
      expect(screen.getByText('Upload transcript')).toBeDefined();
    });
  });

  it('Test 5: submitting manual panel posts to /api/admin/ingest with manualTranscript body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    // First call: 422 to trigger fallback
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Phase 2 fallback: no captions available' }),
    } as Response);
    // Second call: success from manual submit
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ episodeId: 'ep-1', chunkCount: 10, source: 'manual' }),
    } as Response);

    render(<IngestionForm />);
    const urlInput = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await user.click(screen.getByText('Fetch transcript'));

    await waitFor(() => {
      expect(screen.getByText('Upload transcript')).toBeDefined();
    });

    // Fill in manual form fields
    const titleInput = screen.getByPlaceholderText('Episode title (optional)');
    await user.type(titleInput, 'Test Episode');

    const transcriptArea = screen.getByPlaceholderText(/Paste VTT/);
    await user.type(transcriptArea, 'WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello world');

    await user.click(screen.getByText('Upload transcript'));

    await waitFor(() => {
      const calls = fetchSpy.mock.calls;
      const manualCall = calls.find((c) => {
        const body = c[1]?.body;
        return typeof body === 'string' && body.includes('manualTranscript');
      });
      expect(manualCall).toBeDefined();
    });
  });

  it('Test 6: invalid URL shows error copy', async () => {
    render(<IngestionForm />);
    const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=…');
    await user.type(input, 'not-a-youtube-url');
    await user.click(screen.getByText('Fetch transcript'));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't parse a YouTube video ID from that URL/)).toBeDefined();
    });
  });
});
