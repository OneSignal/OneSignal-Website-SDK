import { PermissionUtils } from '../../../src/shared/utils/PermissionUtils';
import RealPermissionManager from '../../../src/shared/managers/PermissionManager';
import { NotificationPermission } from 'src/shared/models/NotificationPermission';

export class PermissionManager {
  public static async mockNotificationPermissionChange(
    nativePermission: NotificationPermission,
  ): Promise<void> {
    vi.spyOn(
      RealPermissionManager.prototype,
      'getPermissionStatus',
    ).mockResolvedValue(nativePermission);
    // mimick native permission change
    await PermissionUtils.triggerNotificationPermissionChanged();
  }
}
