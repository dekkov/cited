import { describe, expect, it } from 'vitest';
import { WINDOW_DAYS, computeConsistency } from './consistency';

function makeDate(daysAgo: number, today: Date = new Date('2024-01-21')): string {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe('computeConsistency', () => {
  const TODAY = new Date('2024-01-21');

  it('Test 1: 21 check-ins all done → done=21 partial=0 skipped=0 missed=0 last21Days all on', () => {
    const checkIns = Array.from({ length: 21 }, (_, i) => ({
      date: makeDate(20 - i, TODAY),
      status: 'done' as const,
    }));
    const result = computeConsistency(checkIns, TODAY);
    expect(result.done).toBe(21);
    expect(result.partial).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.missed).toBe(0);
    expect(result.last21Days).toHaveLength(21);
    expect(result.last21Days.every((s) => s === 'on')).toBe(true);
  });

  it('Test 2: 18 done + 1 partial + 1 skipped + 1 missing → done=18 partial=1 skipped=1 missed=1', () => {
    // Build 21 days; day at index 19 (2 days ago) is partial, day 18 (3 days ago) is skipped,
    // day 17 (4 days ago) is missing (no check-in)
    const checkIns = [
      // days 20..18 ago = done (indices 0..2, dates 20,19,18 days ago)
      // Then skip day 17 ago (make it missing)
      // day 16 ago = skipped
      // day 15 ago = partial
      // days 14..0 ago = done
      ...Array.from({ length: 3 }, (_, i) => ({
        date: makeDate(20 - i, TODAY),
        status: 'done' as const,
      })),
      // day 17 ago → no check-in (missing)
      {
        date: makeDate(16, TODAY),
        status: 'skipped' as const,
      },
      {
        date: makeDate(15, TODAY),
        status: 'partial' as const,
      },
      ...Array.from({ length: 15 }, (_, i) => ({
        date: makeDate(14 - i, TODAY),
        status: 'done' as const,
      })),
    ];
    const result = computeConsistency(checkIns, TODAY);
    expect(result.done).toBe(18);
    expect(result.partial).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.missed).toBe(1);
  });

  it('Test 3: Today with no check-in → last cell is pending not missed', () => {
    // Only yesterday has a check-in; today has none
    const checkIns = [{ date: makeDate(1, TODAY), status: 'done' as const }];
    const result = computeConsistency(checkIns, TODAY);
    const todayCell = result.last21Days[20]; // last cell = today
    expect(todayCell).toBe('pending');
  });

  it('WINDOW_DAYS is 21', () => {
    expect(WINDOW_DAYS).toBe(21);
  });

  it('Returns last21Days array of length 21', () => {
    const result = computeConsistency([], TODAY);
    expect(result.last21Days).toHaveLength(21);
  });

  it('All empty check-ins → 20 missed + 1 pending (today)', () => {
    const result = computeConsistency([], TODAY);
    expect(result.missed).toBe(20);
    expect(result.done).toBe(0);
    // Today is pending
    const lastCell = result.last21Days[20];
    expect(lastCell).toBe('pending');
  });

  it('partial check-in maps to half state', () => {
    const checkIns = [{ date: makeDate(1, TODAY), status: 'partial' as const }];
    const result = computeConsistency(checkIns, TODAY);
    const dayBeforeToday = result.last21Days[19];
    expect(dayBeforeToday).toBe('half');
  });

  it('skipped check-in maps to skipped state', () => {
    const checkIns = [{ date: makeDate(1, TODAY), status: 'skipped' as const }];
    const result = computeConsistency(checkIns, TODAY);
    const dayBeforeToday = result.last21Days[19];
    expect(dayBeforeToday).toBe('skipped');
  });
});
