/**
 * Tests for recommendations surface components.
 * Task 2: RecommendationStack swipe, AdoptionSummary, ReRunInterviewButton.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HabitCandidate } from '@cited/core';

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
});

const makeCandidate = (n: number): HabitCandidate => ({
  templateSlug: `habit-slug-${n}`,
  title: `Habit ${n}: Do something healthy`,
  rationale: `This habit is recommended because of strong scientific evidence showing improvements in overall wellbeing.`,
  domain: 'sleep',
  trigger: 'Every morning after waking up',
  tinyAction: 'Do it for 2 minutes',
  citations: [makeCitation(n), makeCitation(n + 1)],
});

const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3)];

// ── Imports (after mocks are set up) ─────────────────────────────────────────
import { RecommendationStack } from './RecommendationStack';
import { AdoptionSummary } from './AdoptionSummary';
import { ReRunInterviewButton } from '@/app/(app)/settings/_components/ReRunInterviewButton';

// ── RecommendationStack ───────────────────────────────────────────────────────

describe('RecommendationStack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first candidate on mount', () => {
    render(<RecommendationStack candidates={candidates} />);
    expect(screen.getByText('Habit 1: Do something healthy')).toBeInTheDocument();
  });

  it('moves to next card on Adopt click (swipe right)', async () => {
    vi.useFakeTimers();
    render(<RecommendationStack candidates={candidates} />);
    const adoptBtn = screen.getByRole('button', { name: /adopt/i });
    act(() => {
      fireEvent.click(adoptBtn);
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText('Habit 2: Do something healthy')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('adds adopt CSS class on adopt action', () => {
    const { container } = render(<RecommendationStack candidates={candidates} />);
    const adoptBtn = screen.getByRole('button', { name: /adopt/i });
    fireEvent.click(adoptBtn);
    // The adopt-animation class should be present immediately after click
    expect(container.querySelector('.adopt-animation')).not.toBeNull();
  });

  it('moves to next card on Skip click without adopt animation', () => {
    vi.useFakeTimers();
    render(<RecommendationStack candidates={candidates} />);
    const skipBtn = screen.getByRole('button', { name: /skip/i });
    act(() => {
      fireEvent.click(skipBtn);
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText('Habit 2: Do something healthy')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders AdoptionSummary after all candidates are processed', () => {
    vi.useFakeTimers();
    render(<RecommendationStack candidates={[makeCandidate(1)]} />);
    const adoptBtn = screen.getByRole('button', { name: /adopt/i });
    act(() => {
      fireEvent.click(adoptBtn);
      vi.advanceTimersByTime(600);
    });
    // AdoptionSummary should now be visible — singular "habit"
    expect(screen.getByText(/habit adopted/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

// ── AdoptionSummary ───────────────────────────────────────────────────────────

describe('AdoptionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders adopted count', () => {
    render(<AdoptionSummary adopted={[candidates[0]!, candidates[1]!]} templateIdMap={{}} />);
    expect(screen.getByText(/2 habits adopted/i)).toBeInTheDocument();
  });

  it('renders adopted habit titles', () => {
    render(<AdoptionSummary adopted={[candidates[0]!]} templateIdMap={{}} />);
    expect(screen.getByText('Habit 1: Do something healthy')).toBeInTheDocument();
  });

  it('renders the confirm button', () => {
    render(<AdoptionSummary adopted={[candidates[0]!]} templateIdMap={{}} />);
    expect(screen.getByRole('button', { name: /continue to dashboard/i })).toBeInTheDocument();
  });

  it('calls finalizeInterviewAction and redirects to /dashboard on confirm', async () => {
    render(<AdoptionSummary adopted={[candidates[0]!]} templateIdMap={{ 'habit-slug-1': 'uuid-1' }} />);
    const confirmBtn = screen.getByRole('button', { name: /continue to dashboard/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });
    await waitFor(() => {
      expect(mockFinalizeInterviewAction).toHaveBeenCalledWith(
        [{ templateSlug: 'habit-slug-1' }],
        { 'habit-slug-1': 'uuid-1' },
      );
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
