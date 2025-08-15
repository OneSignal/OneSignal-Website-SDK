import { DEVICE_OS, DUMMY_EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  createUserFn,
  setCreateUserResponse,
  setGetUserResponse,
} from '__test__/support/helpers/requests';
import MockNotification from '__test__/support/mocks/MockNotification';
import {
  getSubscriptionFn,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import { ModelChangeTags } from 'src/core/types/models';
import { setPushToken } from '../database/subscription';
import { NotificationPermission } from '../models/NotificationPermission';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { IDManager } from './IDManager';
import {
  SubscriptionManagerPage,
  updatePushSubscriptionModelWithRawSubscription,
} from './subscription/page';

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
      const rawSubscription = getRawSubscription();

      let subModels =
        await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(0);

      // mimicing the event helper checkAndTriggerSubscriptionChanged
      await setPushToken(rawSubscription.w3cEndpoint?.toString());

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

      subModels = await OneSignal.coreDirector.subscriptionModelStore.list();
      expect(subModels.length).toBe(1);

      const id = subModels[0].id;
      expect(IDManager.isLocalId(id)).toBe(true);
      expect(subModels[0].toJSON()).toEqual({
        id,
        device_model: '',
        device_os: DEVICE_OS,
        enabled: true,
        notification_types: 1,
        sdk: __VERSION__,
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
            device_os: DEVICE_OS,
            enabled: true,
            notification_types: 1,
            sdk: __VERSION__,
            token: rawSubscription.w3cEndpoint?.toString(),
            type: 'ChromePush',
            web_auth: rawSubscription.w3cAuth,
            web_p256: rawSubscription.w3cP256dh,
          },
        ],
      });
    });

    test('should create user if push subscription model has a local id', async () => {
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

      // create push sub with no id
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      identityModel.setProperty(
        'onesignal_id',
        IDManager.createLocalId(),
        ModelChangeTags.HYDRATE,
      );
      identityModel.setProperty(
        'external_id',
        'some-external-id',
        ModelChangeTags.HYDRATE,
      );

      await setupSubModelStore({
        id: IDManager.createLocalId(),
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: identityModel.onesignalId,
      });

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

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
            device_os: DEVICE_OS,
            enabled: true,
            notification_types: 1,
            sdk: __VERSION__,
            token: rawSubscription.w3cEndpoint?.toString(),
            type: 'ChromePush',
          },
        ],
      });
    });

    test('should update the push subscription model if it already exists', async () => {
      setCreateUserResponse();
      setGetUserResponse();
      const rawSubscription = getRawSubscription();

      await setPushToken(rawSubscription.w3cEndpoint?.toString());

      const pushModel = await setupSubModelStore({
        id: '123',
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: DUMMY_EXTERNAL_ID,
      });
      pushModel.web_auth = 'old-web-auth';
      pushModel.web_p256 = 'old-web-p256';

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

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

describe('SubscriptionManagerPage', () => {
  test('default', async () => {
    MockNotification.permission = 'default';
    expect(await SubscriptionManagerPage.requestNotificationPermission()).toBe(
      NotificationPermission.Default,
    );
  });

  test('denied', async () => {
    MockNotification.permission = 'denied';
    expect(await SubscriptionManagerPage.requestNotificationPermission()).toBe(
      NotificationPermission.Denied,
    );
  });

  test('granted', async () => {
    MockNotification.permission = 'granted';
    expect(await SubscriptionManagerPage.requestNotificationPermission()).toBe(
      NotificationPermission.Granted,
    );
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
