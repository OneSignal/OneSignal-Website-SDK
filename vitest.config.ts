import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __BUILD_ORIGIN__: JSON.stringify('onesignal.com'),
    __BUILD_TYPE__: JSON.stringify('production'),
    __API_TYPE__: JSON.stringify('staging'),
    __API_ORIGIN__: JSON.stringify('onesignal.com'),
    __IS_HTTPS__: JSON.stringify(true),
    __NO_DEV_PORT__: JSON.stringify(true),
  },
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
