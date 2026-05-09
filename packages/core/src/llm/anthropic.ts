import type { z } from 'zod';
import type { LlmProvider } from './provider';
import type { LlmCallOpts, LlmResponse, LlmStructuredOpts } from './types';

// Model IDs — Phase 3 will confirm exact versions via API
const CHEAP_MODEL = 'claude-haiku-4-5';
const REASONING_MODEL = 'claude-sonnet-4-6';

function getAnthropicProvider() {
  if (!process.env['ANTHROPIC_API_KEY']) {
    throw new Error('ANTHROPIC_API_KEY is required for Anthropic provider');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createAnthropic } = require('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
  return createAnthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
}

function getChatModel(tier: 'cheap' | 'reasoning') {
  const anthropic = getAnthropicProvider();
  return tier === 'cheap' ? anthropic(CHEAP_MODEL) : anthropic(REASONING_MODEL);
}

function buildCallOpts(opts: LlmCallOpts) {
  return {
    system: opts.systemPrompt,
    prompt: opts.userPrompt,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
  };
}

export const anthropicLlm: LlmProvider = {
  name: 'anthropic',

  async complete(opts: LlmCallOpts): Promise<LlmResponse> {
    const { generateText } = await import('ai');
    const model = getChatModel(opts.tier);
    const result = await generateText({ model, ...buildCallOpts(opts) });
    const modelId = opts.tier === 'cheap' ? CHEAP_MODEL : REASONING_MODEL;
    const response: LlmResponse = {
      text: result.text,
      provider: 'anthropic',
      model: modelId,
    };
    if (result.usage) {
      response.usage = {
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
      };
    }
    return response;
  },

  async completeStructured<T extends z.ZodType>(
    opts: LlmStructuredOpts<T>,
  ): Promise<{ data: z.infer<T>; raw: LlmResponse }> {
    const { generateObject } = await import('ai');
    const model = getChatModel(opts.tier);
    const result = await generateObject({
      model,
      schema: opts.schema as z.Schema<z.infer<T>, z.ZodTypeDef, unknown>,
      ...buildCallOpts(opts),
    });
    const modelId = opts.tier === 'cheap' ? CHEAP_MODEL : REASONING_MODEL;
    const raw: LlmResponse = {
      text: JSON.stringify(result.object),
      provider: 'anthropic',
      model: modelId,
    };
    return { data: result.object as z.infer<T>, raw };
  },
};
