import OneSignal from '../../../src/onesignal/OneSignal';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import { PermissionManager } from '../../support/managers/PermissionManager';

function expectPermissionChangeEvent(
  expectedPermission: boolean,
): Promise<void> {
  return new Promise((resolver) => {
    OneSignal.Notifications.addEventListener(
      'permissionChange',
      (permission: boolean) => {
        expect(permission).toBe(expectedPermission);
        resolver();
      },
    );
  });
}

describe('Notifications namespace permission properties', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('When permission changes to granted, ensure permissionChange fires with true', async () => {
    const expectedPromise = expectPermissionChangeEvent(true);
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );
    await expectedPromise;
  });

  test('When permission changes to Denied, ensure permissionChange fires with false', async () => {
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );

    const expectedPromise = expectPermissionChangeEvent(false);
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Denied,
    );
    await expectedPromise;
  });

  test('When permission changes to Default, ensure permissionChange fires with false', async () => {
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );

    const expectedPromise = expectPermissionChangeEvent(false);
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Default,
    );
    await expectedPromise;
  });

  test('When permission changes to granted, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );

    expect(OneSignal.Notifications.permission).toBe(true);
    expect(OneSignal.Notifications.permissionNative).toBe(
      NotificationPermission.Granted,
    );
  });

  test('When permission changes to default, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Default,
    );

    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(
      NotificationPermission.Default,
    );
  });

  test('When permission changes to denied, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Denied,
    );

    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(
      NotificationPermission.Denied,
    );
  });

  test('When permission changes, removeEventListener should stop callback from firing', async () => {
    const callback = (_permission: boolean) => {
      throw new Error(
        'Should never be call since removeEventListener should prevent this.',
      );
    };
    OneSignal.Notifications.addEventListener('permissionChange', callback);
    OneSignal.Notifications.removeEventListener('permissionChange', callback);

    // Change permissions through all possible states to ensure the event has had a chance to fire
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Granted,
    );
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Default,
    );
    await PermissionManager.mockNotificationPermissionChange(
      NotificationPermission.Denied,
    );
  });
});
