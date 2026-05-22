import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// apps/web has its own config so `vitest run` (and turbo's per-package `test`
// task) discovers the web unit/component tests when invoked from this dir.
// Playwright specs live in __tests__/ and e2e/ and are excluded — they run via
// `playwright test`, not vitest.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      // Mirror tsconfig paths: @/* → apps/web/*
      '@/': `${resolve(__dirname)}/`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [resolve(__dirname, '../../vitest.setup.ts')],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    include: ['{app,lib,components}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'e2e/**', '__tests__/**'],
  },
});
