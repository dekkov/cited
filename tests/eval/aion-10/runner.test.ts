import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  parseFixtures,
  runEval,
  assertThresholds,
  type JudgeFn,
} from './runner';

const FIXTURES_PATH = resolve(__dirname, 'fixtures.jsonl');

describe('AION-10 runner', () => {
  it('parseFixtures() reads jsonl and returns 5 fixtures', () => {
    const fixtures = parseFixtures(FIXTURES_PATH);
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
    expect(fixtures[0]?.id).toBe('fx-001');
    expect(fixtures[0]?.ai_kind).toBe('refine-claim');
  });

  it('runEval() with mocked judge returning all grounded=true → reports 100% grounded, 0% hallucinated, passes thresholds', async () => {
    const fixtures = parseFixtures(FIXTURES_PATH);
    const judge: JudgeFn = async () => ({
      grounded: true,
      hallucinated: false,
      reasoning: 'mock',
    });
    const report = await runEval({ fixtures, judge });
    expect(report.groundedRate).toBe(1);
    expect(report.hallucinatedRate).toBe(0);
    expect(() => assertThresholds(report)).not.toThrow();
  });

  it('runEval() with mocked judge returning 1 hallucinated of 5 → reports >0% hallucinated and fails thresholds', async () => {
    const fixtures = parseFixtures(FIXTURES_PATH);
    let count = 0;
    const judge: JudgeFn = async () => {
      count += 1;
      if (count === 1) return { grounded: false, hallucinated: true, reasoning: 'mock' };
      return { grounded: true, hallucinated: false, reasoning: 'mock' };
    };
    const report = await runEval({ fixtures, judge });
    expect(report.hallucinatedRate).toBeGreaterThan(0);
    expect(() => assertThresholds(report)).toThrow(/hallucinated/);
  });

  it('runEval() with grounded rate <90% → fails thresholds', async () => {
    const fixtures = parseFixtures(FIXTURES_PATH);
    // 2 of 5 not grounded (and not hallucinated either — ambiguous) → 60% grounded
    let count = 0;
    const judge: JudgeFn = async () => {
      count += 1;
      if (count <= 2) return { grounded: false, hallucinated: false, reasoning: 'mock' };
      return { grounded: true, hallucinated: false, reasoning: 'mock' };
    };
    const report = await runEval({ fixtures, judge });
    expect(report.groundedRate).toBeLessThan(0.9);
    expect(() => assertThresholds(report)).toThrow(/grounded rate/);
  });

  it('Missing fixtures.jsonl → throws with clear error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aion10-'));
    const missing = join(dir, 'fixtures.jsonl');
    try {
      expect(() => parseFixtures(missing)).toThrow(/AION-10 fixtures missing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parseFixtures rejects malformed json lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'aion10-'));
    const path = join(dir, 'fixtures.jsonl');
    writeFileSync(path, '{not json}\n');
    try {
      expect(() => parseFixtures(path)).toThrow(/Invalid fixture on line 1/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
