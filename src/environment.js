import { contains } from './utils.js';

export default class Environment {
  static get SERVICE_WORKER() {
    return 'ServiceWorker';
  }

  static get HOST() {
    return "host";
  }

  static get POPUP() {
    return "popup";
  }

  static get IFRAME() {
    return "iFrame";
  }

  static getEnv() {
    if (typeof window === "undefined") {
      if (typeof WorkerLocation !== "undefined" && location instanceof WorkerLocation)
        return Environment.SERVICE_WORKER;
    }
    else {
      // If the window is the root top-most level
      if (window.self === window.top) {
        if (contains(location.href, "initOneSignal"))
          return Environment.POPUP;
        else
          return Environment.HOST;
      }
      else
        return Environment.IFRAME;
    }
  }

  static isServiceWorker() {
    return Environment.getEnv() === Environment.SERVICE_WORKER;
  }

  /**
   * The main site page.
   */
  static isHost() {
    return Environment.getEnv() === Environment.HOST;
  }

  /**
   * The HTTP popup asking users using our subdomain workaround to subscribe,
   */
  static isPopup() {
    return Environment.getEnv() === Environment.POPUP;
  }

  /**
   * The HTTPS iFrame we put on HTTP sites to communicate with the service worker and IndexedDB.
   * @returns {boolean}
   */
  static isIframe() {
    return Environment.getEnv() === Environment.IFRAME;
  }

  /**
   * True if not in a service worker environment.
   */
  static isBrowser() {
    return typeof window !== 'undefined';
  }

  static isDev() {
    return __DEV__;
  }
}