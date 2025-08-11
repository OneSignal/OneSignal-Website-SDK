export default class Log {
  static debug(...args: any[]): void {
      console.debug(...args);
  }
  static trace(...args: any[]): void {
      console.trace(...args);
  }
  static info(...args: any[]): void {
      console.info(...args);
  }
  static warn(...args: any[]): void {
      console.warn(...args);
  }
  static error(...args: any[]): void {
      console.error(...args);
  }
}