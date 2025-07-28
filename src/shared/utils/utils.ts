import type { NotificationIcons } from 'src/page/models/NotificationIcons';
import { Utils } from '../context/Utils';
import Log from '../libraries/Log';
import { Browser, getBrowserName } from '../useragent';
import { IS_SERVICE_WORKER } from './EnvVariables';
import { OneSignalUtils } from './OneSignalUtils';
import { PermissionUtils } from './PermissionUtils';

export function removeDomElement(selector: string) {
  const els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++) {
      const parentNode = els[i].parentNode;
      if (parentNode) {
        parentNode.removeChild(els[i]);
      }
    }
  }
}

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

export function executeCallback<T>(
  callback?: (...args: any[]) => T,
  ...args: any[]
) {
  if (callback) {
    // eslint-disable-next-line prefer-spread
    return callback.apply(null, args);
  }
}

export function logMethodCall(methodName: string, ...args: any[]) {
  return OneSignalUtils.logMethodCall(methodName, ...args);
}

export function isValidEmail(email: string | undefined | null) {
  return (
    !!email &&
    !!email.match(
      // eslint-disable-next-line no-control-regex
      /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/,
    )
  );
}

export function addDomElement(
  targetSelectorOrElement: string | Element,
  addOrder: InsertPosition,
  elementHtml: string,
) {
  let targetElement: Element | null;
  if (typeof targetSelectorOrElement === 'string') {
    targetElement = document.querySelector(targetSelectorOrElement);
  } else {
    targetElement = targetSelectorOrElement;
  }

  if (targetElement) {
    targetElement.insertAdjacentHTML(addOrder, elementHtml);
    return;
  }
  throw new Error(
    `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
  );
}

export function clearDomElementChildren(
  targetSelectorOrElement: Element | string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  } else if (typeof targetSelectorOrElement === 'object') {
    while (targetSelectorOrElement.firstChild) {
      targetSelectorOrElement.removeChild(targetSelectorOrElement.firstChild);
    }
  } else
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
}

export function addCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    element.classList.add(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.add(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

export function removeCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    element.classList.remove(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.remove(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

export function hasCssClass(
  targetSelectorOrElement: Element | string,
  cssClass: string,
) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(
        `Cannot find element with selector "${targetSelectorOrElement}"`,
      );
    }
    return element.classList.contains(cssClass);
  } else if (typeof targetSelectorOrElement === 'object') {
    return targetSelectorOrElement.classList.contains(cssClass);
  } else {
    throw new Error(
      `${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`,
    );
  }
}

/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function nothing(): Promise<any> {
  return Promise.resolve();
}

/**
 * Returns true if match is in string; otherwise, returns false.
 */
export function contains(indexOfAble: any, match: string) {
  return Utils.contains(indexOfAble, match);
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

export function getDomElementOrStub(selector: string): Element {
  const foundElement = document.querySelector(selector);
  if (!foundElement) {
    Log.debug(`No instance of ${selector} found. Returning stub.`);
    return document.createElement('div');
  }
  return foundElement;
}

export function getTimeZoneId() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns true if the value is a JSON-serializable object.
 */
export function isObjectSerializable(value: unknown): boolean {
  if (!isObject(value)) return false;
  try {
    JSON.stringify(value);
    return true;
  } catch (e) {
    return false;
  }
}
