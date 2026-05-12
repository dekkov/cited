export * from './schemas';
export * from './prompts';

import { streamObject } from 'ai';
import {
  proposeAlternativeSystemPrompt,
  refineClaimSystemPrompt,
  suggestStartEndSystemPrompt,
} from './prompts';
import { type CopilotKind, copilotSchemaByKind } from './schemas';

const PROMPT_BY_KIND: Record<CopilotKind, string> = {
  'suggest-start-end': suggestStartEndSystemPrompt,
  'refine-claim': refineClaimSystemPrompt,
  'propose-alternative': proposeAlternativeSystemPrompt,
};

export type StreamCopilotInput = {
  kind: CopilotKind;
  userPrompt: string;
  temperature?: number;
  onFinish?: (args: { object: unknown }) => void | Promise<void>;
};

/**
 * AION-09 wrapper: route handlers MUST NOT import `@ai-sdk/anthropic` directly.
 * This helper instantiates the Anthropic model via the same require-wrapper used by
 * the rest of the LLM registry and returns a Vercel AI SDK streamObject result that
 * a Next.js route can pipe via `result.toTextStreamResponse()`.
 */
export function streamCopilotObject(input: StreamCopilotInput) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for streamCopilotObject');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createAnthropic } = require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const temperature = input.temperature ?? (input.kind === 'propose-alternative' ? 0.5 : 0.2);
  return streamObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: copilotSchemaByKind[input.kind],
    system: PROMPT_BY_KIND[input.kind],
    prompt: input.userPrompt,
    temperature,
    ...(input.onFinish ? { onFinish: input.onFinish } : {}),
  });
}
