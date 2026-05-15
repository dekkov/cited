/**
 * ProgressDots — shows N dots indicating interview progress.
 * Active dot = sage fill; completed dots = ink-4; future dots = paper-3.
 * All colors come from CSS var() tokens — no hex codes.
 */

interface ProgressDotsProps {
  /** Zero-based current turn index (0 = before first turn, 1 = after first, …) */
  current: number;
  /** Total number of dots (MAX_TURNS = 10) */
  total: number;
}

export function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <div
      role="group"
      aria-label={`Interview progress: step ${current + 1} of ${total}`}
      className="flex gap-1.5 justify-center"
    >
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isCompleted = i < current;
        const colorClass = isActive
          ? 'bg-[var(--color-accent)]'
          : isCompleted
            ? 'bg-[var(--color-ink-4)]'
            : 'bg-[var(--color-paper-3)]';
        return (
          <span
            key={i}
            role="presentation"
            aria-hidden="true"
            className={`block h-2 w-2 rounded-full transition-colors duration-300 ${colorClass}`}
          />
        );
      })}
    </div>
  );
}
