export type StreakState = {
  readonly currentLength: number;
  readonly longestLength: number;
  readonly lastCheckInDate: string | null;     // YYYY-MM-DD
  readonly freezesAvailable: number;            // banked - used (this month)
  readonly freezeUsedThisWeek: boolean;
};

export type ApplyResult = {
  readonly next: StreakState;
  readonly freezeApplied: boolean;     // for gain-frame toast (HAB-08)
  readonly daysReset: boolean;
};

export const FREEZES_PER_MONTH = 2;
export const FREEZES_MAX_BANKED = 4;

/**
 * Returns the number of calendar days between two YYYY-MM-DD strings.
 * Returns Infinity if lastDate is null.
 */
function daysSince(lastDate: string | null, today: string): number {
  if (lastDate === null) return Infinity;
  const last = new Date(lastDate);
  const curr = new Date(today);
  const diffMs = curr.getTime() - last.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Apply a check-in to the current streak state and compute the next state.
 *
 * Rules:
 * 1. If status is 'done' or 'partial' AND days since last check-in <= 1: increment streak.
 * 2. If days since last check-in > 1 (missed days exist):
 *    - First missed day: try to auto-apply a freeze (if available and not used this week).
 *    - If freeze is applied: preserve streak, then increment if done/partial.
 *    - If no freeze available or already used this week: reset streak to 0.
 * 3. If status is 'skipped':
 *    - Try to auto-apply a freeze (if available and not used this week).
 *    - If freeze applied: preserve streak.
 *    - If no freeze: reset streak to 0.
 */
export function applyCheckIn(
  state: StreakState,
  status: 'done' | 'partial' | 'skipped',
  today: string,
): ApplyResult {
  const gap = daysSince(state.lastCheckInDate, today);
  const canUseFreeze = state.freezesAvailable > 0 && !state.freezeUsedThisWeek;

  // Determine if streak was broken by missed days (gap > 1 means at least one missed day)
  const hasMissedDays = gap > 1;

  let freezeApplied = false;
  let daysReset = false;
  let newCurrentLength = state.currentLength;

  if (status === 'done' || status === 'partial') {
    if (hasMissedDays) {
      // There were missed days before today's successful check-in
      if (canUseFreeze) {
        // Auto-apply freeze to cover the first miss; preserve and then increment
        freezeApplied = true;
        newCurrentLength = state.currentLength + 1;
      } else {
        // No freeze available — reset
        daysReset = true;
        newCurrentLength = 1; // start fresh with today's successful check-in
      }
    } else {
      // No gap or same-day re-check-in — normal increment
      newCurrentLength = state.currentLength + 1;
    }
  } else {
    // status === 'skipped'
    if (canUseFreeze) {
      // Auto-apply freeze to preserve streak
      freezeApplied = true;
      // currentLength stays the same (preserved, not incremented)
      newCurrentLength = state.currentLength;
    } else {
      // No freeze — reset
      daysReset = true;
      newCurrentLength = 0;
    }
  }

  const newFreezes = freezeApplied
    ? state.freezesAvailable - 1
    : state.freezesAvailable;

  const newLongest = Math.max(state.longestLength, newCurrentLength);

  const next: StreakState = {
    currentLength: newCurrentLength,
    longestLength: newLongest,
    lastCheckInDate: today,
    freezesAvailable: newFreezes,
    freezeUsedThisWeek: freezeApplied ? true : state.freezeUsedThisWeek,
  };

  return { next, freezeApplied, daysReset };
}
