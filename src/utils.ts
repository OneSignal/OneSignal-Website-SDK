import TimeoutError from './errors/TimeoutError';
import SdkEnvironment from './managers/SdkEnvironment';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import Database from './services/Database';
import Log from './libraries/Log';
import { OneSignalUtils } from './utils/OneSignalUtils';
import { PermissionUtils } from './utils/PermissionUtils';
import { BrowserUtils } from './utils/BrowserUtils';
import { Utils } from "./context/shared/utils/Utils";
import bowser from 'bowser';

export function isArray(variable: any) {
  return Object.prototype.toString.call(variable) === '[object Array]';
}

export function decodeHtmlEntities(text: string) {
  return BrowserUtils.decodeHtmlEntities(text);
}

export function removeDomElement(selector: string) {
  var els = document.querySelectorAll(selector);
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
export async function awaitOneSignalInitAndSupported(): Promise<object|void> {
  return new Promise(resolve => {
    if (!OneSignal.initialized)
      OneSignal.emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
    else
      resolve();
  });
}

/**
 * Returns true if web push subscription occurs on a subdomain of OneSignal.
 * If true, our main IndexedDB is stored on the subdomain of onesignal.com, and not the user's site.
 * @remarks
 *   This method returns true if:
 *     - The browser is not Safari
 *         - Safari uses a different method of subscription and does not require our workaround
 *     - The init parameters contain a subdomain (even if the protocol is HTTPS)
 *         - HTTPS users using our subdomain workaround still have the main IndexedDB stored on our subdomain
 *        - The protocol of the current webpage is http:
 *   Exceptions are:
 *     - Safe hostnames like localhost and 127.0.0.1
 *          - Because we don't want users to get the wrong idea when testing on localhost that direct permission is supported on HTTP, we'll ignore these exceptions. HTTPS will always be required for direct permission
 *        - We are already in popup or iFrame mode, or this is called from the service worker
 */
export function isUsingSubscriptionWorkaround() {
  return OneSignalUtils.isUsingSubscriptionWorkaround();
}

export async function triggerNotificationPermissionChanged(updateIfIdentical = false) {
  return PermissionUtils.triggerNotificationPermissionChanged(updateIfIdentical);
}

/**
 * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
 * Helps when logging method calls.
 */
export function stringify(obj: any) {
  return Utils.stringify(obj);
}

export function executeCallback<T>(callback?: Action<T>, ...args: any[]) {
  if (callback) {
    return callback.apply(null, args);
  }
}

export function logMethodCall(methodName: string, ...args: any[]) {
  return OneSignalUtils.logMethodCall(methodName, ...args);
}

export function isValidEmail(email: string | undefined | null) {
  return !!email &&
         !!email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)
}

export function addDomElement(targetSelectorOrElement: string | Element,
  addOrder: InsertPosition, elementHtml: string) {
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
  throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function clearDomElementChildren(targetSelectorOrElement: Element | string) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(`Cannot find element with selector "${targetSelectorOrElement}"`);
    }
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
  else if (typeof targetSelectorOrElement === 'object') {
    while (targetSelectorOrElement.firstChild) {
      targetSelectorOrElement.removeChild(targetSelectorOrElement.firstChild);
    }
  }
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function addCssClass(targetSelectorOrElement: Element | string, cssClass: string) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(`Cannot find element with selector "${targetSelectorOrElement}"`);
    }
    element.classList.add(cssClass);
  }
  else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.add(cssClass);
  }
  else {
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
  }
}

export function removeCssClass(targetSelectorOrElement: Element | string, cssClass: string) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(`Cannot find element with selector "${targetSelectorOrElement}"`);
    }
    element.classList.remove(cssClass);
  }
  else if (typeof targetSelectorOrElement === 'object') {
    targetSelectorOrElement.classList.remove(cssClass);
  }
  else {
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
  }
}

export function hasCssClass(targetSelectorOrElement: Element | string, cssClass: string) {
  if (typeof targetSelectorOrElement === 'string') {
    const element = document.querySelector(targetSelectorOrElement);
    if (element === null) {
      throw new Error(`Cannot find element with selector "${targetSelectorOrElement}"`);
    }
    return element.classList.contains(cssClass);
  }
  else if (typeof targetSelectorOrElement === 'object') {
    return targetSelectorOrElement.classList.contains(cssClass);
  }
  else {
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
  }
}

/**
 * var DEVICE_TYPES = {
 *  CHROME: 5,
 *  SAFARI: 7,
 *  FIREFOX: 8,
 *  EDGE: 12,
 *  UNKNOWN: -99
 * };
 */

export function getConsoleStyle(style: string) {
  return Utils.getConsoleStyle(style);
}

/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  });
}

export function nothing(): Promise<any> {
  return Promise.resolve();
}

export function timeoutPromise(promise: Promise<any>, milliseconds: number): Promise<TimeoutError | any> {
  return Utils.timeoutPromise(promise, milliseconds);
}

export function when(condition: Action<boolean>, promiseIfTrue: Promise<any> | undefined,
  promiseIfFalse: Promise<any> | undefined) {
  if (promiseIfTrue === undefined)
    promiseIfTrue = nothing();
  if (promiseIfFalse === undefined)
    promiseIfFalse = nothing();
  return (condition ? promiseIfTrue : promiseIfFalse);
}

