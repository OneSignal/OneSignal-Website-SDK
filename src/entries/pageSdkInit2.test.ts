// separate test file to avoid side effects from pageSdkInit.test.ts
import { APP_ID, DUMMY_ONESIGNAL_ID } from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockServerConfig } from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { UserData } from 'src/core/types/api';
import { ModelName } from 'src/core/types/models';
import { NotificationType } from 'src/core/types/subscription';
import { default as InitHelper } from 'src/shared/helpers/InitHelper';
import Log from 'src/shared/libraries/Log';
import Database from 'src/shared/services/Database';

// skip over creating dom elements
vi.spyOn(InitHelper, 'sessionInit').mockImplementation(() => Promise.resolve());

describe('pageSdkInit 2', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  test('can login and addEmail', async () => {
    server.use(
      mockServerConfig(),
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

    expect(subscriptions).toEqual([
      {
        device_model: '',
        device_os: 56,
        enabled: true,
        id: expect.any(String),
        modelId: expect.any(String),
        modelName: 'subscriptions',
        onesignalId: DUMMY_ONESIGNAL_ID,
        notification_types: NotificationType.Subscribed,
        sdk: '1',
        token: email,
        type: 'Email',
      },
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
