import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import MockNotification from '__test__/support/mocks/MockNotification';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import OneSignal from '../../onesignal/OneSignal';
import { db } from '../database/client';
import { delay } from './general';
import { triggerNotificationPermissionChanged } from './permissions';

function expectPermissionChangeEvent(
  expectedPermission: boolean,
): Promise<void> {
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
    throw new Error(
      'Should never be call since removeEventListener should prevent this.',
    );
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

  // simulating delay permission change event to fire after permission boolean change event
  const originalEmit = OneSignal.emitter.emit.bind(OneSignal.emitter);
  vi.spyOn(OneSignal.emitter, 'emit').mockImplementation(async (...args) => {
    if (args[0] === 'permissionChangeAsString') await delay(100);
    return originalEmit(...args);
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

  callPermissionChange('denied');
  await promise;
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

  callPermissionChange('denied');
  await promise;
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
