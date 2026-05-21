import { describe, expect, it } from 'vitest';
import { NO_INDEX_RISK_FLAGS, shouldNoIndex, templateShouldNoIndex } from './seoPolicy';

describe('shouldNoIndex', () => {
  it('Test 1: supplement risk flag → true', () => {
    expect(shouldNoIndex({ risk_flags: ['supplement'] })).toBe(true);
  });

  it('Test 2: medical_advice risk flag → true', () => {
    expect(shouldNoIndex({ risk_flags: ['medical_advice'] })).toBe(true);
  });

  it('Test 3: contraindication risk flag → true', () => {
    expect(shouldNoIndex({ risk_flags: ['contraindication'] })).toBe(true);
  });

  it('Test 4: empty risk_flags → false', () => {
    expect(shouldNoIndex({ risk_flags: [] })).toBe(false);
  });

  it('Test 5: general risk flag → false', () => {
    expect(shouldNoIndex({ risk_flags: ['general'] })).toBe(false);
  });

  it('mixed flags including a no-index flag → true', () => {
    expect(shouldNoIndex({ risk_flags: ['general', 'supplement'] })).toBe(true);
  });

  it('NO_INDEX_RISK_FLAGS export contains all three flags', () => {
    expect(NO_INDEX_RISK_FLAGS).toContain('supplement');
    expect(NO_INDEX_RISK_FLAGS).toContain('medical_advice');
    expect(NO_INDEX_RISK_FLAGS).toContain('contraindication');
  });
});

describe('templateShouldNoIndex', () => {
  it('returns false when no clips have no-index flags', () => {
    expect(
      templateShouldNoIndex([
        { risk_flags: [] },
        { risk_flags: ['general'] },
      ]),
    ).toBe(false);
  });

  it('returns true when at least one clip has a no-index flag', () => {
    expect(
      templateShouldNoIndex([
        { risk_flags: [] },
        { risk_flags: ['supplement'] },
      ]),
    ).toBe(true);
  });

  it('returns false for empty clips array', () => {
    expect(templateShouldNoIndex([])).toBe(false);
  });
});
