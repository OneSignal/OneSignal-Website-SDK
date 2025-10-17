import { BASE_IDENTITY, BASE_SUB, EXTERNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  createUserFn,
  setCreateUserResponse,
  setUpdateSubscriptionResponse,
  updateSubscriptionFn,
} from '__test__/support/helpers/requests';
import {
  getRawPushSubscription,
  updateIdentityModel,
} from '__test__/support/helpers/setup';
import MockNotification from '__test__/support/mocks/MockNotification';
import {
  mockPushManager,
  mockPushSubscription,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import { setPushToken } from '../database/subscription';
import { IDManager } from './IDManager';
import {
  SubscriptionManagerPage,
  updatePushSubscriptionModelWithRawSubscription,
} from './subscription/page';

describe('SubscriptionManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('updatePushSubscriptionModelWithRawSubscription', () => {
    test('should create the push subscription model if it does not exist', async () => {
      setCreateUserResponse();
      const rawSubscription = getRawPushSubscription();

      let subModels =
        await OneSignal._coreDirector._subscriptionModelStore._list();
      expect(subModels.length).toBe(0);

      // mimicing the event helper checkAndTriggerSubscriptionChanged
      await setPushToken(rawSubscription.w3cEndpoint?.toString());

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

      subModels = await OneSignal._coreDirector._subscriptionModelStore._list();
      expect(subModels.length).toBe(1);

      const id = subModels[0].id;
      expect(IDManager._isLocalId(id)).toBe(true);
      expect(subModels[0].toJSON()).toEqual({
        id,
        ...BASE_SUB,
        token: rawSubscription.w3cEndpoint?.toString(),
        type: 'ChromePush',
        web_auth: rawSubscription.w3cAuth,
        web_p256: rawSubscription.w3cP256dh,
      });

      await vi.waitUntil(() => createUserFn.mock.calls.length > 0);
      expect(createUserFn).toHaveBeenCalledWith({
        identity: {},
        ...BASE_IDENTITY,
        subscriptions: [
          {
            ...BASE_SUB,
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
        OneSignal._coreDirector,
        '_generatePushSubscriptionModel',
      );
      const rawSubscription = getRawPushSubscription();
      mockPushManager.getSubscription.mockResolvedValue({
        ...mockPushSubscription,
        // @ts-expect-error - using partial types
        endpoint: rawSubscription.w3cEndpoint?.toString(),
      });
      setCreateUserResponse({
        externalId: 'some-external-id',
      });

      // create push sub with no id
      const onesignalId = IDManager._createLocalId();
      updateIdentityModel('onesignal_id', onesignalId);
      updateIdentityModel('external_id', 'some-external-id');

      await setupSubModelStore({
        id: IDManager._createLocalId(),
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId,
      });

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

      // should not call generatePushSubscriptionModelSpy
      expect(generatePushSubscriptionModelSpy).not.toHaveBeenCalled();

      expect(createUserFn).toHaveBeenCalledWith({
        identity: {
          external_id: 'some-external-id',
        },
        ...BASE_IDENTITY,
        subscriptions: [
          {
            ...BASE_SUB,
            token: rawSubscription.w3cEndpoint?.toString(),
            type: 'ChromePush',
          },
        ],
      });
    });

    test('should update the push subscription model if it already exists', async () => {
      setUpdateSubscriptionResponse({ subscriptionId: '123' });
      const rawSubscription = getRawPushSubscription();

      await setPushToken(rawSubscription.w3cEndpoint?.toString());

      await setupSubModelStore({
        id: '123',
        token: rawSubscription.w3cEndpoint?.toString(),
        onesignalId: EXTERNAL_ID,
        web_auth: 'old-web-auth',
        web_p256: 'old-web-p256',
      });

      await updatePushSubscriptionModelWithRawSubscription(rawSubscription);

      const updatedPushModel =
        (await OneSignal._coreDirector._getPushSubscriptionModel())!;
      expect(updatedPushModel.token).toBe(
        rawSubscription.w3cEndpoint?.toString(),
      );
      expect(updatedPushModel.web_auth).toBe(rawSubscription.w3cAuth);
      expect(updatedPushModel.web_p256).toBe(rawSubscription.w3cP256dh);

      await vi.waitUntil(() => updateSubscriptionFn.mock.calls.length > 0);
    });
  });
});

describe('SubscriptionManagerPage', () => {
  test('default', async () => {
    MockNotification.permission = 'default';
    expect(await SubscriptionManagerPage._requestNotificationPermission()).toBe(
      'default',
    );
  });

  test('denied', async () => {
    MockNotification.permission = 'denied';
    expect(await SubscriptionManagerPage._requestNotificationPermission()).toBe(
      'denied',
    );
  });

  test('granted', async () => {
    MockNotification.permission = 'granted';
    expect(await SubscriptionManagerPage._requestNotificationPermission()).toBe(
      'granted',
    );
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
