import type { z } from 'zod';

export type LlmTier = 'cheap' | 'reasoning';

export type LlmCallOpts = {
  tier: LlmTier;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type LlmStructuredOpts<T extends z.ZodType> = LlmCallOpts & { schema: T };

export type LlmResponse = {
  text: string;
  provider: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
};

export type EmbeddingOpts = { input: string | string[] };

export type EmbeddingResponse = {
  embeddings: number[][];
  provider: string;
  model: string;
};
