'use client';
import type { CheckInStatus, Consistency } from '@cited/core';
import Link from 'next/link';
import { CheckInSheet } from './CheckInSheet';
import { ConsistencyBar } from './ConsistencyBar';
import { StreakStrip } from './StreakStrip';

type HabitInfo = {
  readonly id: string;
  readonly title: string;
  readonly domain: string;
  readonly speaker: string;
  readonly clipThumbnailUrl: string;
};

type StreakInfo = {
  readonly currentLength: number;
  readonly longestLength: number;
  readonly freezesAvailable: number;
};

type TodayCheckIn = { readonly status: CheckInStatus } | null;

type Props = {
  readonly habit: HabitInfo;
  readonly consistency: Consistency;
  readonly streak: StreakInfo;
  readonly todayCheckIn: TodayCheckIn;
};

const TODAY_LABEL: Record<CheckInStatus, string> = {
  done: 'Done today',
  partial: 'Partial today',
  skipped: 'Skipped today',
};

const DOMAIN_LABELS: Record<string, string> = {
  sleep: 'Sleep',
  nutrition_gut: 'Nutrition & Gut',
  exercise_longevity: 'Exercise & Longevity',
  mental_health: 'Mental Health',
};

/**
 * HabitCard — per-habit card with consistency PRIMARY and streak SECONDARY (D-07, HAB-06, HAB-07).
 *
 * Layout order (top to bottom):
 * 1. Domain badge + speaker (eyebrow)
 * 2. ConsistencyBar (21 cells) — PRIMARY visual (HAB-06)
 * 3. Consistency count + caption ("18/21 LAST 3 WEEKS")
 * 4. Habit title
 * 5. StreakStrip — SECONDARY, hidden when currentLength >= 30 (HAB-07, HAB-09)
 * 6. CheckInSheet trigger
 *
 * NO red, NO flame emoji, NO "broken streak" language (HAB-10, Pitfall 5).
 */
export function HabitCard({ habit, consistency, streak, todayCheckIn }: Props) {
  const hideStreak = streak.currentLength >= 30; // HAB-09

  return (
    <article
      className="bg-[var(--color-paper)] rounded-[var(--radius-xl)] border border-[var(--color-rule)] p-[26px] shadow-[var(--shadow-card)]"
      aria-label={`Habit: ${habit.title}`}
    >
      {/* Eyebrow: domain badge + speaker */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-[var(--color-accent-deep)] uppercase"
          aria-hidden="true"
        >
          {DOMAIN_LABELS[habit.domain] ?? habit.domain}
        </span>
        <span className="font-[family-name:var(--font-geist-sans)] text-[13.5px] font-semibold text-[var(--color-ink-2)]">
          {habit.speaker}
        </span>
      </div>

      {/* PRIMARY — ConsistencyBar (HAB-06, must come before streak in DOM) */}
      <ConsistencyBar days={consistency.last21Days} />

      {/* Consistency count caption */}
      <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-ink-3)] mt-3 uppercase">
        {consistency.done}/{21} Last 3 weeks
      </p>

      {/* Habit title — links to detail page (clip, trigger/action, Swap) */}
      <Link href={`/habits/${habit.id}`} className="group mt-3 block">
        <h3 className="font-[family-name:var(--font-newsreader)] text-[24px] tracking-[-0.018em] leading-[1.15] text-[var(--color-ink)] underline-offset-4 group-hover:underline">
          {habit.title}
        </h3>
      </Link>

      {/* SECONDARY — StreakStrip (hidden when currentLength >= 30, per HAB-09) */}
      {!hideStreak && <StreakStrip streak={streak} />}

      {/* Check-in trigger — once-per-day. After today's check-in lands, the trigger
          is replaced with a passive pill until tomorrow. */}
      {todayCheckIn ? (
        <div
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-geist-sans)] font-medium text-[13px] text-[var(--color-accent-deep)]"
          aria-live="polite"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 7.5l3 3 6-7" />
          </svg>
          {TODAY_LABEL[todayCheckIn.status]}
        </div>
      ) : (
        <CheckInSheet userHabitId={habit.id} />
      )}
    </article>
  );
}
