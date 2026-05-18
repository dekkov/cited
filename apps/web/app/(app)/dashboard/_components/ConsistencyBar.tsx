'use client';
import type { DayState } from '@cited/core';

type Props = {
  readonly days: readonly DayState[];
};

/**
 * 21-cell consistency bar — the PRIMARY visual element in HabitCard (HAB-06).
 *
 * States per UI-DESIGN.md:
 * - on (done)    → --color-accent (sage fill)
 * - half (partial) → mid-sage (accent at 50% opacity)
 * - skipped      → --color-ink-4 (muted neutral)
 * - pending (today, no check-in) → dashed --color-accent outline
 * - missed/empty → --color-paper-3 (muted neutral — NEVER red, NEVER flame)
 */
function cellClasses(state: DayState): string {
  switch (state) {
    case 'on':
      return 'bg-[var(--color-accent)] rounded-[2px]';
    case 'half':
      return 'bg-[oklch(0.72_0.04_145)] rounded-[2px]'; // mid-sage (accent lightened)
    case 'skipped':
      return 'bg-[var(--color-ink-4)] rounded-[2px]';
    case 'pending':
      return 'rounded-[2px] border border-dashed border-[var(--color-accent)] bg-transparent';
    case 'missed':
    default:
      return 'bg-[var(--color-paper-3)] rounded-[2px]';
  }
}

function cellLabel(state: DayState): string {
  switch (state) {
    case 'on':
      return 'done';
    case 'half':
      return 'partial';
    case 'skipped':
      return 'skipped';
    case 'pending':
      return 'pending — not yet checked in';
    case 'missed':
    default:
      return 'missed';
  }
}

export function ConsistencyBar({ days }: Props) {
  return (
    <div
      className="grid gap-[3px] w-full"
      style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
      role="img"
      aria-label={`Consistency over last ${days.length} days`}
    >
      {days.map((state, i) => (
        <div
          key={i}
          className={`h-[10px] ${cellClasses(state)}`}
          aria-label={`Day ${i + 1}: ${cellLabel(state)}`}
        />
      ))}
    </div>
  );
}
