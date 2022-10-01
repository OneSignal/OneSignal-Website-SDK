import Database from "../services/Database";
import OneSignalEvent from '../services/OneSignalEvent';

export class PermissionUtils {

  // This flag prevents firing the NATIVE_PROMPT_PERMISSIONCHANGED event twice
  // We use multiple APIs:
  //    1. Notification.requestPermission callback
  //    2. navigator.permissions.query({ name: 'notifications' }`).onchange
  // Some browsers support both, while others only support Notification.requestPermission
  private static executing = false;

  public static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
    if (PermissionUtils.executing) {
      return;
    }
    PermissionUtils.executing = true;

    const newPermission = await OneSignal.notifications.getPermissionStatus();
    const previousPermission = await Database.get('Options', 'notificationPermission');

    const shouldBeUpdated = newPermission !== previousPermission || updateIfIdentical;
    if (!shouldBeUpdated) {
      return;
    }

    await Database.put('Options', { key: 'notificationPermission', value: newPermission });
    OneSignalEvent.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, { to: newPermission });
    PermissionUtils.executing = false;
  }
}
