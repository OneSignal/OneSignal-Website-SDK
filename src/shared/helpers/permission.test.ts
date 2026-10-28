import { PUSH_TOKEN, SUB_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import MockNotification from '__test__/support/mocks/MockNotification';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';

import OneSignal from '../../onesignal/OneSignal';
import UserNamespace from '../../onesignal/UserNamespace';
import { db } from '../database/client';
import { getAppState, setAppState } from '../database/config';
import * as listeners from '../listeners';
import { Subscription } from '../models/Subscription';
import { triggerNotificationPermissionChanged } from './permissions';

const reconcileSpy = vi.spyOn(listeners, 'checkAndTriggerSubscriptionChanged');

function expectPermissionChangeEvent(expectedPermission: boolean): Promise<void> {
  return new Promise<void>((resolve) => {
    const listener = (permission: boolean) => {
      expect(permission).toBe(expectedPermission);
      resolve();
    };
    OneSignal.Notifications.addEventListener('permissionChange', listener);
  });
}

beforeEach(() => {
  TestEnvironment.initialize();
  reconcileSpy.mockClear();
});

afterEach(async () => {
  await db.delete('Options', 'notificationPermission');
});

const callPermissionChange = async (permission: NotificationPermission) => {
  MockNotification.permission = permission;
  await triggerNotificationPermissionChanged();
};

test.each([
  ['granted', true],
  ['denied', false],
  ['default', false],
] as const)(
  'When permission changes to %s, ensure permissionChange fires with %s',
  async (permission, expected) => {
    const expectedPromise = expectPermissionChangeEvent(expected);
    await callPermissionChange(permission);
    await expectedPromise;

    // should be updated in the Notifications namespace
    expect(OneSignal.Notifications.permission).toBe(expected);
    expect(OneSignal.Notifications.permissionNative).toBe(permission);
  },
);

test('When permission changes, removeEventListener should stop callback from firing', async () => {
  const callback = (_permission: boolean) => {
    throw new Error('Should never be call since removeEventListener should prevent this.');
  };
  OneSignal.Notifications.addEventListener('permissionChange', callback);
  OneSignal.Notifications.removeEventListener('permissionChange', callback);

  // Change permissions through all possible states to ensure the event has had a chance to fire
  await callPermissionChange('granted');
  await callPermissionChange('default');
  await callPermissionChange('denied');
});

test('Should update Notification.permission in time', async () => {
  // setup NotificationsNamespace with permission granted
  TestEnvironment.initialize({
    permission: 'granted',
  });

  await db.put('Options', {
    key: 'notificationPermission',
    value: 'granted',
  });

  // should wait for permission change (string) event first then this permission change (boolean) event
  const { resolve, promise } = Promise.withResolvers<void>();
  OneSignal.Notifications.addEventListener('permissionChange', (isGranted) => {
    expect(isGranted).toBe(false);
    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe('denied');
    resolve();
  });

  void callPermissionChange('denied');
  await promise;
});

test('should refresh a stale tab when another context already stored the new permission', async () => {
  // Tab A starts with permission denied.
  TestEnvironment.initialize({ permission: 'denied' });
  const subscription = new Subscription();
  subscription.optedOut = false;
  OneSignal.User = new UserNamespace(true, subscription, 'denied');
  await db.put('Options', { key: 'notificationPermission', value: 'denied' });
  expect(OneSignal.Notifications.permission).toBe(false);
  expect(OneSignal.User.PushSubscription.optedIn).toBe(false);

  // Another same-origin context (e.g. an installed PWA) sees the regrant first
  // and updates the shared IndexedDB value before tab A checks.
  MockNotification.permission = 'granted';
  await db.put('Options', { key: 'notificationPermission', value: 'granted' });

  const permChangeListener = vi.fn();
  OneSignal.Notifications.addEventListener('permissionChange', permChangeListener);

  await triggerNotificationPermissionChanged();

  expect(permChangeListener).toHaveBeenCalledWith(true);
  expect(OneSignal.Notifications.permission).toBe(true);
  expect(OneSignal.Notifications.permissionNative).toBe('granted');
  expect(OneSignal.User.PushSubscription.optedIn).toBe(true);
});

test('should keep an explicit opt-out when a stale tab refreshes permission', async () => {
  TestEnvironment.initialize({ permission: 'denied' });
  const subscription = new Subscription();
  subscription.optedOut = true;
  OneSignal.User = new UserNamespace(true, subscription, 'denied');

  MockNotification.permission = 'granted';
  await db.put('Options', { key: 'notificationPermission', value: 'granted' });

  await triggerNotificationPermissionChanged();

  expect(OneSignal.Notifications.permission).toBe(true);
  expect(OneSignal.User.PushSubscription.optedIn).toBe(false);
});

test('should not reconcile the subscription or rewrite the stored value when only the tab cache is stale', async () => {
  // Tab A loaded at default and holds no push model in memory.
  TestEnvironment.initialize({ permission: 'default' });

  // Another context granted permission, subscribed, and stored both results.
  MockNotification.permission = 'granted';
  await db.put('Options', { key: 'notificationPermission', value: 'granted' });
  await setAppState({
    ...(await getAppState()),
    lastKnownPushEnabled: true,
    lastKnownPushToken: PUSH_TOKEN,
    lastKnownPushId: SUB_ID,
    lastKnownOptedIn: true,
  });

  const putSpy = vi.spyOn(db, 'put');
  const changeListener = vi.fn();
  // @ts-expect-error - we dont expose it in the types
  OneSignal.Notifications.addEventListener('change', changeListener);

  await triggerNotificationPermissionChanged();

  expect(OneSignal.Notifications.permission).toBe(true);
  expect(OneSignal.Notifications.permissionNative).toBe('granted');
  expect(reconcileSpy).not.toHaveBeenCalled();
  expect(changeListener).not.toHaveBeenCalled();
  expect(putSpy).not.toHaveBeenCalled();
  putSpy.mockRestore();

  const appState = await getAppState();
  expect(appState.lastKnownPushId).toBe(SUB_ID);
  expect(appState.lastKnownPushEnabled).toBe(true);
});

test('should reconcile the subscription when the stored value changes', async () => {
  TestEnvironment.initialize({ permission: 'default' });
  await db.put('Options', { key: 'notificationPermission', value: 'default' });

  await callPermissionChange('granted');

  expect(reconcileSpy).toHaveBeenCalledTimes(1);
});

test('should run a forced call after an in-flight call instead of dropping it', async () => {
  // Dismissed prompt on desktop Chrome: `focus` fires first and no value changed.
  TestEnvironment.initialize({ permission: 'default' });
  await db.put('Options', { key: 'notificationPermission', value: 'default' });

  const permChangeListener = vi.fn();
  OneSignal.Notifications.addEventListener('permissionChange', permChangeListener);

  const focusCall = triggerNotificationPermissionChanged();
  const forcedCall = triggerNotificationPermissionChanged(true);
  await Promise.all([focusCall, forcedCall]);

  expect(permChangeListener).toHaveBeenCalledTimes(1);
  expect(permChangeListener).toHaveBeenCalledWith(false);
  expect(reconcileSpy).toHaveBeenCalledTimes(1);
});

test('should drop a plain call that arrives while another call is in flight', async () => {
  TestEnvironment.initialize({ permission: 'default' });
  await db.put('Options', { key: 'notificationPermission', value: 'default' });

  const permChangeListener = vi.fn();
  OneSignal.Notifications.addEventListener('permissionChange', permChangeListener);

  MockNotification.permission = 'granted';
  await Promise.all([
    triggerNotificationPermissionChanged(),
    triggerNotificationPermissionChanged(),
  ]);

  expect(permChangeListener).toHaveBeenCalledTimes(1);
});

test('should handle denied permission', async () => {
  TestEnvironment.initialize({
    permission: 'default',
  });

  const { resolve, promise } = Promise.withResolvers<void>();
  OneSignal.Notifications.addEventListener('permissionChange', (isGranted) => {
    expect(isGranted).toBe(false);
    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe('denied');
    resolve();
  });

  void callPermissionChange('denied');
  await promise;
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
