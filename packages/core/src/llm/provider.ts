import type { z } from 'zod';
import type { EmbeddingOpts, EmbeddingResponse, LlmCallOpts, LlmResponse, LlmStructuredOpts } from './types';

export interface LlmProvider {
  name: string;
  complete(opts: LlmCallOpts): Promise<LlmResponse>;
  completeStructured<T extends z.ZodType>(
    opts: LlmStructuredOpts<T>,
  ): Promise<{ data: z.infer<T>; raw: LlmResponse }>;
}

export interface EmbeddingProvider {
  name: string;
  embed(opts: EmbeddingOpts): Promise<EmbeddingResponse>;
}
