import { APP_ID } from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockServerConfig } from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import Log from 'src/shared/libraries/Log';

vi.useFakeTimers();
// need to mock browsercastle since we resetting modules after each test
vi.mock('src/shared/utils/bowserCastle', () => ({
  bowserCastle: () => ({
    mobile: false,
    tablet: false,
    name: 'Chrome',
    version: '100',
  }),
}));

// need to wait for full OperationRepo rework
describe('pageSdkInit', () => {
  beforeEach(async () => {
    const cssURL =
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css';

    server.use(
      mockServerConfig(),
      http.get(cssURL, () => HttpResponse.text('')),
    );
    await TestEnvironment.initialize();
  });

  afterEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    OneSignal._initCalled = false;
  });

  test('can handle init followed by logout', async () => {
    window.OneSignalDeferred = [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: APP_ID,
      });
    });
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.logout();
    });

    await import('./pageSdkInit');
    const logoutSpy = vi.spyOn(window.OneSignal, 'logout');

    await vi.waitUntil(async () => {
      return logoutSpy.mock.calls.length > 0;
    });
    expect(window.OneSignal.coreDirector).toBeDefined();
  });

  test('can process deferred items long after page init', async () => {
    vi.spyOn(Log, 'error').mockImplementation(() => '');
    await import('./pageSdkInit');
    const initSpy = vi.spyOn(window.OneSignal, 'init');

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: APP_ID,
      });
    });

    await vi.runOnlyPendingTimersAsync();
    expect(initSpy).toHaveBeenCalled();
  });
});
