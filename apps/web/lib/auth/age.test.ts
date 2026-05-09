import { describe, it, expect } from 'vitest';
import { isAgeAllowed } from './age';

// Fixed reference date for determinism: 2024-03-15
const NOW = new Date(Date.UTC(2024, 2, 15)); // 2024-03-15

describe('isAgeAllowed', () => {
  it('US: age 12y 364d → false', () => {
    // born 2011-03-16 → on 2024-03-15 is still 12
    expect(isAgeAllowed('2011-03-16', 'us', NOW)).toBe(false);
  });

  it('US: exactly 13 years ago today → true', () => {
    // born 2011-03-15 → on 2024-03-15 is exactly 13
    expect(isAgeAllowed('2011-03-15', 'us', NOW)).toBe(true);
  });

  it('EU: age 15y 364d → false', () => {
    // born 2008-03-16 → on 2024-03-15 is still 15
    expect(isAgeAllowed('2008-03-16', 'eu', NOW)).toBe(false);
  });

  it('EU: exactly 16 years ago today → true', () => {
    // born 2008-03-15 → on 2024-03-15 is exactly 16
    expect(isAgeAllowed('2008-03-15', 'eu', NOW)).toBe(true);
  });

  it('other: exactly 13 years ago → true (floor = 13)', () => {
    expect(isAgeAllowed('2011-03-15', 'other', NOW)).toBe(true);
  });

  it('dob in the future → false', () => {
    expect(isAgeAllowed('2025-01-01', 'us', NOW)).toBe(false);
  });

  it('dob > 120 years ago → false (sanity)', () => {
    expect(isAgeAllowed('1900-01-01', 'us', NOW)).toBe(false);
  });

  it('leap-year DOB (Feb 29) handled — Mar 1 anniversary in non-leap year', () => {
    // born 2004-02-29 (leap year). On 2024-03-15 (2024 IS a leap year so Feb 29 exists)
    // age = 20 → allowed for US (≥13)
    expect(isAgeAllowed('2004-02-29', 'us', NOW)).toBe(true);

    // Test the specific anniversary logic: in a non-leap year 2023-03-01
    // born 2010-02-29 doesn't actually exist — but 2012-02-29 does
    // In non-leap year 2023, Feb 29 doesn't exist. We use Mar 1 as anniversary.
    // 2023-02-28 is before the "birthday" (Mar 1) → still 10 years old
    const beforeBirthday2023 = new Date(Date.UTC(2023, 1, 28)); // 2023-02-28
    expect(isAgeAllowed('2012-02-29', 'us', beforeBirthday2023)).toBe(false); // 10y old

    // 2023-03-01 → just turned 11 → still under 13
    const onBirthday2023 = new Date(Date.UTC(2023, 2, 1)); // 2023-03-01
    expect(isAgeAllowed('2012-02-29', 'us', onBirthday2023)).toBe(false); // 11y old → < 13

    // born 2000-02-29, on 2023-03-01 → turned 23
    expect(isAgeAllowed('2000-02-29', 'us', onBirthday2023)).toBe(true); // 23 → ≥ 13
  });
});
