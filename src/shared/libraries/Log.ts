import { IS_SERVICE_WORKER, LOGGING } from '../utils/EnvVariables';

export default class Log {
  private static shouldLog(): boolean {
    if (IS_SERVICE_WORKER) return !!(self as any).shouldLog;
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
  public static setLevel(level: string) {
    if (IS_SERVICE_WORKER) return;

    /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
    try {
      window.localStorage.setItem('loglevel', level);
    } catch (e) {
      console.error(e);
    }
  }

  private static createLogMethod(consoleMethod: keyof Console) {
    return (...args: unknown[]): void => {
      if (LOGGING || this.shouldLog() || consoleMethod === 'error') {
        (console[consoleMethod] as (...args: unknown[]) => void)(...args);
      }
    };
  }
  static debug = Log.createLogMethod('debug');
  static info = Log.createLogMethod('info');
  static warn = Log.createLogMethod('warn');
  static error = Log.createLogMethod('error');
}
