export type CheckInStatus = 'done' | 'partial' | 'skipped';
export type DayState = 'on' | 'half' | 'skipped' | 'missed' | 'pending';

export type CheckInRecord = {
  readonly date: string;       // YYYY-MM-DD
  readonly status: CheckInStatus;
};

export type Consistency = {
  readonly done: number;
  readonly partial: number;
  readonly skipped: number;
  readonly missed: number;
  readonly last21Days: readonly DayState[];   // chronological oldest→newest
};

export const WINDOW_DAYS = 21;

/**
 * Compute consistency metrics over the last 21 days ending on `today`.
 *
 * Today with no check-in is rendered as 'pending' (dashed outline in UI), not 'missed'.
 * Days before today with no check-in are 'missed'.
 */
export function computeConsistency(
  checkIns: readonly CheckInRecord[],
  today: Date,
): Consistency {
  // Build a lookup map: date string → status
  const byDate = new Map<string, CheckInStatus>();
  for (const ci of checkIns) {
    byDate.set(ci.date, ci.status);
  }

  const todayStr = today.toISOString().slice(0, 10);

  let done = 0;
  let partial = 0;
  let skipped = 0;
  let missed = 0;
  const last21Days: DayState[] = [];

  // Build window of 21 days ending today (index 0 = 20 days ago, index 20 = today)
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const status = byDate.get(dateStr);

    if (status === undefined) {
      // No check-in for this day
      if (dateStr === todayStr) {
        last21Days.push('pending');
        // pending today does not count as missed
      } else {
        last21Days.push('missed');
        missed++;
      }
    } else if (status === 'done') {
      last21Days.push('on');
      done++;
    } else if (status === 'partial') {
      last21Days.push('half');
      partial++;
    } else {
      // skipped
      last21Days.push('skipped');
      skipped++;
    }
  }

  return { done, partial, skipped, missed, last21Days };
}
