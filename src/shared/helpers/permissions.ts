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
    await OneSignal._context._permissionManager._getPermissionStatus();
  const storedPermission = await getOptionsValue<NotificationPermission>('notificationPermission');
  // IndexedDB is shared by every same-origin context (tabs, installed PWA). Another
  // context can update the stored value first, so this context must also compare
  // against its own in-memory permission or its caches never refresh.
  const cachedPermission = OneSignal.Notifications.permissionNative;

  const triggerEvent =
    force || newPermission !== storedPermission || newPermission !== cachedPermission;
  if (!triggerEvent) {
    return;
  }

  await db.put('Options', {
    key: 'notificationPermission',
    value: newPermission,
  });

  OneSignalEvent._trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
    newPermission,
  );
  OneSignalEvent._trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN,
    newPermission === 'granted',
  );
};
