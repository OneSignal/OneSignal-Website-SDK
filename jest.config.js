/** @returns {Promise<import('jest').Config>} */
module.exports = async () => {
  return {
    clearMocks: true,
    collectCoverageFrom: ['src/**/*.{ts,tsx}'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'lcov'],
    verbose: true,
    preset: 'ts-jest',
    forceExit: true,
    bail: true,
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^__test__(.*)$': '<rootDir>/__test__/$1',
      '^src/(.*)$': '<rootDir>/src/$1',
    },
    // Run these files after jest has been
    // installed in the environment
    setupFilesAfterEnv: ['<rootDir>/__test__/jest/jest.setup.ts'], // use .js if you prefer JavaScript,
    setupFiles: [
      'jest-localstorage-mock',
      '<rootDir>/__test__/jest/jest.setupfiles.ts',
    ],
    resetMocks: false,
    // hide type errors: https://stackoverflow.com/questions/73687337/disable-type-checking-stopped-working-after-ts-jest-upgrade-to-29-0
    globals: {
      'ts-jest': {
        diagnostics: {
          exclude: ['**'],
        },
      },
    },
  };
};
