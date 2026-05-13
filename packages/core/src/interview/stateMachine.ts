import type { Domain } from './schemas';

export type DomainCoverage = Readonly<Record<Domain, number>>;

export type TurnPlan = {
  readonly turnIndex: number;       // 1-based, next turn to issue
  readonly priorityDomain: Domain | null;
  readonly done: boolean;
  readonly doneReason: 'hard_cap' | 'coverage_complete' | 'user_signal' | null;
};

export const MAX_TURNS = 10;
export const MIN_TURNS = 6;

export function computeNextTurn(input: {
  readonly turnCount: number;
  readonly domainCoverage: DomainCoverage;
  readonly userDoneSignal: boolean;
}): TurnPlan {
  const { turnCount, domainCoverage, userDoneSignal } = input;

  if (turnCount >= MAX_TURNS) {
    return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'hard_cap' };
  }

  const allTouched = Object.values(domainCoverage).every((n) => n >= 1);
  const allDoubleTouched = Object.values(domainCoverage).every((n) => n >= 2);

  if (turnCount >= MIN_TURNS && allTouched && userDoneSignal) {
    return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'user_signal' };
  }

  if (turnCount >= 5 && allDoubleTouched) {
    return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'coverage_complete' };
  }

  let priority: Domain | null = null;
  if (turnCount >= 3) {
    const sorted = (Object.entries(domainCoverage) as [Domain, number][])
      .sort((a, b) => a[1] - b[1]);
    priority = sorted[0]?.[0] ?? null;
  }

  return { turnIndex: turnCount + 1, priorityDomain: priority, done: false, doneReason: null };
}
