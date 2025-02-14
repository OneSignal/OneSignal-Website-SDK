import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      __test__: path.resolve(__dirname, '__test__'),
    },
  },
  test: {
    clearMocks: true,
    coverage: {
      include: ['src/**'],
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', '__test__/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto', './__test__/setupTests.ts'],
  },
});
