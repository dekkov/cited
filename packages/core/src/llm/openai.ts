import type { z } from 'zod';
import type { EmbeddingProvider, LlmProvider } from './provider';
import type {
  EmbeddingOpts,
  EmbeddingResponse,
  LlmCallOpts,
  LlmResponse,
  LlmStructuredOpts,
} from './types';

function getOpenAiProvider() {
  if (!process.env['OPENAI_API_KEY']) {
    throw new Error('OPENAI_API_KEY is required for OpenAI provider');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createOpenAI } = require('@ai-sdk/openai') as typeof import('@ai-sdk/openai');
  return createOpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
}

function getChatModel(tier: 'cheap' | 'reasoning') {
  const openai = getOpenAiProvider();
  return tier === 'cheap' ? openai('gpt-4o-mini') : openai('gpt-4o');
}

function buildCallOpts(opts: LlmCallOpts) {
  return {
    system: opts.systemPrompt,
    prompt: opts.userPrompt,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
  };
}

export const openaiLlm: LlmProvider = {
  name: 'openai',

  async complete(opts: LlmCallOpts): Promise<LlmResponse> {
    const { generateText } = await import('ai');
    const model = getChatModel(opts.tier);
    const result = await generateText({ model, ...buildCallOpts(opts) });
    const response: LlmResponse = {
      text: result.text,
      provider: 'openai',
      model: opts.tier === 'cheap' ? 'gpt-4o-mini' : 'gpt-4o',
    };
    if (result.usage) {
      response.usage = {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
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
    const raw: LlmResponse = {
      text: JSON.stringify(result.object),
      provider: 'openai',
      model: opts.tier === 'cheap' ? 'gpt-4o-mini' : 'gpt-4o',
    };
    return { data: result.object as z.infer<T>, raw };
  },
};

export const openaiEmbeddings: EmbeddingProvider = {
  name: 'openai',

  async embed(opts: EmbeddingOpts): Promise<EmbeddingResponse> {
    if (!process.env['OPENAI_API_KEY']) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embeddings');
    }
    const { embedMany } = await import('ai');
    const { createOpenAI } = await import('@ai-sdk/openai');
    const openai = createOpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
    const values = Array.isArray(opts.input) ? opts.input : [opts.input];
    const result = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values,
    });
    return {
      embeddings: result.embeddings,
      provider: 'openai',
      model: 'text-embedding-3-small',
    };
  },
};
