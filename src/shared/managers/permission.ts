import { useSafariLegacyPush } from '../environment/detect';
import { EmptyArgumentError } from '../errors/common';

/**
 * A permission manager to consolidate the different quirks of obtaining and evaluating permissions
 * across Safari, Chrome, and Firefox.
 */

/**
 * Returns a promise that resolves to the browser's current notification permission as
 *    'default', 'granted', or 'denied'.
 */
export async function getPermissionStatus(): Promise<NotificationPermission> {
  if (!OneSignal._context) {
    throw new Error(`OneSignal.context is undefined. Call init first`);
  }

  return await getNotificationPermission(OneSignal._config!.safariWebId);
}

/**
 * Notification permission reported by the browser.
 *
 * @param safariWebId The Safari web ID necessary to access the permission
 * state on Legacy Safari on macOS.
 */
export async function getNotificationPermission(
  safariWebId?: string,
): Promise<NotificationPermission> {
  if (useSafariLegacyPush()) {
    return getLegacySafariNotificationPermission(safariWebId);
  }
  return getW3cNotificationPermission();
}

/**
 * Returns the Safari browser's notification permission as reported by the browser.
 *
 * @param safariWebId The Safari web ID necessary for Legacy Safari on macOS.
 */
function getLegacySafariNotificationPermission(
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
function getW3cNotificationPermission(): NotificationPermission {
  return Notification.permission as NotificationPermission;
}
