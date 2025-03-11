import { APP_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { OneSignalDeferredLoadedCallback } from 'src/page/models/OneSignalDeferredLoadedCallback';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';

vi.useFakeTimers();

declare global {
  interface Window {
    OneSignalDeferred: OneSignalDeferredLoadedCallback[];
  }
}

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

describe('pageSdkInit', () => {
  beforeEach(async () => {
    window.OneSignalDeferred = [];

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
    );
    await TestEnvironment.initialize();
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
    await vi.runOnlyPendingTimersAsync();
    expect(OneSignal.coreDirector).toBeDefined();
  });
});

Object.defineProperty(window, 'location', {
  value: new URL('https://localhost:3000'),
  writable: true,
});
