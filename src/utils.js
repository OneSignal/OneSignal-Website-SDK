import log from 'loglevel';

export function isArray(variable) {
  return Object.prototype.toString.call( variable ) === '[object Array]';
}

export function getHumanizedTimeDuration(timeDurationInMilliseconds) {
  function addPluralSuffix(number) {
    return (number > 1) ? 's' : '';
  }
  var duration = Math.floor(timeDurationInMilliseconds / 1000);

  var years = Math.floor(duration / 31536000);
  if (years)
    return years + ' year' + addPluralSuffix(years);

  var days = Math.floor((duration %= 31536000) / 86400);
  if (days)
    return days + ' day' + addPluralSuffix(days);

  var hours = Math.floor((duration %= 86400) / 3600);
  if (hours)
    return hours + ' hour' + addPluralSuffix(hours);

  var minutes = Math.floor((duration %= 3600) / 60);
  if (minutes)
    return minutes + ' minute' + addPluralSuffix(minutes);

  var seconds = duration % 60;
  if (seconds)
    return seconds + ' second' + addPluralSuffix(seconds);

  return 'just now';
}

export function isBrowserEnv() {
  return typeof window !== "undefined";
}

export function isDev() {
  return __DEV__;
}

export function isPushNotificationsSupported () {
  var chromeVersion = navigator.appVersion.match(/Chrome\/(.*?) /);

  if (isSupportedFireFox())
    return true;

  if (isSupportedSafari())
    return true;

  // Chrome is not found in appVersion.
  if (!chromeVersion)
    return false;

  // Microsoft Edge
  if (navigator.appVersion.match(/Edge/))
    return false;

  // Android Chrome WebView
  if (navigator.appVersion.match(/ wv/))
    return false;

  // Opera
  if (navigator.appVersion.match(/OPR\//))
    return false;

  // The user is on iOS
  if (/iPad|iPhone|iPod/.test(navigator.platform))
    return false;

  return parseInt(chromeVersion[1].substring(0, 2)) > 41;
}

export function isBrowserSafari() {
  var safariVersion = navigator.appVersion.match("Version/([0-9]?).* Safari");
  return safariVersion != null ;
}

export function isSupportedFireFox() {
  var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
  if (fireFoxVersion)
    return parseInt(fireFoxVersion[2].substring(0, 2)) > 43;
  return false;
}

export function isBrowserFirefox() {
  var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
  return fireFoxVersion != null ;
}

export function getFirefoxVersion() {
  var fireFoxVersion = navigator.userAgent.match(/(Firefox\/)([0-9]{2,}\.[0-9]{1,})/);
  if (fireFoxVersion)
    return parseInt(fireFoxVersion[2].substring(0, 2));
  else return -1;
}

export function isSupportedSafari() {
  var safariVersion = navigator.appVersion.match("Version/([0-9]?).* Safari");
  if (safariVersion == null)
    return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent))
    return false;
  return (parseInt(safariVersion[1]) > 6);
}

export function removeDomElement(selector) {
  var els = document.querySelectorAll(selector);
  if (els.length > 0) {
    for (let i = 0; i < els.length; i++)
      els[i].parentNode.removeChild(els[i]);
  }
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

export function on(targetSelectorOrElement, event, task) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
  }
  log.debug('Debug me here.');
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        on(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      on(targetSelectorOrElement[i], task);
  }
  else if (typeof targetSelectorOrElement === 'object')
    targetSelectorOrElement.addEventListener(event, task);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}

export function once(targetSelectorOrElement, event, task, manualDestroy=false) {
  if (!event) {
    log.error('Cannot call on() with no event: ', event);
  }
  if (!task) {
    log.error('Cannot call on() with no task: ', task)
  }
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        once(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      once(targetSelectorOrElement[i], task);
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
 * Removes event handler from selector.
 * @param targetSelectorOrElement Selector to target one or multiple elements, or a single or array of DOMElement.
 * @param event The event to target (e.g. 'transitionend')
 * @param task A single function callback to unbind, or leave empty to remove all event handlers.
 */
export function off(targetSelectorOrElement, event, task) {
  if (typeof targetSelectorOrElement === 'string') {
    let els = document.querySelectorAll(selector);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++)
        off(els[i], task);
    }
  }
  else if (isArray(targetSelectorOrElement)) {
    for (let i = 0; i < targetSelectorOrElement.length; i++)
      off(targetSelectorOrElement[i], task);
  }
  else if (typeof targetSelectorOrElement === 'object')
    if (task)
      targetSelectorOrElement.removeEventListener(event, task);
    else
      targetSelectorOrElement.removeEventListener(event);
  else
    throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
}