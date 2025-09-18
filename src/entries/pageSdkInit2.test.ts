// separate test file to avoid side effects from pageSdkInit.test.ts
import {
  APP_ID,
  BASE_SUB,
  ONESIGNAL_ID,
  PUSH_TOKEN,
  SUB_ID,
  SUB_ID_2,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  setCreateSubscriptionResponse,
  setCreateUserResponse,
  setGetUserResponse,
} from '__test__/support/helpers/requests';
import {
  getDbSubscriptions,
  updateIdentityModel,
} from '__test__/support/helpers/setup';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';

describe('pageSdkInit 2', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('can login and addEmail', async () => {
    const onesignalId = IDManager._createLocalId();
    updateIdentityModel('onesignal_id', onesignalId);

    const email = 'joe@example.com';
    const subModel = await setupSubModelStore({
      id: SUB_ID,
      token: PUSH_TOKEN,
    });
    const emailSubModel = new SubscriptionModel();
    emailSubModel._mergeData({
      id: SUB_ID_2,
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
      onesignalId: ONESIGNAL_ID,
    });
    setCreateSubscriptionResponse({
      response: emailSubModel,
    });

    const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');

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
      const subModels = OneSignal._coreDirector.subscriptionModelStore
        .list()
        .map((m) => m.toJSON());
      subModels.sort((a, b) => a.type.localeCompare(b.type));

      expect(subModels).toMatchObject([
        {
          id: SUB_ID,
          onesignalId: ONESIGNAL_ID,
          type: 'ChromePush',
        },
        {
          id: expect.any(String),
          onesignalId: expect.any(String),
          token: email,
          type: 'Email',
        },
      ]);
      expect(IDManager._isLocalId(subModels[1].id)).toBe(true);
    });

    // wait user subscriptions to be refresh/replaced
    const subscriptions = await getDbSubscriptions(2);
    subscriptions.sort((a, b) => a.type.localeCompare(b.type));

    // should the push subscription and the email be added to the subscriptions modelstore
    const shared = {
      ...BASE_SUB,
      modelName: 'subscriptions',
    };
    expect(subscriptions).toEqual([
      {
        ...shared,
        id: subModel.id,
        modelId: subModel._modelId,
        onesignalId: ONESIGNAL_ID,
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
