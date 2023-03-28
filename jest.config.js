module.exports = {
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  verbose: true,
  preset: "ts-jest",
  forceExit: true,
  bail: true,
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/__test__/jest/jest.setup.ts"],
  setupFiles: ["jest-localstorage-mock"],
  resetMocks: false,
  globals: {
    // any other global configuration you need
  },
};
