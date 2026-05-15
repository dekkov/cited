/**
 * DomainBadge — shows "Focusing on: {domain label}" as a sage-accented pill.
 * Appears after turn 3 when priorityDomain is set. See D-02.
 * All colors from CSS var() tokens.
 */
import type { Domain } from '@cited/core';

const DOMAIN_LABELS: Record<Domain, string> = {
  sleep: 'Sleep',
  nutrition_gut: 'Nutrition & Gut',
  exercise_longevity: 'Exercise & Longevity',
  mental_health: 'Mental Health',
};

interface DomainBadgeProps {
  domain: Domain;
}

export function DomainBadge({ domain }: DomainBadgeProps) {
  return (
    <div className="flex justify-center mt-3">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-[var(--color-accent-deep)]"
        aria-live="polite"
      >
        {/* Sage dot */}
        <span
          className="block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        />
        Focusing on: {DOMAIN_LABELS[domain]}
      </span>
    </div>
  );
}
