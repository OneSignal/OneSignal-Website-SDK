import Database from "../services/Database";
import OneSignalEvent from '../services/OneSignalEvent';

export class PermissionUtils {
  public static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
    const newPermission: NotificationPermission = await OneSignal.Notifications.getPermissionStatus();
    const previousPermission: NotificationPermission = await Database.get('Options', 'notificationPermission');

    const shouldBeUpdated = newPermission !== previousPermission || updateIfIdentical;
    if (!shouldBeUpdated) {
      return;
    }

    await Database.put('Options', { key: 'notificationPermission', value: newPermission });
    OneSignalEvent.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, newPermission);
  }
}
