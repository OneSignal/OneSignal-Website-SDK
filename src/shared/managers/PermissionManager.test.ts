import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import MockNotification from '__test__/support/mocks/MockNotification';
import * as detect from '../environment/detect';
import PermissionManager from './PermissionManager';

const useSafariLegacyPushSpy = vi.spyOn(detect, 'useSafariLegacyPush');

describe('PermissionManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('_getPermissionStatus', () => {
    test('resolves from context manager', async () => {
      const pm = new PermissionManager();
      const spy = vi
        .spyOn(
          OneSignal._context._permissionManager,
          '_getNotificationPermission',
        )
        .mockResolvedValue('granted');
      await expect(pm._getPermissionStatus()).resolves.toBe('granted');
      expect(spy).toHaveBeenCalled();
    });

    test('throws if context is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      OneSignal._context = undefined as any;
      const pm = new PermissionManager();
      await expect(pm._getPermissionStatus()).rejects.toThrow(
        'OneSignal.context is undefined. Call init first',
      );
    });
  });

  test('_getNotificationPermission uses legacy Safari path and requires webId', async () => {
    useSafariLegacyPushSpy.mockImplementation(() => true);
    const pm = new PermissionManager();
    await expect(pm._getNotificationPermission(undefined)).rejects.toThrow(
      '"safariWebId" is empty',
    );
  });

  test('_getNotificationPermission uses W3C Notification.permission when not legacy', async () => {
    useSafariLegacyPushSpy.mockImplementation(() => false);
    MockNotification.permission = 'default';

    const pm = new PermissionManager();
    await expect(pm['_getNotificationPermission']()).resolves?.toBe('default');
  });
});
