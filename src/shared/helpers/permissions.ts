import { db, getOptionsValue } from '../database/client';
import Log from '../libraries/Log';
import { checkAndTriggerSubscriptionChanged } from '../listeners';
import OneSignalEvent from '../services/OneSignalEvent';

// Browsers can report one permission change through two APIs:
//    1. Notification.requestPermission callback
//    2. navigator.permissions.query({ name: 'notifications' }`).onchange
// Calls run one at a time. A second call for the same change finds the cache
// already updated and fires nothing, so none of them needs to be dropped.
let queue: Promise<unknown> = Promise.resolve();

export const triggerNotificationPermissionChanged = (force = false): Promise<void> => {
  const run = queue.then(() => privateTriggerNotificationPermissionChanged(force));
  queue = run.catch(() => undefined);
  return run.then((reconcile) =>
    reconcile
      ? checkAndTriggerSubscriptionChanged().catch((e) =>
          Log._error('Subscription reconcile failed', e),
        )
      : undefined,
  );
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
