import * as log from "loglevel";
import * as Browser from "bowser";
import Environment from "./Environment";
import Database from "./services/Database";
import PushNotSupportedError from "./errors/PushNotSupportedError";
import SubscriptionHelper from "./helpers/SubscriptionHelper";
import SdkEnvironment from "./managers/SdkEnvironment";
import { WindowEnvironmentKind } from "./models/WindowEnvironmentKind";
import TimeoutError from "./errors/TimeoutError";


export function isArray(variable) {
  return Object.prototype.toString.call( variable ) === '[object Array]';
}

var decodeTextArea = null;
export function decodeHtmlEntities(text) {
  if (Environment.isBrowser()) {
    if (!decodeTextArea) {
      decodeTextArea = document.createElement("textarea");
    }
  }
  if (decodeTextArea) {
    decodeTextArea.innerHTML = text;
    return decodeTextArea.value;
  } else {
    // Not running in a browser environment, text cannot be decoded
    return text;
  }
}

export function isPushNotificationsSupported() {
  /**
   * It's possible a browser's user agent is modified, so we do some basic feature detection to make sure initializing
   * the SDK won't fail. Promises are required to initialize the SDK.
   */
  if (typeof (window as any).Promise === "undefined") {
    return false;
  }

  /*
   TODO: Make this a little neater
   During testing, the browser object may be initialized before the userAgent is injected
  */
  if (Browser.name === '' && Browser.version === '') {
    var browser = (Browser as any)._detect(navigator.userAgent);
  } else {
    var browser: any =  Browser;
  }
  let userAgent = navigator.userAgent || '';

  if (!browser.safari && typeof navigator.serviceWorker === "undefined") {
    /**
     * Browsers like Firefox Extended Support Release don't support service workers
     */
    return false;
  }

  if (browser.ios || (<any>browser).ipod || (<any>browser).iphone || (<any>browser).ipad)
    return false;

  if (browser.msedge || browser.msie)
    return false;

  // Facebook in-app browser
  if ((userAgent.indexOf("FBAN") > -1) || (userAgent.indexOf("FBAV") > -1)) {
    return false;
  }

  // Android Chrome WebView
  if (navigator.appVersion.match(/ wv/))
    return false;

  /* Firefox on Android push notifications not supported until at least 48: https://bugzilla.mozilla.org/show_bug.cgi?id=1206207#c6 */
  if (browser.firefox && Number(browser.version) < 48 && (browser.mobile || browser.tablet)) {
    return false;
  }

  if (browser.firefox && Number(browser.version) >= 44)
    return true;

  if (browser.safari && Number(browser.version) >= 7.1)
    return true;

  // Web push is supported in Samsung Internet for Android 4.0+
  // http://developer.samsung.com/internet/android/releases
  if (browser.samsungBrowser && Number(browser.version) >= 4) {
    return true;
  }

  if ((browser.chrome || (<any>browser).chromium) && Number(browser.version) >= 42)
    return true;

  if ((<any>browser).yandexbrowser && Number(browser.version) >= 15.12)
    return true;

  // https://www.chromestatus.com/feature/5416033485586432
  if (browser.opera && (browser.mobile || browser.tablet) && Number(browser.version) >= 37 ||
    browser.opera && Number(browser.version) >= 42)
    return true;

  // The earliest version of Vivaldi uses around Chrome 50
  if ((browser as any).vivaldi)
    return true;

  return false;
}

export function removeDomElement(selector) {
  var els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++)
      els[i].parentNode.removeChild(els[i]);
  }
}

/**
 * Helper method for public APIs that waits until OneSignal is initialized, rejects if push notifications are
 * not supported, and wraps these tasks in a Promise.
 */
export function awaitOneSignalInitAndSupported() {
  return new Promise((resolve, reject) => {
    if (!OneSignal.initialized) {
      OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
    } else {
      resolve();
    }
  });
}

/**
 * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
 * Helps when logging method calls.
 */
