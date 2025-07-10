import OneSignalError from '../errors/OneSignalError';
import { NotificationPermission } from '../models/NotificationPermission';

/**
 * A permission manager to consolidate the different quirks of obtaining and evaluating permissions
 * across Safari, Chrome, and Firefox.
 */
export default class PermissionManager {
  static get STORED_PERMISSION_KEY() {
    return 'storedNotificationPermission';
  }

  /**
   * Returns a promise that resolves to the browser's current notification permission as
   *    'default', 'granted', or 'denied'.
   */
  async getPermissionStatus(): Promise<NotificationPermission> {
    if (!OneSignal.context) {
      throw new OneSignalError(
        `OneSignal.context is undefined. Make sure to call OneSignal.init() before calling getPermissionStatus().`,
      );
    }

    return await OneSignal.context.permissionManager.getNotificationPermission();
  }

  /**
  /**
   * Returns the notification permission as reported by the browser.
   *   - Expect for legacy Safari on macOS.
   */
  public getNotificationPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }
}
