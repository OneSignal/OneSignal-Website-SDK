import { TestEnvironmentKind } from '../models/TestEnvironmentKind';

export default class Log {
  static debug: Function;
  static trace: Function;
  static info: Function;
  static warn: Function;
  static error: Function;

  private static proxyMethodsCreated: boolean;

  public static createProxyMethods() {
    if (typeof this.proxyMethodsCreated !== "undefined") {
      return;
    } else {
      this.proxyMethodsCreated = true;
    }

    const methods = {
      "log": "debug",
      "trace": "trace",
      "info": "info",
      "warn": "warn",
      "error": "error"
    };
    for (const nativeMethod of Object.keys(methods)) {
      const nativeMethodExists = typeof console[nativeMethod] !== "undefined";
      const methodToMapTo = methods[nativeMethod];
      const shouldMap = nativeMethodExists;

      if (shouldMap) {
        this[methodToMapTo] = console[nativeMethod].bind(console);
      } else {
        this[methodToMapTo] = function() {};
      }
    }
  }
}

Log.createProxyMethods();
