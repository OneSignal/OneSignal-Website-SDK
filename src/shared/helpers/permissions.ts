import { db, getOptionsValue } from '../database/client';
import { checkAndTriggerSubscriptionChanged } from '../listeners';
import OneSignalEvent from '../services/OneSignalEvent';

// Browsers can report one permission change through two APIs:
//    1. Notification.requestPermission callback
//    2. navigator.permissions.query({ name: 'notifications' }`).onchange
// A plain call that arrives while another runs is dropped so the event fires once.
// A forced call waits instead, because only `force` reports a dismissed prompt and
// a `focus` handler can hold the lock when that call arrives.
let inFlight: Promise<boolean> | null = null;

export const triggerNotificationPermissionChanged = async (force = false): Promise<void> => {
  if (inFlight && !force) return;
  while (inFlight) await inFlight.catch(() => undefined);

  inFlight = privateTriggerNotificationPermissionChanged(force);
  const reconcile = await inFlight.finally(() => {
    inFlight = null;
  });

  if (reconcile) await checkAndTriggerSubscriptionChanged();
};

// Resolves to true when the subscription state should be reconciled.
const privateTriggerNotificationPermissionChanged = async (force: boolean): Promise<boolean> => {
  const newPermission: NotificationPermission =
    await OneSignal._context._permissionManager._getPermissionStatus();
  const storedPermission = await getOptionsValue<NotificationPermission>('notificationPermission');
  // IndexedDB is shared by every same-origin context (tabs, installed PWA). Another
  // context can update the stored value first, so this context must also compare
  // against its own in-memory permission or its caches never refresh.
  const cachedPermission = OneSignal.Notifications.permissionNative;

  const storedChanged = newPermission !== storedPermission;
  if (!force && !storedChanged && newPermission === cachedPermission) {
    return false;
  }

  if (storedChanged) {
    await db.put('Options', {
      key: 'notificationPermission',
      value: newPermission,
    });
  }

  OneSignalEvent._trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
    newPermission,
  );
  OneSignalEvent._trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN,
    newPermission === 'granted',
  );

  // When only this context's cache was stale, the context that stored the value
  // already reconciled the subscription. This context may not hold that push
  // model in memory yet, so a reconcile here would report a missing subscription.
  return force || storedChanged;
};
