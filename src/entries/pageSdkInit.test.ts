import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockServerConfig } from '__test__/support/helpers/configHelper';
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

  test('multiple addEmail/addSms calls should not create duplicate subscriptions', async () => {
    server.use(
      http.post('**/apps/*/users', () =>
        HttpResponse.json({
          identity: {
            onesignal_id: DUMMY_ONESIGNAL_ID,
          },
        }),
      ),
      http.post('**/apps/*/users/by/onesignal_id/*/subscriptions', () =>
        HttpResponse.json({
          identity: {
            onesignal_id: DUMMY_ONESIGNAL_ID,
          },
        }),
      ),
    );

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({ appId: APP_ID });
      await OneSignal.User.addEmail('jd@mail.com');
      await OneSignal.User.addEmail('jd@mail.com');
      await OneSignal.User.addSms('1234567890');
      await OneSignal.User.addSms('1234567890');
    });
    await import('./pageSdkInit');

    await vi.advanceTimersByTimeAsync(30000);
    const emailSubscriptions =
      OneSignal.coreDirector.getEmailSubscriptionModels();
    expect(Object.keys(emailSubscriptions).length).toBe(1);

    const smsSubscriptions = OneSignal.coreDirector.getSmsSubscriptionModels();
    expect(Object.keys(smsSubscriptions).length).toBe(1);
  });
});