export function stringify(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') {
      return "[Function]";
    }
    else {
      return value;
    }
  }, 4);
}

export function executeCallback<T>(callback: Action<T>, ...args: any[]) {
  if (callback) {
    return callback.apply(null, args);
  }
}

export function logMethodCall(methodName: string, ...args) {
  return log.debug(`Called %c${methodName}(${args.map(stringify).join(', ')})`, getConsoleStyle('code'), '.');
}

export function isValidEmail(email) {
  return !!email &&
         !!email.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/)
}

export function addDomElement(targetSelectorOrElement, addOrder, elementHtml) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).insertAdjacentHTML(addOrder, elementHtml);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.insertAdjacentHTML(addOrder, elementHtml);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function clearDomElementChildren(targetSelectorOrElement) {
  if (typeof targetSelectorOrElement === 'string') {
    var element = document.querySelector(targetSelectorOrElement);
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

export function addCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).classList.add(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.classList.add(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function removeCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    document.querySelector(targetSelectorOrElement).classList.remove(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.classList.remove(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function hasCssClass(targetSelectorOrElement, cssClass) {
  if (typeof targetSelectorOrElement === 'string')
    return document.querySelector(targetSelectorOrElement).classList.contains(cssClass);
  else if (typeof targetSelectorOrElement === 'object')
    return targetSelectorOrElement.classList.contains(cssClass);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

var DEVICE_TYPES = {
  CHROME: 5,
      SAFARI: 7,
      FIREFOX: 8,
};

export function getDeviceTypeForBrowser() {
  if (Browser.chrome ||
    (<any>Browser).yandexbrowser ||
    Browser.opera ||
    (Browser as any).vivaldi ||
    (Browser as any).samsungBrowser ||
    (<any>Browser).chromium) {
    return DEVICE_TYPES.CHROME;
  } else if (Browser.firefox) {
    return DEVICE_TYPES.FIREFOX;
  } else if (Browser.safari) {
    return DEVICE_TYPES.SAFARI;
  } else {
    log.error(`OneSignal: Unable to associate device type for browser ${Browser.name} ${Browser.version}`);
  }
}
export function getConsoleStyle(style) {
  if (style == 'code') {
    return `padding: 0 1px 1px 5px;border: 1px solid #ddd;border-radius: 3px;font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;color: #444;`;
  } else if (style == 'bold') {
    return `font-weight: 600;color: rgb(51, 51, 51);`;
  } else if (style == 'alert') {
    return `font-weight: 600;color: red;`;
  } else if (style == 'event') {
    return `color: green;`;
  } else if (style == 'postmessage') {
    return `color: orange;`;
  } else if (style == 'serviceworkermessage') {
    return `color: purple;`;
  }
}

/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  });
}

export function nothing(): Promise<any> {
  return Promise.resolve();
}

export function timeoutPromise(promise: Promise<any>, milliseconds: number): Promise<TimeoutError | any> {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new TimeoutError())
    }, milliseconds);
  });
  return Promise.race([promise, timeoutPromise]);
}

export function when(condition, promiseIfTrue, promiseIfFalse) {
  if (promiseIfTrue === undefined)
    promiseIfTrue = nothing();
  if (promiseIfFalse === undefined)
    promiseIfFalse = nothing();
  return (condition ? promiseIfTrue : promiseIfFalse);
}

/**
 * Returns true if match is in string; otherwise, returns false.
 */
export function contains(indexOfAble, match) {
  if (!indexOfAble)
    return false;
  return indexOfAble.indexOf(match) !== -1;
}

/**
 * Returns the current object without keys that have undefined values.
 * Regardless of whether the return result is used, the passed-in object is destructively modified.
 * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
 * @param object
 */
export function trimUndefined(object) {
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      if (object[property] === undefined) {
        delete object[property];
      }
    }
  }
  return object;
}

/**
 * Returns true if the UUID is a string of 36 characters;
 * @param uuid
 * @returns {*|boolean}
 */
export function isValidUuid(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
}

