import { LOGGING } from '../utils/EnvVariables';

type ConsoleLog = (message?: unknown, ...optionalParams: unknown[]) => void;

export default class Log {
  static debug: ConsoleLog;
  static trace: ConsoleLog;
  static info: ConsoleLog;
  static warn: ConsoleLog;
  static error: ConsoleLog;

  private static proxyMethodsCreated: boolean | undefined;

  private static shouldLog(): boolean {
    try {
      if (
        typeof window === 'undefined' ||
        typeof window.localStorage === 'undefined'
      ) {
        return false;
      }
      const level = window.localStorage.getItem('loglevel');
      if (level && level.toLowerCase() === 'trace') {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
      return false;
    }
  }

  public static setLevel(level: string) {
    if (
      typeof window === 'undefined' ||
      typeof window.localStorage === 'undefined'
    ) {
      return;
    }
    try {
      window.localStorage.setItem('loglevel', level);
      Log.proxyMethodsCreated = undefined;
      Log.createProxyMethods();
    } catch (e) {
      /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
      return;
    }
  }

  public static createProxyMethods() {
    if (typeof Log.proxyMethodsCreated !== 'undefined') {
      return;
    } else {
      Log.proxyMethodsCreated = true;
    }

    const methods = {
      log: 'debug',
      trace: 'trace',
      info: 'info',
      warn: 'warn',
      error: 'error',
    } as const;
    for (const nativeMethod of Object.keys(
      methods,
    ) as (keyof typeof methods)[]) {
      const nativeMethodExists = typeof console[nativeMethod] !== 'undefined';
      const methodToMapTo = methods[nativeMethod];
      const shouldMap =
        nativeMethodExists &&
        (LOGGING || Log.shouldLog() || methodToMapTo === 'error');

      if (shouldMap) {
        Log[methodToMapTo] = console[nativeMethod].bind(console);
      } else {
        // We want to skip logging, so this is internally an empty function.
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        Log[methodToMapTo] = function () {};
      }
    }
  }
}

Log.createProxyMethods();
