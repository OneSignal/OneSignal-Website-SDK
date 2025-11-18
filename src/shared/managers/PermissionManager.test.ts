import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import MockNotification from '__test__/support/mocks/MockNotification';
import * as detect from '../environment/detect';
import PermissionManager from './PermissionManager';

vi.mock('../environment/detect', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../environment/detect')>();
  return {
    ...mod,
    useSafariLegacyPush: vi.fn(),
  };
});

describe('PermissionManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('_getPermissionStatus', () => {
    test('resolves from context manager', async () => {
      const pm = new PermissionManager();
      const spy = vi
        .spyOn(OneSignal._context._permissionManager, '_getNotificationPermission')
        .mockResolvedValue('granted');
      await expect(pm._getPermissionStatus()).resolves.toBe('granted');
      expect(spy).toHaveBeenCalled();
    });

    test('throws if context is undefined', async () => {
      OneSignal._context = undefined;
      const pm = new PermissionManager();
      await expect(pm._getPermissionStatus()).rejects.toThrow('OneSignal.context is undefined. Call init first');
    });
  });

  test('_getNotificationPermission uses legacy Safari path and requires webId', async () => {
    vi.spyOn(detect, 'useSafariLegacyPush')
    .mockReturnValue(true);

    const pm = new PermissionManager();
    await expect(pm._getNotificationPermission(undefined))
      .rejects.toThrow('"safariWebId" is empty');
  });

  test('_getNotificationPermission uses W3C Notification.permission when not legacy', async () => {
    vi.spyOn(detect, 'useSafariLegacyPush')
    .mockReturnValue(false);
    MockNotification.permission = 'default';

    const pm = new PermissionManager();
    await expect(pm['_getNotificationPermission']()).resolves?.toBe('default');
  });
});


