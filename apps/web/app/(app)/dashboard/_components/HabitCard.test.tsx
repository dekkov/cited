import type { Consistency } from '@cited/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HabitCard } from './HabitCard';

// Mock child components
vi.mock('./ConsistencyBar', () => ({
  ConsistencyBar: ({ days }: { days: readonly string[] }) => (
    <div data-testid="consistency-bar" data-days={days.length} />
  ),
}));

vi.mock('./StreakStrip', () => ({
  StreakStrip: ({ streak }: { streak: { currentLength: number } }) => (
    <div data-testid="streak-strip" data-length={streak.currentLength} />
  ),
}));

vi.mock('./CheckInSheet', () => ({
  CheckInSheet: ({ userHabitId }: { userHabitId: string }) => (
    <div data-testid="check-in-sheet" data-id={userHabitId} />
  ),
}));

const makeConsistency = (overrides?: Partial<Consistency>): Consistency => ({
  done: 10,
  partial: 2,
  skipped: 1,
  missed: 5,
  last21Days: Array.from({ length: 21 }, (_, i): 'on' | 'half' | 'missed' =>
    i < 10 ? 'on' : i < 12 ? 'half' : 'missed',
  ),
  ...overrides,
});

const makeHabit = () => ({
  id: 'habit-1',
  title: 'Morning walk',
  domain: 'exercise_longevity',
  speaker: 'Dr. Test',
  clipThumbnailUrl: '',
});

const makeStreak = (currentLength: number) => ({
  currentLength,
  longestLength: Math.max(currentLength, 10),
  freezesAvailable: 2,
});

describe('HabitCard', () => {
  it('Test 1: Dashboard renders one HabitCard per habit (ConsistencyBar present)', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={null}
      />,
    );
    expect(screen.getByTestId('consistency-bar')).toBeTruthy();
  });

  it('Test 2: ConsistencyBar appears BEFORE StreakStrip in DOM order', () => {
    const { container } = render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={null}
      />,
    );
    const bar = container.querySelector('[data-testid="consistency-bar"]');
    const strip = container.querySelector('[data-testid="streak-strip"]');
    expect(bar).toBeTruthy();
    expect(strip).toBeTruthy();
    // Check DOM order: bar should come before strip
    expect(bar!.compareDocumentPosition(strip!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Test 3: streak strip is NOT rendered when currentLength >= 30 (HAB-09)', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(30)}
        todayCheckIn={null}
      />,
    );
    expect(screen.queryByTestId('streak-strip')).toBeNull();
  });

  it('streak strip IS rendered when currentLength = 10 (< 30)', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={null}
      />,
    );
    expect(screen.getByTestId('streak-strip')).toBeTruthy();
  });

  it('streak strip IS rendered when currentLength = 29', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(29)}
        todayCheckIn={null}
      />,
    );
    expect(screen.getByTestId('streak-strip')).toBeTruthy();
  });

  it('Test 6: Snapshot — no red color classes or flame emoji', () => {
    const { container } = render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={null}
      />,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/text-red-|bg-red-/);
    expect(html).not.toContain('🔥');
    expect(html).not.toMatch(/lossStreak|loss.streak/i);
  });

  it('renders habit title', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={null}
      />,
    );
    expect(screen.getByText('Morning walk')).toBeTruthy();
  });

  it('shows a passive "Done today" pill (no Check in button) when already checked in today', () => {
    render(
      <HabitCard
        habit={makeHabit()}
        consistency={makeConsistency()}
        streak={makeStreak(10)}
        todayCheckIn={{ status: 'done' }}
      />,
    );
    expect(screen.getByText(/done today/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /check in/i })).toBeNull();
  });
});
