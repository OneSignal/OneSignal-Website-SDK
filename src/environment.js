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
        if (location.href.indexOf("initOneSignal") > -1)
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

  static isHost() {
    return Environment.getEnv() === Environment.HOST;
  }

  static isPopup() {
    return Environment.getEnv() === Environment.POPUP;
  }

  static isIframe() {
    return Environment.getEnv() === Environment.IFRAME;
  }

  static isBrowser() {
    return typeof window !== 'undefined';
  }
}