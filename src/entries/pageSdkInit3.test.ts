// separate test file to avoid side effects from pageSdkInit.test.ts
import { APP_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

describe('pageSdkInit 3', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('userJwtInvalidated reaches OneSignal.User listeners after a real init', async () => {
    window.OneSignalDeferred = [];
    const initDone = new Promise<void>((resolve) => {
      window.OneSignalDeferred!.push(async function (OneSignal) {
        await OneSignal.init({ appId: APP_ID });
        resolve();
      });
    });
    await import('./pageSdkInit');
    await initDone;

    const listener = vi.fn();
    window.OneSignal.User.addEventListener('userJwtInvalidated', listener);

    const store = window.OneSignal._coreDirector._jwtTokenStore;
    store._putJwt('jd-1', 'token');
    store._invalidateJwt('jd-1');

    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith({ externalId: 'jd-1' }));
  });
});
