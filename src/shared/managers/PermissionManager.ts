import { useSafariLegacyPush } from '../environment/detect';
import { EmptyArgumentError } from '../errors/common';

/**
 * A permission manager to consolidate the different quirks of obtaining and evaluating permissions
 * across Safari, Chrome, and Firefox.
 */
export default class PermissionManager {
  /**
   * Returns a promise that resolves to the browser's current notification permission as
   *    'default', 'granted', or 'denied'.
   */
  _getPermissionStatus(): Promise<NotificationPermission> {
    if (!OneSignal._context) {
      return Promise.reject(new Error(`OneSignal.context is undefined. Call init first`));
    }

    return Promise.resolve(
      OneSignal._context._permissionManager._getNotificationPermission(
        OneSignal.config!.safariWebId,
      ),
    );
  }

  /**
   * Notification permission reported by the browser.
   *
   * @param safariWebId The Safari web ID necessary to access the permission
   * state on Legacy Safari on macOS.
   */
  public _getNotificationPermission(safariWebId?: string): NotificationPermission {
    if (useSafariLegacyPush()) {
      return PermissionManager._getLegacySafariNotificationPermission(safariWebId);
    }
    return this._getW3cNotificationPermission();
  }

  /**
   * Returns the Safari browser's notification permission as reported by the browser.
   *
   * @param safariWebId The Safari web ID necessary for Legacy Safari on macOS.
   */
  private static _getLegacySafariNotificationPermission(
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
  private _getW3cNotificationPermission(): NotificationPermission {
    return Notification.permission as NotificationPermission;
  }
}
