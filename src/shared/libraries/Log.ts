import { IS_SERVICE_WORKER, LOGGING } from '../utils/env';

export default class Log {
  private static _shouldLog(): boolean {
    if (IS_SERVICE_WORKER)
      return !!(self as unknown as ServiceWorkerGlobalScope).shouldLog;
    try {
      /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
      const level = window.localStorage.getItem('loglevel');
      return level?.toLowerCase() === 'trace';
    } catch (e) {
      return false;
    }
  }

  /**
   * Sets the log level for page context.
   * Will not do anything in service worker context.
   */
  public static _setLevel(level: string) {
    if (IS_SERVICE_WORKER) return;

    /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
    try {
      window.localStorage.setItem('loglevel', level);
    } catch (e) {
      console.error(e);
    }
  }

  private static _createLogMethod(consoleMethod: keyof Console) {
    return (...args: unknown[]): void => {
      if (LOGGING || this._shouldLog() || consoleMethod === 'error') {
        (console[consoleMethod] as (...args: unknown[]) => void)(...args);
      }
    };
  }
  static _debug = Log._createLogMethod('debug');
  static _info = Log._createLogMethod('info');
  static _warn = Log._createLogMethod('warn');
  static _error = Log._createLogMethod('error');
}
