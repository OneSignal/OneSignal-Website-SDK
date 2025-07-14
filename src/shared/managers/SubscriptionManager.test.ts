import { APP_ID, DUMMY_EXTERNAL_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  createUserFn,
  setCreateUserResponse,
} from '__test__/support/helpers/requests';
import {
  getSubscriptionFn,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import ContextSW from '../models/ContextSW';
import { RawPushSubscription } from '../models/RawPushSubscription';
import Database from '../services/Database';
import { IDManager } from './IDManager';
import {
  SubscriptionManager,
  SubscriptionManagerConfig,
} from './SubscriptionManager';

const subConfig: SubscriptionManagerConfig = {
  appId: APP_ID,
  vapidPublicKey: '',
  onesignalVapidPublicKey: '',
};

const getRawSubscription = (): RawPushSubscription => {
  const rawSubscription = new RawPushSubscription();
  rawSubscription.w3cAuth = 'auth';
  rawSubscription.w3cP256dh = 'p256dh';
  rawSubscription.w3cEndpoint = new URL('https://example.com/endpoint');
  rawSubscription.safariDeviceToken = 'safariDeviceToken';
  return rawSubscription;
};

describe('SubscriptionManager', () => {
  beforeEach(async () => {
    vi.resetModules();
    await TestEnvironment.initialize();
  });

  describe('updatePushSubscriptionModelWithRawSubscription', () => {
    test('should create the push subscription model if it does not exist', async () => {
      setCreateUserResponse();
      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);
      const rawSubscription = getRawSubscription();

      let subModels =
        await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(0);

      // mimicing the event helper checkAndTriggerSubscriptionChanged
      await OneSignal.database.setTokenAndId({
        token: rawSubscription.w3cEndpoint?.toString(),
      });

      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      subModels = await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(1);

      const id = subModels[0].id;
      expect(IDManager.isLocalId(id)).toBe(true);
      expect(subModels[0].toJSON()).toEqual({
        id,
        device_model: '',
        device_os: 56,
        enabled: true,
        notification_types: 1,
        sdk: '1',
        token: rawSubscription.w3cEndpoint?.toString(),
        type: 'ChromePush',
        web_auth: rawSubscription.w3cAuth,
        web_p256: rawSubscription.w3cP256dh,
      });

      await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
      expect(createUserFn).toHaveBeenCalledWith({
        identity: {},
        properties: {
          language: 'en',
          timezone_id: 'America/Los_Angeles',
        },
        refresh_device_metadata: true,
        subscriptions: [
          {
            device_model: '',
            device_os: 56,
            enabled: true,
            notification_types: 1,
            sdk: '1',
            token: rawSubscription.w3cEndpoint?.toString(),
            type: 'ChromePush',
            web_auth: rawSubscription.w3cAuth,
            web_p256: rawSubscription.w3cP256dh,
          },
        ],
      });
    });

    test('should create user if push subscription model does not have an id', async () => {
      const generatePushSubscriptionModelSpy = vi.spyOn(
        OneSignal.coreDirector,
        'generatePushSubscriptionModel',
      );
      const rawSubscription = getRawSubscription();
      getSubscriptionFn.mockResolvedValue({
        endpoint: rawSubscription.w3cEndpoint?.toString(),
      });
      setCreateUserResponse({
        externalId: 'some-external-id',
      });

      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);

      // create push sub with no id
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      identityModel.onesignalId = IDManager.createLocalId();
      identityModel.externalId = 'some-external-id';

      await setupSubModelStore({
        id: '',
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: identityModel.onesignalId,
      });

      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      // should not call generatePushSubscriptionModelSpy
      expect(generatePushSubscriptionModelSpy).not.toHaveBeenCalled();

      expect(createUserFn).toHaveBeenCalledWith({
        identity: {
          external_id: 'some-external-id',
        },
        properties: {
          language: 'en',
          timezone_id: 'America/Los_Angeles',
        },
        refresh_device_metadata: true,
        subscriptions: [
          {
            device_model: '',
            device_os: 56,
            enabled: true,
            notification_types: 1,
            sdk: '1',
            token: rawSubscription.w3cEndpoint?.toString(),
            type: 'ChromePush',
          },
        ],
      });
    });

    test('should update the push subscription model if it already exists', async () => {
      setCreateUserResponse();
      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);
      const rawSubscription = getRawSubscription();

      await Database.setTokenAndId({
        token: rawSubscription.w3cEndpoint?.toString(),
      });

      const pushModel = await setupSubModelStore({
        id: '123',
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: DUMMY_EXTERNAL_ID,
      });
      pushModel.web_auth = 'old-web-auth';
      pushModel.web_p256 = 'old-web-p256';

      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      const updatedPushModel =
        (await OneSignal.coreDirector.getPushSubscriptionModel())!;
      expect(updatedPushModel.token).toBe(
        rawSubscription.w3cEndpoint?.toString(),
      );
      expect(updatedPushModel.web_auth).toBe(rawSubscription.w3cAuth);
      expect(updatedPushModel.web_p256).toBe(rawSubscription.w3cP256dh);
    });
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
