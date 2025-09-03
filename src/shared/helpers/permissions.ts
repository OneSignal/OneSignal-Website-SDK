import { db, getOptionsValue } from '../database/client';
import OneSignalEvent from '../services/OneSignalEvent';

// This flag prevents firing the NOTIFICATION_PERMISSION_CHANGED_AS_STRING event twice
// We use multiple APIs:
//    1. Notification.requestPermission callback
//    2. navigator.permissions.query({ name: 'notifications' }`).onchange
// Some browsers support both, while others only support Notification.requestPermission
let executing = false;

export const triggerNotificationPermissionChanged = async (force = false) => {
  if (executing) {
    return;
  }

  executing = true;
  try {
    await privateTriggerNotificationPermissionChanged(force);
  } finally {
    executing = false;
  }
};

const privateTriggerNotificationPermissionChanged = async (force: boolean) => {
  const newPermission: NotificationPermission =
    await OneSignal.context._permissionManager.getPermissionStatus();
  const previousPermission = await getOptionsValue<NotificationPermission>(
    'notificationPermission',
  );

  const triggerEvent = newPermission !== previousPermission || force;
  if (!triggerEvent) {
    return;
  }

  await db.put('Options', {
    key: 'notificationPermission',
    value: newPermission,
  });

  await OneSignalEvent.trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
    newPermission,
  );
  triggerBooleanPermissionChangeEvent(previousPermission, newPermission, force);
};

const triggerBooleanPermissionChangeEvent = (
  previousPermission: NotificationPermission | null,
  newPermission: NotificationPermission,
  force: boolean,
): void => {
  const newPermissionBoolean = newPermission === 'granted';

  const triggerEvent = newPermission !== previousPermission || force;
  if (!triggerEvent) return;

  OneSignalEvent.trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN,
    newPermissionBoolean,
  );
};
