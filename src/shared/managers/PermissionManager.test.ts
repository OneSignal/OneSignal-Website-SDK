import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
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
    TestEnvironment.initialize({ initOneSignalId: true, initUserAndPushSubscription: false });
    vi.restoreAllMocks();
  });

  test('_getPermissionStatus resolves from context manager', async () => {
    const pm = new PermissionManager();
    const spy = vi
      .spyOn(OneSignal._context._permissionManager, '_getNotificationPermission')
      .mockResolvedValue('granted');
    await expect(pm._getPermissionStatus()).resolves.toBe('granted');
    expect(spy).toHaveBeenCalled();
  });

  test('_getNotificationPermission uses legacy Safari path and requires webId', async () => {
    const detect = await import('../environment/detect');
    (detect.useSafariLegacyPush as any).mockReturnValue(true);
    const pm = new PermissionManager();

    // Missing ID throws
    await expect(pm._getNotificationPermission(undefined)).rejects.toThrow(
      '"safariWebId" is empty',
    );
    // emulate Safari API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).safari = {
      pushNotification: {
        permission: () => ({ permission: 'denied' }),
      },
    };
    // When provided ID, it should read from safari path
    const result = await pm._getNotificationPermission('webid');
    expect(result).toBe('denied');
  });

  test('_getNotificationPermission uses W3C Notification.permission when not legacy', async () => {
    const detect = await import('../environment/detect');
    (detect.useSafariLegacyPush as any).mockReturnValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Notification = { permission: 'default' };

    const pm = new PermissionManager();
    await expect(pm['_getNotificationPermission']()).resolves?.toBe('default');
  });
});


