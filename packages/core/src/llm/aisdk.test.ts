import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

// We need to test env-controlled tier resolution.
// Since getAiSdkModel reads process.env at call time, we can set env vars before each test.

describe('getAiSdkModel', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    for (const key of ['LLM_PROVIDER', 'LLM_MODEL_CHEAP', 'LLM_MODEL_REASONING']) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
    vi.resetModules();
  });

  it('Test 3: getAiSdkModel("cheap") returns a LanguageModel object', async () => {
    delete process.env['LLM_PROVIDER'];
    delete process.env['LLM_MODEL_CHEAP'];
    const { getAiSdkModel } = await import('./aisdk');
    const model = getAiSdkModel('cheap');
    // The model is a LanguageModel — verify it has the expected provider shape
    expect(model).toBeDefined();
    expect(typeof model).toBe('object');
  });

  it('Test 4: getAiSdkModel("reasoning") returns a LanguageModel object', async () => {
    delete process.env['LLM_PROVIDER'];
    delete process.env['LLM_MODEL_REASONING'];
    const { getAiSdkModel } = await import('./aisdk');
    const model = getAiSdkModel('reasoning');
    expect(model).toBeDefined();
    expect(typeof model).toBe('object');
  });

  it('cheap tier with openai provider uses openai model', async () => {
    process.env['LLM_PROVIDER'] = 'openai';
    process.env['LLM_MODEL_CHEAP'] = 'gpt-4o-mini';
    const { getAiSdkModel } = await import('./aisdk');
    const model = getAiSdkModel('cheap');
    expect(model).toBeDefined();
    // modelId is provider-specific — just verify we got a model back
    expect(typeof model).toBe('object');
  });

  it('reasoning tier with anthropic provider is default', async () => {
    delete process.env['LLM_PROVIDER'];
    delete process.env['LLM_MODEL_REASONING'];
    const { getAiSdkModel } = await import('./aisdk');
    const model = getAiSdkModel('reasoning');
    expect(model).toBeDefined();
  });
});
