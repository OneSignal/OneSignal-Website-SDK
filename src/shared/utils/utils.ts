import type { NotificationIcons } from 'src/shared/notifications';
import Log from '../libraries/Log';
import { Browser, getBrowserName } from '../useragent';
import { IS_SERVICE_WORKER } from './EnvVariables';
import { OneSignalUtils } from './OneSignalUtils';
import { PermissionUtils } from './PermissionUtils';

/**
 * Helper method for public APIs that waits until OneSignal is initialized, rejects if push notifications are
 * not supported, and wraps these tasks in a Promise.
 */
export async function awaitOneSignalInitAndSupported(): Promise<object | void> {
  return new Promise((resolve) => {
    if (!OneSignal.initialized)
      OneSignal.emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
    else resolve();
  });
}

export async function triggerNotificationPermissionChanged(
  updateIfIdentical = false,
) {
  return PermissionUtils.triggerNotificationPermissionChanged(
    updateIfIdentical,
  );
}

export function logMethodCall(methodName: string, ...args: any[]) {
  return OneSignalUtils.logMethodCall(methodName, ...args);
}

/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
export function unsubscribeFromPush() {
  Log.warn('OneSignal: Unsubscribing from push.');
  if (!IS_SERVICE_WORKER) {
    return (self as any).registration.pushManager
      .getSubscription()
      .then((subscription: PushSubscription) => {
        if (subscription) {
          return subscription.unsubscribe();
        } else throw new Error('Cannot unsubscribe because not subscribed.');
      });
  }
  return (
    OneSignal.context.serviceWorkerManager
      .getRegistration()
      // @ts-expect-error - TODO: improve type
      .then((serviceWorker) => {
        if (!serviceWorker) {
          return Promise.resolve();
        }
        return serviceWorker;
      })
      .then((registration) => registration?.pushManager)
      .then((pushManager) => pushManager?.getSubscription())
      .then((subscription) => {
        if (subscription) {
          return subscription.unsubscribe().then(() => void 0);
        } else {
          return Promise.resolve();
        }
      })
  );
}

export function once(
  targetSelectorOrElement: string | string[] | Element | Document | null,
  event: string,
  task?: (e: Event, callback: () => void) => void,
  manualDestroy = false,
) {
  if (!event) {
    Log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    Log.error('Cannot call on() with no task: ', task);
  }
  if (typeof targetSelectorOrElement === 'string') {
    const els = document.querySelectorAll(targetSelectorOrElement);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++) once(els[i], event, task);
    }
  } else if (Array.isArray(targetSelectorOrElement)) {
    for (let i = 0; i < (targetSelectorOrElement as string[]).length; i++)
      once((targetSelectorOrElement as string[])[i], event, task);
  } else if (typeof targetSelectorOrElement === 'object') {
    const taskWrapper = (function () {
      const internalTaskFunction = function (e: Event) {
        const destroyEventListener = function () {
          (targetSelectorOrElement as Element | Document).removeEventListener(
            e.type,
            taskWrapper,
          );
        };
        if (!manualDestroy) {
          destroyEventListener();
        }
        task?.(e, destroyEventListener);
      };
      return internalTaskFunction;
    })();
    (targetSelectorOrElement as Element | Document).addEventListener(
      event,
      taskWrapper,
    );
  } else
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
}

/**
 * Returns the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function getSdkLoadCount() {
  return window.__oneSignalSdkLoadCount || 0;
}

/**
 * Increments the counter describing the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function incrementSdkLoadCount() {
  window.__oneSignalSdkLoadCount = getSdkLoadCount() + 1;
}

export function getPlatformNotificationIcon(
  notificationIcons: NotificationIcons | null,
): string {
  if (!notificationIcons) return 'default-icon';

  const browserName = getBrowserName();
  if (browserName === Browser.Safari && notificationIcons.safari)
    return notificationIcons.safari;
  else if (browserName === Browser.Firefox && notificationIcons.firefox)
    return notificationIcons.firefox;

  return (
    notificationIcons.chrome ||
    notificationIcons.firefox ||
    notificationIcons.safari ||
    'default-icon'
  );
}
