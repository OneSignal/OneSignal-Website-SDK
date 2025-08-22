import { isServiceWorker } from 'src/shared/environment/detect';
import { LOGGING } from '../../utils/EnvVariables';

export default class LogBase {
  private static shouldLog(): boolean {
    if (isServiceWorker(self)) return !!self.shouldLog;
    try {
      /* LocalStorage may not be accessible on browser profiles that restrict 3rd party cookies */
      const level = window.localStorage.getItem('loglevel');
      return level?.toLowerCase() === 'trace';
    } catch (e) {
      return false;
    }
  }

  private static createLogMethod(consoleMethod: keyof Console) {
    return (...args: unknown[]): void => {
      if (LOGGING || this.shouldLog() || consoleMethod === 'error') {
        (console[consoleMethod] as (...args: unknown[]) => void)(...args);
      }
    };
  }
  static debug = LogBase.createLogMethod('debug');
  static info = LogBase.createLogMethod('info');
  static warn = LogBase.createLogMethod('warn');
  static error = LogBase.createLogMethod('error');
}
