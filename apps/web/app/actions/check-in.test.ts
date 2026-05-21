import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock server-only before importing the action
vi.mock('server-only', () => ({}));

// ─── Auth mock ────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth/guards', () => ({
  getSessionUser: vi.fn(),
}));

// ─── Core mock ────────────────────────────────────────────────────────────────
vi.mock('@cited/core', () => ({
  applyCheckIn: vi.fn(),
  isGraduationReady: vi.fn(),
}));

// ─── DB mock ─────────────────────────────────────────────────────────────────
// We build a fresh db mock instance for each test in beforeEach
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { checkInAction } from './check-in';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/guards';
import { applyCheckIn, isGraduationReady } from '@cited/core';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const HABIT_ID = '00000000-0000-0000-0000-000000000002';

function makeDbMock() {
  // streaks upsert path still uses onConflictDoUpdate
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const valuesInsert = vi.fn(() => ({
    onConflictDoUpdate,
    // Plain insert (check_ins now) — awaiting values() should resolve.
    then: (resolve: (v: unknown) => void) => resolve(undefined),
  }));
  const whereUpdate = vi.fn().mockResolvedValue(undefined);
  const setUpdate = vi.fn(() => ({ where: whereUpdate }));

  const findFirstUserHabits = vi.fn();
  const findFirstConsentRecords = vi.fn();
  const findFirstStreaks = vi.fn();
  const findFirstCheckIns = vi.fn();

  const findManyStub = vi.fn();

  return {
    query: {
      userHabits: { findFirst: findFirstUserHabits },
      consentRecords: { findFirst: findFirstConsentRecords },
      streaks: { findFirst: findFirstStreaks },
      streakFreezes: { findMany: findManyStub },
      checkIns: { findFirst: findFirstCheckIns },
    },
    insert: vi.fn(() => ({ values: valuesInsert })),
    update: vi.fn(() => ({ set: setUpdate })),
    _valuesInsert: valuesInsert,
    _setUpdate: setUpdate,
    _whereUpdate: whereUpdate,
    _onConflictDoUpdate: onConflictDoUpdate,
    _findFirstUserHabits: findFirstUserHabits,
    _findFirstConsentRecords: findFirstConsentRecords,
    _findFirstStreaks: findFirstStreaks,
    _findFirstCheckIns: findFirstCheckIns,
    _findManyStreakFreezes: findManyStub,
  };
}

let db: ReturnType<typeof makeDbMock>;

beforeEach(() => {
  vi.clearAllMocks();

  db = makeDbMock();
  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

  // Default: authenticated
  vi.mocked(getSessionUser).mockResolvedValue({
    id: USER_ID,
    email: 'test@example.com',
    role: 'user',
  });

  // Default: habit exists for this user
  db._findFirstUserHabits.mockResolvedValue({
    id: HABIT_ID,
    userId: USER_ID,
    status: 'active',
  });

  // Default: no consent for ai_free_text
  db._findFirstConsentRecords.mockResolvedValue(null);

  // Default: no existing streak
  db._findFirstStreaks.mockResolvedValue(null);

  // Default: no freezes (called multiple times, always returns empty)
  db._findManyStreakFreezes.mockResolvedValue([]);

  // Default: no existing check-in for today
  db._findFirstCheckIns.mockResolvedValue(null);

  // Default: applyCheckIn returns normal increment
  vi.mocked(applyCheckIn).mockReturnValue({
    next: {
      currentLength: 1,
      longestLength: 1,
      lastCheckInDate: '2024-01-21',
      freezesAvailable: 2,
      freezeUsedThisWeek: false,
    },
    freezeApplied: false,
    daysReset: false,
  });

  // Default: not graduation ready
  vi.mocked(isGraduationReady).mockReturnValue(false);
});

describe('checkInAction', () => {
  it('Test 1: upserts check_in row and updates streak on done status', async () => {
    const result = await checkInAction({
      userHabitId: HABIT_ID,
      status: 'done',
    });

    expect(db.insert).toHaveBeenCalled();
    expect(applyCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({ currentLength: 0 }),
      'done',
      expect.any(String),
    );
    expect(result).toMatchObject({ freezeApplied: false, graduated: false });
  });

  it('Test 2: note is dropped if ai_free_text consent is not granted', async () => {
    db._findFirstConsentRecords.mockResolvedValue(null);

    await checkInAction({
      userHabitId: HABIT_ID,
      status: 'done',
      note: 'I really struggled today',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = db._valuesInsert.mock.calls as any[][];
    const valuesArg = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(valuesArg?.note).toBeNull();
  });

  it('Test 2b: note is stored if ai_free_text consent is granted', async () => {
    db._findFirstConsentRecords.mockResolvedValue({
      scope: 'ai_free_text',
      granted: true,
    });

    await checkInAction({
      userHabitId: HABIT_ID,
      status: 'done',
      note: 'Feeling great today',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = db._valuesInsert.mock.calls as any[][];
    const valuesArg = calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(valuesArg?.note).toBe('Feeling great today');
  });

  it('Test 3: when freezeApplied=true, action returns { freezeApplied: true } and updates freeze row', async () => {
    vi.mocked(applyCheckIn).mockReturnValue({
      next: {
        currentLength: 5,
        longestLength: 10,
        lastCheckInDate: '2024-01-21',
        freezesAvailable: 1,
        freezeUsedThisWeek: true,
      },
      freezeApplied: true,
      daysReset: false,
    });

    const freezeRow = {
      id: 'freeze-1',
      userId: USER_ID,
      userHabitId: HABIT_ID,
      bankedAt: new Date(),
      usedAt: null,
    };
    db._findManyStreakFreezes.mockResolvedValue([freezeRow]);

    const result = await checkInAction({
      userHabitId: HABIT_ID,
      status: 'skipped',
    });

    expect(result.freezeApplied).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it('Test 4: when isGraduationReady returns true, sets graduated status and returns { graduated: true }', async () => {
    vi.mocked(applyCheckIn).mockReturnValue({
      next: {
        currentLength: 21,
        longestLength: 21,
        lastCheckInDate: '2024-01-21',
        freezesAvailable: 2,
        freezeUsedThisWeek: false,
      },
      freezeApplied: false,
      daysReset: false,
    });
    vi.mocked(isGraduationReady).mockReturnValue(true);

    const result = await checkInAction({
      userHabitId: HABIT_ID,
      status: 'done',
    });

    expect(result.graduated).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it('throws Unauthorized if user is not authenticated', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    await expect(checkInAction({ userHabitId: HABIT_ID, status: 'done' })).rejects.toThrow(
      'Unauthorized',
    );
  });

  it('rejects re-check-in on the same day (once-per-day rule)', async () => {
    db._findFirstCheckIns.mockResolvedValue({ id: 'existing-checkin-id' });

    await expect(
      checkInAction({ userHabitId: HABIT_ID, status: 'done' }),
    ).rejects.toThrow('AlreadyCheckedIn');

    // No insert, no streak update, no graduation flip.
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
