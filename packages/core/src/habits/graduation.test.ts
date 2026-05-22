import { describe, expect, it } from 'vitest';
import { GRADUATION_MESSAGE, GRADUATION_THRESHOLD, isGraduationReady } from './graduation';

describe('isGraduationReady', () => {
  it('Test 9: streak.currentLength >= 21 AND status=active → true', () => {
    expect(isGraduationReady(21, 'active')).toBe(true);
    expect(isGraduationReady(25, 'active')).toBe(true);
    expect(isGraduationReady(100, 'active')).toBe(true);
  });

  it('Test 10: streak.currentLength = 20 → false', () => {
    expect(isGraduationReady(20, 'active')).toBe(false);
  });

  it('Test 11: userHabit.status=graduated → false (already graduated)', () => {
    expect(isGraduationReady(21, 'graduated')).toBe(false);
    expect(isGraduationReady(100, 'graduated')).toBe(false);
  });

  it('status=archived → false', () => {
    expect(isGraduationReady(21, 'archived')).toBe(false);
  });

  it('GRADUATION_THRESHOLD is 21', () => {
    expect(GRADUATION_THRESHOLD).toBe(21);
  });

  it('GRADUATION_MESSAGE contains the 🌱 emoji', () => {
    expect(GRADUATION_MESSAGE).toContain('🌱');
  });

  it('GRADUATION_MESSAGE is the D-09 verbatim text', () => {
    expect(GRADUATION_MESSAGE).toBe('This habit may now be part of your life 🌱');
  });
});
