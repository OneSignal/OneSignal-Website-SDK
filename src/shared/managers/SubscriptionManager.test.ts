import { APP_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import ContextSW from '../models/ContextSW';
import { RawPushSubscription } from '../models/RawPushSubscription';
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
  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  describe('updatePushSubscriptionModelWithRawSubscription', () => {
    test('should create the push subscription model if it does not exist', async () => {
      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);
      const rawSubscription = getRawSubscription();

      let subModels =
        await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(0);
      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      subModels = await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(1);
      expect(subModels[0].toJSON()).toEqual({
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
    });
  });
});
