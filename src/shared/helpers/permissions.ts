import { db, getOptionsValue } from '../database/client';
import Log from '../libraries/Log';
import { checkAndTriggerSubscriptionChanged } from '../listeners';
import OneSignalEvent from '../services/OneSignalEvent';

// Focus, permissions.onchange, and the requestPermission result can all report one
// change. Calls run one at a time; a later call finds nothing new and emits nothing.
let queue: Promise<unknown> = Promise.resolve();

export const triggerNotificationPermissionChanged = (force = false): Promise<void> => {
  const run = queue.then(() => checkPermission(force));
  queue = run.catch(() => undefined);
  return run;
};

const checkPermission = async (force: boolean): Promise<void> => {
  const permission = await OneSignal._context._permissionManager._getPermissionStatus();
  const storedChanged =
    permission !== (await getOptionsValue<NotificationPermission>('notificationPermission'));
  // IndexedDB is shared by every same-origin context (tabs, installed PWA), so another
  // context may have stored the new value first. Compare against this context's cache too.
  if (!force && !storedChanged && permission === OneSignal.Notifications.permissionNative) return;

  if (storedChanged) await db.put('Options', { key: 'notificationPermission', value: permission });

  OneSignalEvent._trigger(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING, permission);
  OneSignalEvent._trigger(
    OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN,
    permission === 'granted',
  );

  // On a cache-only change, the context that stored the value already reconciled, and
  // this context may not hold that push model yet. A failed reconcile must not reject
  // callers such as the subscribe flow.
  if (force || storedChanged) await checkAndTriggerSubscriptionChanged().catch(Log._error);
};
