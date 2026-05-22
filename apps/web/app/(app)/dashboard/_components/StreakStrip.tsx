'use client';

type StreakProps = {
  readonly streak: {
    readonly currentLength: number;
    readonly longestLength: number;
    readonly freezesAvailable: number;
  };
};

/**
 * SnowflakeIcon — hand-rolled inline SVG per UI-DESIGN.md rules.
 * 16×16 viewBox, 1.5 stroke width, round caps and joins.
 * No icon library (Lucide/Heroicons) — SVGs are hand-rolled per design spec.
 */
function SnowflakeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Vertical axis */}
      <line x1="7" y1="1" x2="7" y2="13" />
      {/* Horizontal axis */}
      <line x1="1" y1="7" x2="13" y2="7" />
      {/* Diagonals */}
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
      {/* Branch tips (vertical) */}
      <line x1="5.5" y1="2.5" x2="7" y2="1" />
      <line x1="8.5" y1="2.5" x2="7" y2="1" />
      <line x1="5.5" y1="11.5" x2="7" y2="13" />
      <line x1="8.5" y1="11.5" x2="7" y2="13" />
    </svg>
  );
}

/**
 * StreakStrip — SECONDARY visual in HabitCard, below ConsistencyBar (HAB-07).
 *
 * Design spec (UI-DESIGN.md):
 * - Streak number: 30px Newsreader "{currentLength}" + 16px ink-3 "/21"
 * - Caption: "LAST 3 WEEKS" mono
 * - Freeze pill: paper-2 bg, snowflake SVG, "{n} freezes available"
 *
 * Rules:
 * - NO red, NO flame emoji, NO "broken streak" language (HAB-10, Pitfall 5)
 * - Caller hides this component when currentLength >= 30 (HAB-09)
 */
export function StreakStrip({ streak }: StreakProps) {
  const { currentLength, freezesAvailable } = streak;

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      {/* Streak number + label */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-[family-name:var(--font-newsreader)] text-[30px] leading-none tracking-[-0.02em] text-[var(--color-ink)]">
            {currentLength}
          </span>
          <span className="text-[16px] text-[var(--color-ink-3)]">/21</span>
        </div>
        <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-ink-3)] uppercase mt-0.5">
          Last 3 weeks
        </p>
      </div>

      {/* Freeze pill */}
      {freezesAvailable > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-paper-2)] px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-[var(--color-ink-3)]"
          role="status"
          aria-label={`${freezesAvailable} freeze${freezesAvailable === 1 ? '' : 's'} available`}
        >
          <SnowflakeIcon />
          <span>
            {freezesAvailable} freeze{freezesAvailable === 1 ? '' : 's'} available
          </span>
        </div>
      )}
    </div>
  );
}
