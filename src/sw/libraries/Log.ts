import { OSServiceWorkerFields } from '../serviceWorker/types';

declare let self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

export default class Log {
  static debug(...args: any[]): void {
    if (!!self.shouldLog) {
      console.debug(...args);
    }
  }
  static trace(...args: any[]): void {
    if (!!self.shouldLog) {
      console.trace(...args);
    }
  }
  static info(...args: any[]): void {
    if (!!self.shouldLog) {
      console.info(...args);
    }
  }
  static warn(...args: any[]): void {
    if (!!self.shouldLog) {
      console.warn(...args);
    }
  }
  static error(...args: any[]): void {
    if (!!self.shouldLog) {
      console.error(...args);
    }
  }
}
