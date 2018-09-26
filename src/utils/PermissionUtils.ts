import Database from "../services/Database";
import Event from '../Event';

export class PermissionUtils {
  public static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
    let newPermission, isUpdating;
    const currentPermission = await OneSignal.privateGetNotificationPermission();
    const previousPermission = await Database.get('Options', 'notificationPermission');

    newPermission = currentPermission;
    isUpdating = currentPermission !== previousPermission || updateIfIdentical;

    if (isUpdating) {
      await Database.put('Options', {
        key: 'notificationPermission',
        value: currentPermission
      });
      Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
        to: newPermission
      });
    }
  }
}