export function getUrlQueryParam(name) {
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
  log.warn('OneSignal: Wiping IndexedDB data.');
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
export function capitalize(text): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Unsubscribe from push notifications without removing the active service worker.
 */
export function unsubscribeFromPush() {
  log.warn('OneSignal: Unsubscribing from push.');
  if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
    return (<any>self).registration.pushManager.getSubscription()
                       .then(subscription => {
                         if (subscription) {
                           return subscription.unsubscribe();
                         } else throw new Error('Cannot unsubscribe because not subscribed.');
                       });
  } else {
    if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      return new Promise((resolve, reject) => {
        log.debug("Unsubscribe from push got called, and we're going to remotely execute it in HTTPS iFrame.");
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.UNSUBSCRIBE_FROM_PUSH, null, reply => {
          log.debug("Unsubscribe from push succesfully remotely executed.");
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
                      .then(subscription => {
                        if (subscription) {
                          return subscription.unsubscribe();
                        }
                      });
    }
  }
}


/**
 * Unregisters the active service worker.
 */
export function wipeServiceWorker() {
  log.warn('OneSignal: Unregistering service worker.');
  if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame) {
    return;
  }
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
    return Promise.resolve();

  return navigator.serviceWorker.ready
      .then(registration => registration.unregister());
}


/**
 * Unsubscribe from push notifications and remove any active service worker.
 */
export function wipeServiceWorkerAndUnsubscribe() {
  return Promise.all([
    unsubscribeFromPush(),
    wipeServiceWorker()
  ]);
}

export function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Returns the part of the string after the first occurence of the specified search.
 * @param string The entire string.
 * @param search The text returned will be everything *after* search.
 * e.g. substringAfter('A white fox', 'white') => ' fox'
 */
export function substringAfter(string, search) {
  return string.substr(string.indexOf(search) + search.length);
}

export function once(targetSelectorOrElement, event, task, manualDestroy=false) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
  }
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(targetSelectorOrElement);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        once(els[i], event, task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      once(targetSelectorOrElement[i], event, task);
  }
  else if (typeof targetSelectorOrElement === 'object') {
    var taskWrapper = (function () {
      var internalTaskFunction = function (e) {
        var destroyEventListener = function() {
          targetSelectorOrElement.removeEventListener(e.type, taskWrapper);
        };
        if (!manualDestroy) {
          destroyEventListener();
        }
        task(e, destroyEventListener);
      };
      return internalTaskFunction;
    })();
    targetSelectorOrElement.addEventListener(event, taskWrapper);
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

export async function awaitSdkEvent(eventName: string, predicate?: Action<any>) {
  return await new Promise((resolve, reject) => {
    OneSignal.once(eventName, event => {
      if (predicate) {
        const predicateResult = predicate(event);
        if (predicateResult)
          resolve(event);
      } else resolve(event);
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

/**
 * Returns the email with all whitespace removed and converted to lower case.
 */
export function prepareEmailForHashing(email: string): string {
  return email.replace(/\s/g, '').toLowerCase();
}

/**
 * Taken from: http://lig-membres.imag.fr/donsez/cours/exemplescourstechnoweb/js_securehash/
 */
export function md5(str: string) {
  /*
   * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
   * Digest Algorithm, as defined in RFC 1321.
   * Copyright (C) Paul Johnston 1999 - 2000.
   * Updated by Greg Holt 2000 - 2001.
   * See http://pajhome.org.uk/site/legal.html for details.
   */

  /*
   * Convert a 32-bit number to a hex string with ls-byte first
   */
  var hex_chr = "0123456789abcdef";

  function rhex(num) {
    var str = "";
    for (var j = 0; j <= 3; j++)
      str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) +
        hex_chr.charAt((num >> (j * 8)) & 0x0F);
    return str;
  }

  /*
   * Convert a string to a sequence of 16-word blocks, stored as an array.
   * Append padding bits and the length, as described in the MD5 standard.
   */
  function str2blks_MD5(str) {
    var nblk = ((str.length + 8) >> 6) + 1;
    var blks = new Array(nblk * 16);
    for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (var i = 0; i < str.length; i++)
      blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = str.length * 8;
    return blks;
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  function add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left
   */
  function rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  /*
   * These functions implement the basic operation for each round of the
   * algorithm.
   */
  function cmn(q, a, b, x, s, t) {
    return add(rol(add(add(a, q), add(x, t)), s), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  /*
   * Take a string and return the hex representation of its MD5.
   */
  function calcMD5(str) {
    var x = str2blks_MD5(str);
    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;

    for (var i = 0; i < x.length; i += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;

      a = ff(a, b, c, d, x[i + 0], 7, -680876936);
      d = ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = ff(c, d, a, b, x[i + 10], 17, -42063);
      b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

      a = hh(a, b, c, d, x[i + 5], 4, -378558);
      d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = hh(d, a, b, c, x[i + 0], 11, -358537222);
      c = hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = ii(a, b, c, d, x[i + 0], 6, -198630844);
      d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = add(a, olda);
      b = add(b, oldb);
      c = add(c, oldc);
      d = add(d, oldd);
    }
    return rhex(a) + rhex(b) + rhex(c) + rhex(d);
  }

  return calcMD5(str);
}

/**
 * Taken from: http://lig-membres.imag.fr/donsez/cours/exemplescourstechnoweb/js_securehash/sha1src.html
 */
export function sha1(str: string) {
  /*
   * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
   * in FIPS PUB 180-1
   * Copyright (C) Paul Johnston 2000.
   * See http://pajhome.org.uk/site/legal.html for details.
   */

  /*
   * Convert a 32-bit number to a hex string with ms-byte first
   */
  var hex_chr = "0123456789abcdef";

  function hex(num) {
    var str = "";
    for (var j = 7; j >= 0; j--)
      str += hex_chr.charAt((num >> (j * 4)) & 0x0F);
    return str;
  }

  /*
   * Convert a string to a sequence of 16-word blocks, stored as an array.
   * Append padding bits and the length, as described in the SHA1 standard.
   */
  function str2blks_SHA1(str) {
    var nblk = ((str.length + 8) >> 6) + 1;
    var blks = new Array(nblk * 16);
    for (var i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (i = 0; i < str.length; i++)
      blks[i >> 2] |= str.charCodeAt(i) << (24 - (i % 4) * 8);
    blks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
    blks[nblk * 16 - 1] = str.length * 8;
    return blks;
  }

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  function add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  /*
   * Bitwise rotate a 32-bit number to the left
   */
  function rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  /*
   * Perform the appropriate triplet combination function for the current
   * iteration
   */
  function ft(t, b, c, d) {
    if (t < 20) return (b & c) | ((~b) & d);
    if (t < 40) return b ^ c ^ d;
    if (t < 60) return (b & c) | (b & d) | (c & d);
    return b ^ c ^ d;
  }

  /*
   * Determine the appropriate additive constant for the current iteration
   */
  function kt(t) {
    return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 :
      (t < 60) ? -1894007588 : -899497514;
  }

  /*
   * Take a string and return the hex representation of its SHA-1.
   */
  function calcSHA1(str) {
    var x = str2blks_SHA1(str);
    var w = new Array(80);

    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;
    var e = -1009589776;

    for (var i = 0; i < x.length; i += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;
      var olde = e;

      for (var j = 0; j < 80; j++) {
        if (j < 16) w[j] = x[i + j];
        else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        var t = add(add(rol(a, 5), ft(j, b, c, d)), add(add(e, w[j]), kt(j)));
        e = d;
        d = c;
        c = rol(b, 30);
        b = a;
        a = t;
      }

      a = add(a, olda);
      b = add(b, oldb);
      c = add(c, oldc);
      d = add(d, oldd);
      e = add(e, olde);
    }
    return hex(a) + hex(b) + hex(c) + hex(d) + hex(e);
  }

  return calcSHA1(str);
}
