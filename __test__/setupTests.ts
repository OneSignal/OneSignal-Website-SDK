import OneSignalApi from 'src/shared/api/OneSignalApi';
import { ConfigIntegrationKind } from 'src/shared/config/constants';
import { clearAll } from 'src/shared/database/client';
import { DEFAULT_USER_AGENT } from './constants';
import TestContext from './support/environment/TestContext';
import { server } from './support/mocks/server';

beforeAll(() =>
  server.listen({
    onUnhandledRequest: 'warn',
  }),
);

beforeEach(async () => {
  if (typeof OneSignal !== 'undefined') {
    OneSignal.coreDirector?.operationRepo.clear();
    OneSignal.emitter?.removeAllListeners();
  }
  await clearAll();
});

afterEach(() => {
  server.resetHandlers();
});

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
  OP_REPO_DEFAULT_FAIL_RETRY_BACKOFF: 10,
  OP_REPO_POST_CREATE_DELAY: 10,
  OP_REPO_EXECUTION_INTERVAL: 10,
  OP_REPO_POST_CREATE_RETRY_UP_TO: 20,
}));

Object.defineProperty(navigator, 'userAgent', {
  value: DEFAULT_USER_AGENT,
  writable: true,
});

export const mockJsonp = () => {
  const serverConfig = TestContext.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
  );
  vi.spyOn(OneSignalApi, 'jsonpLib').mockImplementation((_, fn) => {
    fn(null, serverConfig);
  });
};