/**
 * Returns true if match is in string; otherwise, returns false.
 */
export function contains(indexOfAble: any, match: string) {
  return Utils.contains(indexOfAble, match);
}

/**
 * Returns the current object without keys that have undefined values.
 * Regardless of whether the return result is used, the passed-in object is destructively modified.
 * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
 * @param object
 */
export function trimUndefined(object: any) {
  return Utils.trimUndefined(object);
}

export function getRandomUuid(): string {
  return OneSignalUtils.getRandomUuid();
}

/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
export function isValidUuid(uuid: string) {
  return OneSignalUtils.isValidUuid(uuid);
}

export function getUrlQueryParam(name: string) {
  let url = window.location.href;
  url = url.toLowerCase(); // This is just to avoid case sensitiveness
  name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * Wipe OneSignal-related IndexedDB data on the "correct" computed origin, but OneSignal must be initialized first to use.
 */
export function wipeIndexedDb() {
  Log.warn('OneSignal: Wiping IndexedDB data.');
  return Promise.all([
    Database.remove('Ids'),
    Database.remove('NotificationOpened'),
    Database.remove('Options')
  ]);
}

/**
 * Capitalizes the first letter of the string.
 * @returns {string} The string with the first letter capitalized.
 */
export function capitalize(text: string): string {
  return Utils.capitalize(text);
}

/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
export function unsubscribeFromPush() {
  Log.warn('OneSignal: Unsubscribing from push.');
  if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
    return (<any>self).registration.pushManager.getSubscription()
                       .then((subscription: PushSubscription) => {
                         if (subscription) {
                           return subscription.unsubscribe();
                         } else throw new Error('Cannot unsubscribe because not subscribed.');
                       });
  } else {
    if (isUsingSubscriptionWorkaround()) {
      return new Promise<void>((resolve, reject) => {
        Log.debug("Unsubscribe from push got called, and we're going to remotely execute it in HTTPS iFrame.");
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, null, (reply: any) => {
          Log.debug("Unsubscribe from push succesfully remotely executed.");
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject('Failed to remotely unsubscribe from push.');
          }
        });
      });
    } else {
      if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
        return Promise.resolve();

      return navigator.serviceWorker.ready
                      .then(registration => registration.pushManager)
                      .then(pushManager => pushManager.getSubscription())
                      .then((subscription: any) => {
                        if (subscription) {
                          return subscription.unsubscribe();
                        } else {
                          return Promise.resolve();
                        }
                      });
    }
  }
}

export function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Returns the part of the string after the first occurence of the specified search.
 * @param string The entire string.
 * @param search The text returned will be everything *after* search.
 * e.g. substringAfter('A white fox', 'white') => ' fox'
 */
export function substringAfter(string: string, search: string) {
  return string.substr(string.indexOf(search) + search.length);
}

export function once(targetSelectorOrElement: string | string[] | Element | Document, event: string, task: Function, manualDestroy=false) {
  if (!event) {
    Log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    Log.error('Cannot call on() with no task: ', task)
  }
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(targetSelectorOrElement);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        once(els[i], event, task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < (targetSelectorOrElement as string[]).length; i++)
      once((targetSelectorOrElement as string[])[i], event, task);
  }
  else if (typeof targetSelectorOrElement === 'object') {
    var taskWrapper = (function () {
      var internalTaskFunction = function (e: Event) {
        var destroyEventListener = function() {
          (targetSelectorOrElement as Element | Document).removeEventListener(e.type, taskWrapper);
        };
        if (!manualDestroy) {
          destroyEventListener();
        }
        task(e, destroyEventListener);
      };
      return internalTaskFunction;
    })();
    (targetSelectorOrElement as Element | Document).addEventListener(event, taskWrapper);
  }
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

/**
 * Returns the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function getSdkLoadCount() {
  return (<any>window).__oneSignalSdkLoadCount || 0;
}

export async function awaitSdkEvent(eventName: string) {
  return await new Promise(resolve => {
    OneSignal.emitter.once(eventName, (event: Event) => {
      resolve(event);
    });
  });
}

/**
 * Increments the counter describing the number of times the SDK has been loaded into the browser.
 * Expects a browser environment, otherwise this call will fail.
 */
export function incrementSdkLoadCount() {
  (<any>window).__oneSignalSdkLoadCount = getSdkLoadCount() + 1;
}

export function getPlatformNotificationIcon(notificationIcons: NotificationIcons | null): string {
  if (!notificationIcons)
    return 'default-icon';

  if (bowser.safari && notificationIcons.safari)
    return notificationIcons.safari;
  else if (bowser.firefox && notificationIcons.firefox)
    return notificationIcons.firefox;

  return notificationIcons.chrome ||
    notificationIcons.firefox ||
    notificationIcons.safari ||
    'default-icon';
}

export function getDomElementOrStub(selector: string): Element {
  const foundElement = document.querySelector(selector);
  if (!foundElement) {
    Log.debug(`No instance of ${selector} found. Returning stub.`);
    return document.createElement('div');
  }
  return foundElement;
}

export function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
