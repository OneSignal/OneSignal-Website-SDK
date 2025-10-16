import { IS_SERVICE_WORKER, LOGGING } from '../utils/env';

function shouldLog(): boolean {
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
export function setLevel(level: string) {
  if (IS_SERVICE_WORKER) return;

  /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
  try {
    window.localStorage.setItem('loglevel', level);
  } catch (e) {
    console.error(e);
  }
}

function createLogMethod(consoleMethod: keyof Console) {
  return (...args: unknown[]): void => {
    if (LOGGING || shouldLog() || consoleMethod === 'error') {
      (console[consoleMethod] as (...args: unknown[]) => void)(...args);
    }
  };
}

const debug = createLogMethod('debug');
const info = createLogMethod('info');
const warn = createLogMethod('warn');
const error = createLogMethod('error');

export { debug, error, info, warn };
