import {
  DUMMY_PUSH_TOKEN,
  DUMMY_PUSH_TOKEN_2,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import Emitter from 'src/shared/libraries/Emitter';
import { checkAndTriggerSubscriptionChanged } from 'src/shared/listeners';
import { AppState } from 'src/shared/models/AppState';
import Database from 'src/shared/services/Database';
import { PermissionUtils } from 'src/shared/utils/PermissionUtils';
import MainHelper from '../../../src/shared/helpers/MainHelper';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';

vi.mock('src/shared/libraries/Log');
const triggerNotificationSpy = vi.spyOn(
  PermissionUtils,
  'triggerNotificationPermissionChanged',
);

vi.useFakeTimers();

describe('Notification Types are set correctly on subscription change', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    OneSignal.emitter = new Emitter();
  });

  afterEach(async () => {
    await Database.remove('subscriptions');
    await Database.remove('Options');
  });

  const setDbPermission = async (permission: NotificationPermission) => {
    await Database.put('Options', {
      key: 'notificationPermission',
      value: permission,
    });
  };

  describe('checkAndTriggerNotificationPermissionChanged', () => {
    test('should not trigger change if permission status is the same', async () => {
      vi.stubGlobal('Notification', {
        ...global.Notification,
        permission: NotificationPermission.Granted,
      });
      await setDbPermission(NotificationPermission.Granted);

      await MainHelper.checkAndTriggerNotificationPermissionChanged();
      expect(triggerNotificationSpy).not.toHaveBeenCalled();
    });

    test('should trigger change if permission status is different', async () => {
      vi.stubGlobal('Notification', {
        ...global.Notification,
        permission: NotificationPermission.Granted,
      });
      await setDbPermission(NotificationPermission.Denied);

      const permChangeStringListener = vi.fn();
      const permChangeListener = vi.fn();
      OneSignal.Notifications.addEventListener(
        'permissionChange',
        permChangeListener,
      );

      OneSignal.Notifications.addEventListener(
        // @ts-expect-error - we dont expose it in the types
        'permissionChangeAsString',
        permChangeStringListener,
      );

      await MainHelper.checkAndTriggerNotificationPermissionChanged();

      // should update the db
      const dbPermission = await Database.get(
        'Options',
        'notificationPermission',
      );
      expect(dbPermission).toBe(NotificationPermission.Granted);
      expect(permChangeListener).toHaveBeenCalledWith(true);
      expect(permChangeStringListener).toHaveBeenCalledWith('granted');
    });
  });

  describe('checkAndTriggerSubscriptionChanged', async () => {
    const setAppState = async (appState: Partial<AppState>) => {
      const currentAppState = await Database.get<AppState>(
        'Options',
        'appState',
      );
      await Database.setAppState({
        ...currentAppState,
        ...appState,
      });
    };

    const changeListener = vi.fn();
    const addListener = (cb: (...args: unknown[]) => void) =>
      // @ts-expect-error - we dont expose it in the types
      OneSignal.Notifications.addEventListener('change', cb);

    test('should not do anything if the state has not changed', async () => {
      addListener(changeListener);
      const pushModel = createPushSub({
        id: DUMMY_SUBSCRIPTION_ID,
        token: DUMMY_PUSH_TOKEN,
      });

      await setAppState({
        lastKnownPushEnabled: false,
        lastKnownPushToken: DUMMY_PUSH_TOKEN,
        lastKnownPushId: DUMMY_SUBSCRIPTION_ID,
      });
      OneSignal.coreDirector.addSubscriptionModel(pushModel);

      await checkAndTriggerSubscriptionChanged();
      expect(changeListener).not.toHaveBeenCalled();
    });

    test('should emit change if app state data is different', async () => {
      addListener(changeListener);
      const pushModel = createPushSub({
        id: DUMMY_SUBSCRIPTION_ID_2,
        token: DUMMY_PUSH_TOKEN_2,
      });

      await setAppState({
        lastKnownPushEnabled: true,
        lastKnownPushToken: DUMMY_PUSH_TOKEN_2,
        lastKnownPushId: DUMMY_SUBSCRIPTION_ID_3,
      });
      OneSignal.coreDirector.subscriptionModelStore.add(pushModel);

      await checkAndTriggerSubscriptionChanged();
      expect(changeListener).toHaveBeenCalledWith({
        current: {
          id: DUMMY_SUBSCRIPTION_ID_2,
          optedIn: false,
          token: DUMMY_PUSH_TOKEN,
        },
        previous: {
          id: DUMMY_SUBSCRIPTION_ID_3,
          optedIn: true,
          token: DUMMY_PUSH_TOKEN_2,
        },
      });
    });
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
