import { server } from './support/mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// set timezone
process.env.TZ = 'America/Los_Angeles';

global.isSecureContext = true;

Object.defineProperty(global, 'location', {
  value: new URL('https://localhost:3000'),
  writable: true,
});

// in case we want to await operations with real timers
vi.mock('src/core/operationRepo/constants', () => ({
  OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF: 5,
  OP_REPO_POST_CREATE_DELAY: 5,
  OP_REPO_EXECUTION_INTERVAL: 5,
  OP_REPO_POST_CREATE_RETRY_UP_TO: 10,
}));
