import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import UserData from 'src/core/models/UserData';
import InitHelper from 'src/shared/helpers/InitHelper';
import Log from 'src/shared/libraries/Log';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

vi.useFakeTimers();
vi.mock('src/shared/utils/bowserCastle');

// skip over creating dom elements
vi.spyOn(InitHelper, 'sessionInit').mockImplementation(() => {
  return Promise.resolve();
});

describe('pageSdkInit', () => {
  beforeEach(async () => {
    const cssURL =
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css';

    server.use(
      http.get('**/sync/*/web', ({ request }) => {
        const url = new URL(request.url);
        const callbackParam = url.searchParams.get('callback');
        return new HttpResponse(
          `${callbackParam}(${JSON.stringify(serverConfig)})`,
          {
            headers: {
              'Content-Type': 'application/javascript',
            },
          },
        );
      }),
      http.get(cssURL, () => HttpResponse.text('')),
    );

    await TestEnvironment.initialize({
      // useMockIdentityModel: true,
    });
  });

  afterEach(() => {
    vi.resetModules();
    localStorage.clear();
    OneSignal._initCalled = false;
  });

  test('can handle init followed by logout', async () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: APP_ID,
      });
    });
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.logout();
    });

    await import('./pageSdkInit');
    await vi.runOnlyPendingTimersAsync();
    expect(window.OneSignal.coreDirector).toBeDefined();
  });

  test('can process deferred items long after page init', async () => {
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

  test.only('can login and addEmail', async () => {
    const errorSpy = vi.spyOn(Log, 'error').mockImplementation(() => {});
    server.use(
      http.post('**/apps/*/users', () =>
        HttpResponse.json(
          {
            properties: {},
            identity: {
              onesignal_id: DUMMY_ONESIGNAL_ID,
            },
            subscriptions: undefined,
          } satisfies UserData,
          { status: 200 },
        ),
      ),
    );

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: APP_ID,
      });
    });
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.login('some-id');
      OneSignal.User.addEmail('joe@example.com');
    });

    await import('./pageSdkInit');
    await vi.advanceTimersByTimeAsync(30000);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
