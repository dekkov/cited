import type { EmbeddingProvider, LlmProvider } from './provider';
import { anthropicLlm } from './anthropic';
import { openaiEmbeddings, openaiLlm } from './openai';

/**
 * Returns the configured LLM provider for chat/completion tasks.
 * Default: anthropic (Claude)
 * Override: LLM_PROVIDER=openai
 */
export function getLlm(): LlmProvider {
  const provider = process.env['LLM_PROVIDER'] ?? 'anthropic';
  if (provider === 'openai') return openaiLlm;
  return anthropicLlm;
}

/**
 * Returns the configured embedding provider.
 * Default: openai (text-embedding-3-small)
 * Override: EMBEDDING_PROVIDER=openai (currently only option)
 */
export function getEmbeddings(): EmbeddingProvider {
  return openaiEmbeddings;
}
