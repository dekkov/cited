import { describe, expect, it } from 'vitest';
import { anthropicLlm, openaiEmbeddings, openaiLlm } from './index';
import type { EmbeddingProvider, LlmProvider } from './provider';

describe('llm interface contract', () => {
  it('openai embedding provider has name + embed function', () => {
    const provider: EmbeddingProvider = openaiEmbeddings;
    expect(provider.name).toBe('openai');
    expect(typeof provider.embed).toBe('function');
  });

  it('openai llm provider has name + complete + completeStructured', () => {
    const provider: LlmProvider = openaiLlm;
    expect(provider.name).toBe('openai');
    expect(typeof provider.complete).toBe('function');
    expect(typeof provider.completeStructured).toBe('function');
  });

  it('anthropic llm provider has name + complete + completeStructured', () => {
    const provider: LlmProvider = anthropicLlm;
    expect(provider.name).toBe('anthropic');
    expect(typeof provider.complete).toBe('function');
    expect(typeof provider.completeStructured).toBe('function');
  });

  it('registry returns anthropic as default llm provider', async () => {
    const { getLlm, getEmbeddings } = await import('./registry');
    const llm = getLlm();
    expect(llm.name).toBe('anthropic');
    const embeddings = getEmbeddings();
    expect(embeddings.name).toBe('openai');
  });
});
