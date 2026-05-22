import { z } from 'zod';
import type { LlmProvider } from '../llm/provider';
import { type PoolQuestion, QUESTION_POOL, QUESTION_POOL_BY_ID } from './question-pool';
import type { Domain } from './schemas';

export const SelectionOutputSchema = z.object({
  questionIds: z.array(z.string()).min(1).max(12),
});
export type SelectionOutput = z.infer<typeof SelectionOutputSchema>;

export type SelectQuestionsInput = {
  llm: LlmProvider;
  freeFormText: string;
  count?: number;
  pool?: readonly PoolQuestion[];
};

export type SelectQuestionsResult = {
  selected: PoolQuestion[];
  remaining: PoolQuestion[];
};

function buildSystemPrompt(): string {
  return [
    'You select the most relevant onboarding questions for a health-habit tracker.',
    'The user has shared free-form context about their life. From a pool of pre-written questions,',
    'pick the N most relevant ones that will best inform habit recommendations.',
    '',
    'Selection rules:',
    '- Prioritise questions whose topic is hinted at in the free-form text (occupation, schedule, food, sleep, stress, exercise, hobbies, etc.).',
    '- Cover at least 3 of the 4 health domains (sleep, nutrition_gut, exercise_longevity, mental_health) when possible.',
    '- Include at least 1 question from the "general" domain (goals, time budget, motivation).',
    '- Do not pick more than 2 questions from the same domain unless the free-form text strongly emphasises it.',
    '- Return ONLY question IDs from the provided pool. Do not invent IDs.',
  ].join('\n');
}

function buildUserPrompt(
  freeFormText: string,
  pool: readonly PoolQuestion[],
  count: number,
): string {
  const poolList = pool.map((q) => `- ${q.id} [${q.domain}]: ${q.text}`).join('\n');
  const trimmedText = freeFormText.trim().slice(0, 4000) || '(user did not share anything)';
  return [
    `Pick ${count} question IDs from this pool:`,
    '',
    poolList,
    '',
    'User free-form context:',
    '"""',
    trimmedText,
    '"""',
    '',
    `Return JSON: { "questionIds": ["id1", "id2", ...] } with exactly ${count} IDs.`,
  ].join('\n');
}

function fallbackSelection(count: number, pool: readonly PoolQuestion[]): PoolQuestion[] {
  const byDomain = new Map<Domain | 'general', PoolQuestion[]>();
  for (const q of pool) {
    const arr = byDomain.get(q.domain) ?? [];
    arr.push(q);
    byDomain.set(q.domain, arr);
  }
  const order: (Domain | 'general')[] = [
    'sleep',
    'nutrition_gut',
    'exercise_longevity',
    'mental_health',
    'general',
  ];
  const picked: PoolQuestion[] = [];
  const cursors = new Map<Domain | 'general', number>();
  while (picked.length < count) {
    let progressed = false;
    for (const d of order) {
      if (picked.length >= count) break;
      const list = byDomain.get(d);
      if (!list) continue;
      const idx = cursors.get(d) ?? 0;
      if (idx >= list.length) continue;
      const candidate = list[idx]!;
      picked.push(candidate);
      cursors.set(d, idx + 1);
      progressed = true;
    }
    if (!progressed) break;
  }
  return picked;
}

export async function selectQuestions(input: SelectQuestionsInput): Promise<SelectQuestionsResult> {
  const pool = input.pool ?? QUESTION_POOL;
  const count = input.count ?? 8;
  const safeCount = Math.min(Math.max(count, 1), pool.length);

  let selectedIds: string[] = [];
  try {
    const { data } = await input.llm.completeStructured({
      tier: 'cheap',
      systemPrompt: buildSystemPrompt(),
      userPrompt: buildUserPrompt(input.freeFormText, pool, safeCount),
      schema: SelectionOutputSchema,
      temperature: 0.2,
    });
    selectedIds = data.questionIds;
  } catch {
    selectedIds = [];
  }

  const seen = new Set<string>();
  const lookup = (
    input.pool ? Object.fromEntries(pool.map((q) => [q.id, q])) : QUESTION_POOL_BY_ID
  ) as Record<string, PoolQuestion>;
  const selected: PoolQuestion[] = [];
  for (const id of selectedIds) {
    const q = lookup[id];
    if (q && !seen.has(id)) {
      seen.add(id);
      selected.push(q);
    }
    if (selected.length >= safeCount) break;
  }

  if (selected.length < safeCount) {
    for (const q of fallbackSelection(safeCount, pool)) {
      if (selected.length >= safeCount) break;
      if (!seen.has(q.id)) {
        seen.add(q.id);
        selected.push(q);
      }
    }
  }

  const remaining = pool.filter((q) => !seen.has(q.id));
  return { selected, remaining };
}
