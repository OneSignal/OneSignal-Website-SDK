import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import MockNotification from '__test__/support/mocks/MockNotification';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { beforeEach, expect, test, vi } from 'vite-plus/test';

import OneSignal from '../../onesignal/OneSignal';
import UserNamespace from '../../onesignal/UserNamespace';
import { db } from '../database/client';
import { Subscription } from '../models/Subscription';
import { triggerNotificationPermissionChanged } from './permissions';

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
