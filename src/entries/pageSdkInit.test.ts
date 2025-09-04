import { APP_ID } from '__test__/constants';
import { mockJsonp } from '__test__/setupTests';
import { stubNotification } from '__test__/support/environment/TestEnvironmentHelpers';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import Log from 'src/shared/libraries/Log';

// need to wait for full OperationRepo rework
describe('pageSdkInit', () => {
  beforeEach(() => {
    const cssURL =
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css';

    server.use(http.get(cssURL, () => HttpResponse.text('')));
    mockJsonp();
    stubNotification();
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
    expect(window.OneSignal._coreDirector).toBeDefined();
  });

  test('can process deferred items long after page init', async () => {
    vi.spyOn(Log, '_error').mockImplementation(() => '');
    await import('./pageSdkInit');
    const initSpy = vi.spyOn(window.OneSignal, 'init');

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    await window.OneSignalDeferred.push(async function (OneSignal) {
      return OneSignal.init({
        appId: APP_ID,
      });
    });

    await vi.waitUntil(() => initSpy.mock.calls.length > 0);
    expect(initSpy).toHaveBeenCalledWith({
      appId: APP_ID,
    });
  });
});
