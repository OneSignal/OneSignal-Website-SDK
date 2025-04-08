// separate test file to avoid side effects from pageSdkInit.test.ts
import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { ModelName } from 'src/core/models/SupportedModels';
import UserData from 'src/core/models/UserData';
import InitHelper from 'src/shared/helpers/InitHelper';
import Log from 'src/shared/libraries/Log';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';
import Database from 'src/shared/services/Database';

vi.useFakeTimers();

// skip over creating dom elements
vi.spyOn(InitHelper, 'sessionInit').mockImplementation(() => Promise.resolve());

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

describe('pageSdkInit 2', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  test('can login and addEmail', async () => {
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

    const errorSpy = vi.spyOn(Log, 'error').mockImplementation(() => '');

    window.OneSignalDeferred = [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.init({
        appId: APP_ID,
      });
    });
    await import('./pageSdkInit');

    const email = 'joe@example.com';
    window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.login('some-id');
      OneSignal.User.addEmail(email);
    });

    let subscriptions;
    await vi.waitUntil(async () => {
      subscriptions = await Database.getAll(ModelName.Subscriptions);
      return subscriptions.length > 0;
    });

    expect(subscriptions).toMatchObject([
      {
        modelName: ModelName.Subscriptions,
        modelId: expect.any(String),
        onesignalId: undefined,
        type: 'Email',
        token: email,
      },
    ]);
    await vi.runOnlyPendingTimersAsync();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
