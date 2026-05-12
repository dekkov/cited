import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    include: [
      '{apps,packages}/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/e2e/**'],
  },
});
