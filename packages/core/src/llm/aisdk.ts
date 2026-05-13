import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { LlmTier } from './types';

/**
 * Returns an AI SDK v6 LanguageModel for the given tier.
 * This is the ONLY place @ai-sdk/openai and @ai-sdk/anthropic LanguageModel constructors
 * are referenced (AION-09 — no direct AI SDK provider imports in apps/web routes).
 *
 * Env:
 *   LLM_MODEL_CHEAP      default 'claude-haiku-4-5'      (set 'gpt-4o-mini' to use OpenAI)
 *   LLM_MODEL_REASONING  default 'claude-sonnet-4-5'
 *   LLM_PROVIDER         'anthropic' (default) | 'openai'
 */
export function getAiSdkModel(tier: LlmTier): LanguageModel {
  const provider = process.env['LLM_PROVIDER'] ?? 'anthropic';
  if (tier === 'cheap') {
    const id = process.env['LLM_MODEL_CHEAP'] ?? (provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5');
    return provider === 'openai' ? openai(id) : anthropic(id);
  }
  const id = process.env['LLM_MODEL_REASONING'] ?? 'claude-sonnet-4-5';
  return provider === 'openai' ? openai(id) : anthropic(id);
}
