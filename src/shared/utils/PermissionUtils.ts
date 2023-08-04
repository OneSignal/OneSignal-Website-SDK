import Database from "../services/Database";
import OneSignalEvent from '../services/OneSignalEvent';

export class PermissionUtils {

  // This flag prevents firing the NOTIFICATION_PERMISSION_CHANGED_AS_STRING event twice
  // We use multiple APIs:
  //    1. Notification.requestPermission callback
  //    2. navigator.permissions.query({ name: 'notifications' }`).onchange
  // Some browsers support both, while others only support Notification.requestPermission
  private static executing = false;

  public static async triggerNotificationPermissionChanged(force = false) {
    if (PermissionUtils.executing) {
      return;
    }

    PermissionUtils.executing = true;
    try {
      await PermissionUtils.privateTriggerNotificationPermissionChanged(force);
    }
    finally {
      PermissionUtils.executing = false;
    }
  }

  private static async privateTriggerNotificationPermissionChanged(force: boolean) {
    const newPermission: NotificationPermission = await OneSignal.context.permissionManager.getPermissionStatus();
    const previousPermission: NotificationPermission = await Database.get('Options', 'notificationPermission');

    const triggerEvent = newPermission !== previousPermission || force;
    if (!triggerEvent) {
      return;
    }

    await Database.put('Options', { key: 'notificationPermission', value: newPermission });

    OneSignalEvent.trigger(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING, newPermission);
    this.triggerBooleanPermissionChangeEvent(previousPermission, newPermission, force);
  }

  private static triggerBooleanPermissionChangeEvent(
    previousPermission: NotificationPermission,
    newPermission: NotificationPermission,
    force: boolean,
  ): void {
    const newPermissionBoolean = newPermission === 'granted';
    const previousPermissionBoolean = previousPermission === 'granted';
    const triggerEvent = newPermissionBoolean !== previousPermissionBoolean || force;
    if (!triggerEvent) {
      return;
    }
    OneSignalEvent.trigger(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN, newPermissionBoolean);
  }
}
