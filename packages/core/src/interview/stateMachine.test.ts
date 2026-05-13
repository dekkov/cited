import { describe, it, expect } from 'vitest';
import { computeNextTurn, MAX_TURNS, MIN_TURNS } from './stateMachine';
import type { DomainCoverage } from './stateMachine';

const fullCoverage: DomainCoverage = {
  sleep: 1,
  nutrition_gut: 1,
  exercise_longevity: 1,
  mental_health: 1,
};

const zeroCoverage: DomainCoverage = {
  sleep: 0,
  nutrition_gut: 0,
  exercise_longevity: 0,
  mental_health: 0,
};

const doubleCoverage: DomainCoverage = {
  sleep: 2,
  nutrition_gut: 2,
  exercise_longevity: 2,
  mental_health: 2,
};

describe('computeNextTurn', () => {
  it('Test 1: turnCount < 3 → priorityDomain: null (no bias yet)', () => {
    const result = computeNextTurn({
      turnCount: 2,
      domainCoverage: { sleep: 2, nutrition_gut: 1, exercise_longevity: 0, mental_health: 0 },
      userDoneSignal: false,
    });
    expect(result.priorityDomain).toBeNull();
    expect(result.done).toBe(false);
  });

  it('Test 2: turnCount=3, gaps detected → priorityDomain is one of the zero-coverage domains', () => {
    const result = computeNextTurn({
      turnCount: 3,
      domainCoverage: { sleep: 2, nutrition_gut: 1, exercise_longevity: 0, mental_health: 0 },
      userDoneSignal: false,
    });
    expect(result.priorityDomain).not.toBeNull();
    expect(['exercise_longevity', 'mental_health']).toContain(result.priorityDomain);
    expect(result.done).toBe(false);
  });

  it('Test 3: turnCount=10 → done: true with hard_cap', () => {
    const result = computeNextTurn({
      turnCount: MAX_TURNS,
      domainCoverage: zeroCoverage,
      userDoneSignal: false,
    });
    expect(result.done).toBe(true);
    expect(result.doneReason).toBe('hard_cap');
    expect(result.turnIndex).toBe(MAX_TURNS + 1);
  });

  it('Test 4: turnCount>=6, all domains touched, userDoneSignal=true → done: true, user_signal', () => {
    const result = computeNextTurn({
      turnCount: MIN_TURNS,
      domainCoverage: fullCoverage,
      userDoneSignal: true,
    });
    expect(result.done).toBe(true);
    expect(result.doneReason).toBe('user_signal');
  });

  it('Test 5: turnCount=5, all 4 domains touched at least twice → done: true, coverage_complete', () => {
    const result = computeNextTurn({
      turnCount: 5,
      domainCoverage: doubleCoverage,
      userDoneSignal: false,
    });
    expect(result.done).toBe(true);
    expect(result.doneReason).toBe('coverage_complete');
  });

  it('turnCount=0 → not done, no priority', () => {
    const result = computeNextTurn({
      turnCount: 0,
      domainCoverage: zeroCoverage,
      userDoneSignal: false,
    });
    expect(result.done).toBe(false);
    expect(result.priorityDomain).toBeNull();
    expect(result.turnIndex).toBe(1);
  });

  it('turnCount=6, all touched once, no user signal → not done (user_signal requires signal)', () => {
    const result = computeNextTurn({
      turnCount: 6,
      domainCoverage: fullCoverage,
      userDoneSignal: false,
    });
    expect(result.done).toBe(false);
  });
});
