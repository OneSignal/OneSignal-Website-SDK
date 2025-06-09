// separate test file to avoid side effects from pageSdkInit.test.ts
import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import { waitForOperations } from '__test__/support/helpers/executors';
import {
  mockServerConfig,
  setCreateSubscriptionResponse,
  setCreateUserResponse,
  setGetUserResponse,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { ModelName } from 'src/core/types/models';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import Database, { SubscriptionItem } from 'src/shared/services/Database';

describe('pageSdkInit 2', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    server.use(mockServerConfig());
  });

  test('can login and addEmail', async () => {
    const email = 'joe@example.com';
    const subModel = await setupSubModelStore({
      id: DUMMY_SUBSCRIPTION_ID,
      token: DUMMY_PUSH_TOKEN,
    });
    const emailSubModel = new SubscriptionModel();
    emailSubModel.mergeData({
      id: DUMMY_SUBSCRIPTION_ID_2,
      token: email,
      type: 'Email',
    });

    setGetUserResponse({
      subscriptions: [
        {
          ...subModel.toJSON(),
        },
        emailSubModel,
      ],
    });
    setCreateUserResponse({
      onesignalId: DUMMY_ONESIGNAL_ID,
    });
    setCreateSubscriptionResponse({
      response: emailSubModel,
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

    await window.OneSignalDeferred.push(async function (OneSignal) {
      await OneSignal.login('some-id');
      OneSignal.User.addEmail(email);

      // waiting for indexedb to update, addEmail should add a new subscription item with temporary id
      await waitForOperations(1);
      const subscriptions = (
        await Database.getAll<SubscriptionItem>(ModelName.Subscriptions)
      ).sort((a, b) => a.type.localeCompare(b.type));

      expect(subscriptions).toMatchObject([
        {
          id: DUMMY_SUBSCRIPTION_ID,
          onesignalId: DUMMY_ONESIGNAL_ID,
          type: 'ChromePush',
        },
        {
          id: expect.any(String),
          onesignalId: DUMMY_ONESIGNAL_ID,
          token: email,
          type: 'Email',
        },
      ]);
      expect(IDManager.isLocalId(subscriptions[1].id)).toBe(true);
    });

    // wait user subscriptions to be refresh/replaced
    await waitForOperations(4);
    const subscriptions = await Database.getAll<SubscriptionItem>(
      ModelName.Subscriptions,
    );
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
