import { APP_ID, DUMMY_EXTERNAL_ID } from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  mockUserAgent,
  setupSubModelStore,
} from '__test__/support/environment/TestEnvironmentHelpers';
import {
  getSubscriptionFn,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import BrowserUserAgent from '__test__/support/models/BrowserUserAgent';
import { SubscriptionType } from 'src/core/types/subscription';
import UserDirector from 'src/onesignal/UserDirector';
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
  // @ts-expect-error - legacy property
  rawSubscription.safariDeviceToken = 'safariDeviceToken';
  return rawSubscription;
};

const createUserOnServerSpy = vi
  .spyOn(UserDirector, 'createUserOnServer')
  .mockResolvedValue();

describe('SubscriptionManager', () => {
  beforeEach(async () => {
    vi.resetModules();
    await TestEnvironment.initialize();
    await Database.clear();
  });

  describe('updatePushSubscriptionModelWithRawSubscription', () => {
    test('should create the push subscription model if it does not exist', async () => {
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

      // @ts-expect-error - private method
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

      expect(createUserOnServerSpy).toHaveBeenCalled();
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

      // @ts-expect-error - private method
      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      // should not call generatePushSubscriptionModelSpy
      expect(generatePushSubscriptionModelSpy).not.toHaveBeenCalled();
      expect(createUserOnServerSpy).toHaveBeenCalled();
    });

    test('should update the push subscription model if it already exists', async () => {
      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);
      const rawSubscription = getRawSubscription();

      await OneSignal.database.setTokenAndId({
        token: rawSubscription.w3cEndpoint?.toString(),
      });

      const pushModel = await setupSubModelStore({
        id: '123',
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: DUMMY_EXTERNAL_ID,
      });
      pushModel.web_auth = 'old-web-auth';
      pushModel.web_p256 = 'old-web-p256';

      // @ts-expect-error - private method
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

    test('should port legacy safari push to new format', async () => {
      const rawSubscription = getRawSubscription();
      getSubscriptionFn.mockResolvedValue({
        endpoint: rawSubscription.w3cEndpoint?.toString(),
      });

      const context = new ContextSW(TestContext.getFakeMergedConfig());
      const subscriptionManager = new SubscriptionManager(context, subConfig);

      // setting up legacy push model
      await OneSignal.database.setTokenAndId({
        token: 'old-token',
      });
      const pushModel = await setupSubModelStore({
        id: '123',
        token: 'old-token',
        onesignalId: DUMMY_EXTERNAL_ID,
      });
      pushModel.type = SubscriptionType.SafariLegacyPush;

      // mock agent to safari with vapid push support
      mockUserAgent({
        userAgent: BrowserUserAgent.SafariSupportedMac121,
      });

      // @ts-expect-error - private method
      await subscriptionManager._updatePushSubscriptionModelWithRawSubscription(
        rawSubscription,
      );

      // should update push model with new token, type, web_auth, and web_p256
      const updatedPushModel =
        (await OneSignal.coreDirector.getPushSubscriptionModel())!;
      expect(updatedPushModel.type).toBe(SubscriptionType.SafariPush);
      expect(updatedPushModel.token).toBe(
        rawSubscription.w3cEndpoint!.toString(),
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

Object.defineProperty(global, 'PushSubscriptionOptions', {
  value: {
    prototype: {
      applicationServerKey: 'test',
    },
  },
  writable: true,
});
