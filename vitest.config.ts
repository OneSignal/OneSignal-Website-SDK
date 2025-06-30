import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __API_ORIGIN__: JSON.stringify('onesignal.com'),
    __API_TYPE__: JSON.stringify('staging'),
    __BUILD_ORIGIN__: JSON.stringify('onesignal.com'),
    __BUILD_TYPE__: JSON.stringify('production'),
    __IS_HTTPS__: JSON.stringify(true),
    __LOGGING__: JSON.stringify(false),
    __NO_DEV_PORT__: JSON.stringify(true),
    __VERSION__: JSON.stringify('1'),
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
      reportOnFailure: true,
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', '__test__/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto', './__test__/setupTests.ts'],
  },
});
