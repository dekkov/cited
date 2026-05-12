import { describe, expect, it } from 'vitest';
import { matchesHardBlock } from './hardBlockKeywords';

describe('matchesHardBlock', () => {
  it('flags dosing patterns', () => {
    const hit = matchesHardBlock('take 500mg of magnesium glycinate at bedtime');
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('dosing');
    expect(hit?.match.toLowerCase()).toContain('500mg');
  });

  it('returns null on safe phrasing about sleep', () => {
    const hit = matchesHardBlock('Dr X recommends getting 7 hours of sleep');
    expect(hit).toBeNull();
  });

  it('flags prescription drug names', () => {
    const hit = matchesHardBlock('ozempic is a glp-1 agonist');
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('prescription');
    expect(hit?.match).toBe('ozempic');
  });

  it('flags condition-treatment phrasing', () => {
    const hit = matchesHardBlock('if you have hypertension, see your doctor');
    expect(hit).not.toBeNull();
    expect(hit?.kind).toBe('condition_treatment');
  });

  it('does not flag generic healthy-adult guidance', () => {
    const hit = matchesHardBlock('for most healthy adults');
    expect(hit).toBeNull();
  });
});
