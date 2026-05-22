export type Jurisdiction = 'us' | 'eu' | 'other';

export class AgeGateError extends Error {
  constructor(public readonly reason: 'too_young' | 'invalid_dob') {
    super(reason);
    this.name = 'AgeGateError';
  }
}

const MIN_AGE: Record<Jurisdiction, number> = { us: 13, eu: 16, other: 13 };

/**
 * Returns true iff person born on `dob` (YYYY-MM-DD) is at least the
 * jurisdiction-required minimum age on `now`.
 *
 * Leap-year handling: Feb 29 birthdays use Mar 1 as the anniversary in
 * non-leap years (i.e., someone born Feb 29 turns N years old on Mar 1 in
 * non-leap years).
 */
export function isAgeAllowed(
  dob: string,
  jurisdiction: Jurisdiction,
  now: Date = new Date(),
): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return false;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;

  const dobDate = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dobDate.getTime())) return false;

  // Reject future DOBs
  if (dobDate.getTime() > now.getTime()) return false;

  // Sanity: reject DOBs more than 120 years ago
  const maxBack = new Date(
    Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()),
  );
  if (dobDate.getTime() < maxBack.getTime()) return false;

  const minAge = MIN_AGE[jurisdiction];

  // Compute age with leap-year-aware anniversary logic.
  // For Feb 29 birthdays, the anniversary in a non-leap year is Mar 1.
  let anniversaryMonth = mo - 1; // 0-indexed month
  let anniversaryDay = d;

  // Feb 29 in non-leap target year → use Mar 1
  const isLeapBirthday = mo === 2 && d === 29;
  if (isLeapBirthday) {
    const targetYear = now.getUTCFullYear();
    const isLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    if (!isLeapYear) {
      anniversaryMonth = 2; // March (0-indexed)
      anniversaryDay = 1;
    }
  }

  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() < anniversaryMonth ||
    (now.getUTCMonth() === anniversaryMonth && now.getUTCDate() < anniversaryDay);

  if (beforeBirthday) age -= 1;

  return age >= minAge;
}
