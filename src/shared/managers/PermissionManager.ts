import { useSafariLegacyPush } from '../environment/environment';
import { EmptyArgumentError } from '../errors';

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
      throw new Error(`OneSignal.context is undefined. Call init first`);
    }

    return await OneSignal.context.permissionManager.getNotificationPermission(
      OneSignal.config!.safariWebId,
    );
  }

  /**
   * Notification permission reported by the browser.
   *
   * @param safariWebId The Safari web ID necessary to access the permission
   * state on Legacy Safari on macOS.
   */
  public async getNotificationPermission(
    safariWebId?: string,
  ): Promise<NotificationPermission> {
    if (useSafariLegacyPush()) {
      return PermissionManager.getLegacySafariNotificationPermission(
        safariWebId,
      );
    }
    return this.getW3cNotificationPermission();
  }

  /**
   * Returns the Safari browser's notification permission as reported by the browser.
   *
   * @param safariWebId The Safari web ID necessary for Legacy Safari on macOS.
   */
  private static getLegacySafariNotificationPermission(
    safariWebId?: string,
  ): NotificationPermission {
    if (safariWebId)
      return window.safari?.pushNotification?.permission(safariWebId)
        .permission as NotificationPermission;
    throw EmptyArgumentError('safariWebId');
  }

  /**
   * Returns the notification permission as reported by the browser.
   *   - Expect for legacy Safari on macOS.
   */
  private getW3cNotificationPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }
}
