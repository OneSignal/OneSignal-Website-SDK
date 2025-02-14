/** @returns {Promise<import('jest').Config>} */
module.exports = async () => {
  return {
    coverageDirectory: 'coverage',
    coverageReporters: ['text-summary', 'lcov'],
    verbose: true,
    preset: 'ts-jest',
    forceExit: true,
    bail: true,
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      '^src/(.*)$': '<rootDir>/src/$1',
      '^__test__/(.*)$': '<rootDir>/__test__/$1',
    },
    // Run these files after jest has been
    // installed in the environment
    setupFilesAfterEnv: ['<rootDir>/__test__/jest/jest.setup.ts'], // use .js if you prefer JavaScript,
    setupFiles: [
      'jest-localstorage-mock',
      '<rootDir>/__test__/jest/jest.setupfiles.ts',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
    resetMocks: false,
    clearMocks: true,
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
