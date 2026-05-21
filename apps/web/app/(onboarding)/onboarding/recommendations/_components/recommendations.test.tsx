/**
 * Tests for the recommendations surface.
 * Phase 03 redesign: AdoptBoard (3-card adopt/swap board) + ReRunInterviewButton.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardCandidate } from './AdoptHabitCard';

// ── Mock router ──────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock server actions ──────────────────────────────────────────────────────
const mockStartInterviewAction = vi.fn().mockResolvedValue({ runId: 'run-123', runIndex: 2 });
vi.mock('@/app/actions/start-interview', () => ({
  startInterviewAction: () => mockStartInterviewAction(),
}));

const mockFinalizeInterviewAction = vi.fn().mockResolvedValue({ inserted: 1 });
vi.mock('@/app/actions/finalize-interview', () => ({
  finalizeInterviewAction: (...args: unknown[]) => mockFinalizeInterviewAction(...args),
}));

// ── Test fixtures ────────────────────────────────────────────────────────────
const makeCitation = (n: number) => ({
  clipId: `00000000-0000-0000-0000-00000000000${n}`,
  claim: `Expert claim ${n} about health habits`,
  speaker: `Dr. Expert ${n}`,
  // No youtubeVideoId → YouTubeEmbed is not rendered (avoids third-party script in jsdom).
});

const makeCandidate = (n: number): BoardCandidate => ({
  templateSlug: `habit-slug-${n}`,
  title: `Habit ${n}: Do something healthy`,
  rationale: `This habit is recommended because of strong scientific evidence about wellbeing.`,
  domain: 'sleep',
  trigger: 'Every morning after waking up',
  tinyAction: 'Do it for 2 minutes',
  citations: [makeCitation(n), makeCitation(n + 1)],
});

// 4 candidates: 3 visible + 1 in the queue
const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3), makeCandidate(4)];
const habitTemplateIds = ['tpl-uuid-1', 'tpl-uuid-2', 'tpl-uuid-3', 'tpl-uuid-4'];

import { ReRunInterviewButton } from '@/app/(app)/settings/_components/ReRunInterviewButton';
// ── Imports (after mocks are set up) ─────────────────────────────────────────
import { AdoptBoard } from './AdoptBoard';

function startingSet() {
  return screen.getByText('Your starting set').closest('section') as HTMLElement;
}

// ── AdoptBoard ────────────────────────────────────────────────────────────────

describe('AdoptBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the first 3 candidates and reports the queue count', () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    expect(screen.getByText('Habit 1: Do something healthy')).toBeInTheDocument();
    expect(screen.getByText('Habit 2: Do something healthy')).toBeInTheDocument();
    expect(screen.getByText('Habit 3: Do something healthy')).toBeInTheDocument();
    expect(screen.queryByText('Habit 4: Do something healthy')).not.toBeInTheDocument();
    expect(screen.getByText(/3 CANDIDATES · 1 MORE IN QUEUE/i)).toBeInTheDocument();
  });

  it('Adopt moves the habit into the starting set and pulls the next from the queue', () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    fireEvent.click(screen.getByRole('button', { name: /Adopt Habit 1/i }));

    // Habit 1 now appears in the starting set
    expect(within(startingSet()).getByText('Habit 1: Do something healthy')).toBeInTheDocument();
    // The freed slot is filled by the queued Habit 4
    expect(screen.getByText('Habit 4: Do something healthy')).toBeInTheDocument();
  });

  it('Swap discards the card and surfaces the next queued candidate', () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    fireEvent.click(screen.getByRole('button', { name: /Swap Habit 1/i }));

    // Habit 1 is gone from the visible cards; Habit 4 replaces it
    expect(screen.queryByText('Habit 1: Do something healthy')).not.toBeInTheDocument();
    expect(screen.getByText('Habit 4: Do something healthy')).toBeInTheDocument();
    // Nothing adopted by swapping
    expect(
      within(startingSet()).queryByText('Habit 1: Do something healthy'),
    ).not.toBeInTheDocument();
  });

  it('Remove takes a habit back out of the starting set', () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    fireEvent.click(screen.getByRole('button', { name: /Adopt Habit 1/i }));
    expect(within(startingSet()).getByText('Habit 1: Do something healthy')).toBeInTheDocument();

    fireEvent.click(within(startingSet()).getByRole('button', { name: /Remove Habit 1/i }));
    expect(
      within(startingSet()).queryByText('Habit 1: Do something healthy'),
    ).not.toBeInTheDocument();
  });

  it('Progress to Dashboard is disabled until something is adopted', () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    expect(screen.getByRole('button', { name: /progress to dashboard/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Adopt Habit 1/i }));
    expect(screen.getByRole('button', { name: /progress to dashboard/i })).toBeEnabled();
  });

  it('persists the adopted set and redirects on Progress to Dashboard', async () => {
    render(<AdoptBoard candidates={candidates} habitTemplateIds={habitTemplateIds} />);
    fireEvent.click(screen.getByRole('button', { name: /Adopt Habit 1/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /progress to dashboard/i }));
    });

    await waitFor(() => {
      expect(mockFinalizeInterviewAction).toHaveBeenCalledWith([{ habitTemplateId: 'tpl-uuid-1' }]);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});

// ── ReRunInterviewButton ──────────────────────────────────────────────────────

describe('ReRunInterviewButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Run interview again" button', () => {
    render(<ReRunInterviewButton />);
    expect(screen.getByRole('button', { name: /run interview again/i })).toBeInTheDocument();
  });

  it('calls startInterviewAction and navigates to /onboarding/interview on click', async () => {
    render(<ReRunInterviewButton />);
    const btn = screen.getByRole('button', { name: /run interview again/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(mockStartInterviewAction).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/onboarding/interview');
    });
  });
});
