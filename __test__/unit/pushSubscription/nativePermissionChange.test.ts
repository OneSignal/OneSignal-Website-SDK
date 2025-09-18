import {
  PUSH_TOKEN,
  PUSH_TOKEN_2,
  SUB_ID,
  SUB_ID_2,
  SUB_ID_3,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { clearStore, db, getOptionsValue } from 'src/shared/database/client';
import { setAppState as setDBAppState } from 'src/shared/database/config';
import type { AppState } from 'src/shared/database/types';
import * as PermissionUtils from 'src/shared/helpers/permissions';
import Emitter from 'src/shared/libraries/Emitter';
import { checkAndTriggerSubscriptionChanged } from 'src/shared/listeners';
import MainHelper from '../../../src/shared/helpers/MainHelper';

vi.mock('src/shared/libraries/Log');
const triggerNotificationSpy = vi.spyOn(
  PermissionUtils,
  'triggerNotificationPermissionChanged',
);

vi.useFakeTimers();

describe('Notification Types are set correctly on subscription change', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    OneSignal._emitter = new Emitter();
  });

  afterEach(async () => {
    await clearStore('subscriptions');
    await clearStore('Options');
  });

  const setDbPermission = async (permission: NotificationPermission) => {
    await db.put('Options', {
      key: 'notificationPermission',
      value: permission,
    });
  };

  describe('checkAndTriggerNotificationPermissionChanged', () => {
    test('should not trigger change if permission status is the same', async () => {
      vi.stubGlobal('Notification', {
        ...global.Notification,
        permission: 'granted',
      });
      await setDbPermission('granted');

      await MainHelper.checkAndTriggerNotificationPermissionChanged();
      expect(triggerNotificationSpy).not.toHaveBeenCalled();
    });

    test('should trigger change if permission status is different', async () => {
      vi.stubGlobal('Notification', {
        ...global.Notification,
        permission: 'granted',
      });
      await setDbPermission('denied');

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
      const dbPermission = await getOptionsValue<NotificationPermission>(
        'notificationPermission',
      );
      expect(dbPermission).toBe('granted');
      expect(permChangeListener).toHaveBeenCalledWith(true);
      expect(permChangeStringListener).toHaveBeenCalledWith('granted');
    });
  });

  describe('checkAndTriggerSubscriptionChanged', async () => {
    const setAppState = async (appState: Partial<AppState>) => {
      const currentAppState = (await getOptionsValue<AppState>('appState'))!;
      await setDBAppState({
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
        id: SUB_ID,
        token: PUSH_TOKEN,
      });

      await setAppState({
        lastKnownPushEnabled: false,
        lastKnownPushToken: PUSH_TOKEN,
        lastKnownPushId: SUB_ID,
      });
      OneSignal._coreDirector.addSubscriptionModel(pushModel);

      await checkAndTriggerSubscriptionChanged();
      expect(changeListener).not.toHaveBeenCalled();
    });

    test('should emit change if app state data is different', async () => {
      addListener(changeListener);
      const pushModel = createPushSub({
        id: SUB_ID_2,
        token: PUSH_TOKEN_2,
      });

      await setAppState({
        lastKnownPushEnabled: true,
        lastKnownPushToken: PUSH_TOKEN_2,
        lastKnownPushId: SUB_ID_3,
      });
      OneSignal._coreDirector.subscriptionModelStore.add(pushModel);

      await checkAndTriggerSubscriptionChanged();
      expect(changeListener).toHaveBeenCalledWith({
        current: {
          id: SUB_ID_2,
          optedIn: false,
          token: PUSH_TOKEN,
        },
        previous: {
          id: SUB_ID_3,
          optedIn: true,
          token: PUSH_TOKEN_2,
        },
      });
    });
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
