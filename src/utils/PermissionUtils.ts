import Database from "../services/Database";
import Event from '../Event';
import OneSignal from '../OneSignal';

export class PermissionUtils {
  public static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
    const newPermission = await OneSignal.privateGetNotificationPermission();
    const previousPermission = await Database.get('Options', 'notificationPermission');

    const shouldBeUpdated = newPermission !== previousPermission || updateIfIdentical;
    if (!shouldBeUpdated) {
      return;
    }

    await Database.put('Options', { key: 'notificationPermission', value: newPermission });
    Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, { to: newPermission });
  }
}
