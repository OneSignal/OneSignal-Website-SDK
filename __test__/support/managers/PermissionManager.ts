import { PermissionUtils } from '../../../src/shared/utils/PermissionUtils';
import RealPermissionManager from '../../../src/shared/managers/PermissionManager';

export class PermissionManager {
  public static async mockNotificationPermissionChange(
    test: jest.It,
    nativePermission: NotificationPermission,
  ): Promise<void> {
    test.stub(
      RealPermissionManager.prototype,
      'getPermissionStatus',
      nativePermission,
    );
    // mimick native permission change
    await PermissionUtils.triggerNotificationPermissionChanged();
  }
}
