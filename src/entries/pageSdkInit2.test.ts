// separate test file to avoid side effects from pageSdkInit.test.ts
import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  mockServerConfig,
  setCreateUserResponse,
  setGetUserResponse,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { ModelName } from 'src/core/types/models';
import Log from 'src/shared/libraries/Log';
import Database, { SubscriptionItem } from 'src/shared/services/Database';

describe('pageSdkInit 2', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    server.use(mockServerConfig());
  });

  test('can login and addEmail', async () => {
    const subModel = await setupSubModelStore({
      id: DUMMY_SUBSCRIPTION_ID,
      token: DUMMY_PUSH_TOKEN,
    });

    setGetUserResponse();
    setCreateUserResponse({
      onesignalId: DUMMY_ONESIGNAL_ID,
    });

    const errorSpy = vi.spyOn(Log, 'error').mockImplementation(() => '');

    // wait for init so it can initialize user namespace otherwise it won't be available for addEmail
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

    // wait for email sub to be added
    let subscriptions: SubscriptionItem[] = [];
    await vi.waitUntil(async () => {
      subscriptions = await Database.getAll(ModelName.Subscriptions);
      return subscriptions.length >= 2;
    });
    subscriptions.sort((a, b) => a.type.localeCompare(b.type));

    // should the push subscription and the email be added to the subscriptions modelstore
    const shared = {
      device_model: '',
      device_os: 56,
      enabled: true,
      modelName: 'subscriptions',
      notification_types: 1,
      sdk: '1',
    };
    expect(subscriptions).toEqual([
      {
        ...shared,
        id: subModel.id,
        modelId: subModel.modelId,
        onesignalId: DUMMY_ONESIGNAL_ID,
        token: subModel.token,
        type: 'ChromePush',
      },
      {
        ...shared,
        id: expect.any(String),
        modelId: expect.any(String),
        onesignalId: expect.any(String),
        token: email,
        type: 'Email',
      },
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
