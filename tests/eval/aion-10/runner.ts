import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES_PATH = resolve(__dirname, 'fixtures.jsonl');
const PROMPT_PATH = resolve(__dirname, 'judge-prompt.md');

const GROUNDED_THRESHOLD = 0.9;
const HALLUCINATED_TOLERANCE = 0.0;

const fixtureSchema = z.object({
  id: z.string(),
  episode_id: z.string(),
  transcript_text: z.string(),
  ai_kind: z.enum(['refine-claim', 'suggest-start-end', 'propose-alternative']),
  ai_input: z.record(z.unknown()),
  ai_output: z.record(z.unknown()),
  expected_grounded: z.boolean(),
});
type Fixture = z.infer<typeof fixtureSchema>;

const judgeOutputSchema = z.object({
  grounded: z.boolean(),
  hallucinated: z.boolean(),
  reasoning: z.string(),
});

export function parseFixtures(path: string = FIXTURES_PATH): Fixture[] {
  if (!existsSync(path)) throw new Error(`AION-10 fixtures missing at ${path}`);
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line, i) => {
      try {
        return fixtureSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(`Invalid fixture on line ${i + 1}: ${(e as Error).message}`);
      }
    });
}

export type JudgeResult = z.infer<typeof judgeOutputSchema>;
export type JudgeFn = (fx: Fixture) => Promise<JudgeResult>;

export type EvalReport = {
  total: number;
  grounded: number;
  hallucinated: number;
  groundedRate: number;
  hallucinatedRate: number;
  results: Array<{ fx: Fixture; j: JudgeResult }>;
};

export async function runEval(opts?: {
  fixtures?: Fixture[];
  judge?: JudgeFn;
}): Promise<EvalReport> {
  const fixtures = opts?.fixtures ?? parseFixtures();
  const promptHeader = existsSync(PROMPT_PATH) ? readFileSync(PROMPT_PATH, 'utf8') : '';
  const judge: JudgeFn =
    opts?.judge ??
    (async (fx: Fixture) => {
      // Lazy-load to keep unit-test runs free of the workspace LLM dep graph.
      // The CI gating job runs this and resolves @cited/core via pnpm workspaces.
      const { getLlm } = (await import('@cited/core')) as typeof import('@cited/core');
      const llm = getLlm();
      const { data } = await llm.completeStructured({
        tier: 'reasoning',
        systemPrompt: promptHeader,
        userPrompt: JSON.stringify({
          transcript_text: fx.transcript_text,
          ai_kind: fx.ai_kind,
          ai_input: fx.ai_input,
          ai_output: fx.ai_output,
        }),
        schema: judgeOutputSchema,
        temperature: 0,
      });
      return data;
    });

  const results = await Promise.all(
    fixtures.map(async (fx) => ({ fx, j: await judge(fx) })),
  );
  const total = results.length;
  const grounded = results.filter((r) => r.j.grounded).length;
  const hallucinated = results.filter((r) => r.j.hallucinated).length;
  const groundedRate = total > 0 ? grounded / total : 0;
  const hallucinatedRate = total > 0 ? hallucinated / total : 0;
  return { total, grounded, hallucinated, groundedRate, hallucinatedRate, results };
}

export function assertThresholds(report: EvalReport): void {
  // Hallucinated tolerance is checked first because it's the harder line:
  // a single hallucination fails the gate regardless of the grounded rate.
  if (report.hallucinatedRate > HALLUCINATED_TOLERANCE) {
    throw new Error(
      `AION-10 hallucinated rate ${(report.hallucinatedRate * 100).toFixed(1)}% > ${HALLUCINATED_TOLERANCE * 100}% tolerance`,
    );
  }
  if (report.groundedRate < GROUNDED_THRESHOLD) {
    throw new Error(
      `AION-10 grounded rate ${(report.groundedRate * 100).toFixed(1)}% < ${GROUNDED_THRESHOLD * 100}% threshold`,
    );
  }
}

// The gating describe runs only when explicitly enabled (in CI via the
// aion10-eval workflow). Unit tests in runner.test.ts import this module
// without triggering a real LLM call.
const RUN_LIVE_EVAL = process.env['AION10_LIVE_EVAL'] === '1';

describe.runIf(RUN_LIVE_EVAL)('AION-10 hallucination eval (live)', () => {
  it(
    'meets thresholds: grounded ≥90%, hallucinated == 0%',
    async () => {
      const report = await runEval();
      // eslint-disable-next-line no-console
      console.log(
        `AION-10 eval: ${report.grounded}/${report.total} grounded, ${report.hallucinated} hallucinated`,
      );
      expect(report.groundedRate).toBeGreaterThanOrEqual(GROUNDED_THRESHOLD);
      expect(report.hallucinatedRate).toBeLessThanOrEqual(HALLUCINATED_TOLERANCE);
    },
    120_000,
  );
});

export { GROUNDED_THRESHOLD, HALLUCINATED_TOLERANCE };
