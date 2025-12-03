import { MockServiceWorkerGlobalScope } from "../mocks/service-workers/models/MockServiceWorkerGlobalScope";

// NodeJS.Global
declare var global: any;

global.URL = require('url').URL;
global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require("fake-indexeddb/lib/FDBKeyRange");
global.Headers = require('./Headers');

global.btoa = function(str: string | Buffer) {
  let buffer;
  if (str instanceof Buffer)
    buffer = str;
  else
    buffer = new Buffer(str.toString(), 'binary');

  return buffer.toString('base64');
};
global.atob = function(str: string) {
  return new Buffer(str, 'base64').toString('binary');
};

// Add any methods from ServiceWorkerGlobalScope to NodeJS's global if they don't exist already
export function addServiceWorkerGlobalScopeToGlobal(serviceWorkerScope: ServiceWorkerGlobalScope): void {
  for (const key of Object.keys(serviceWorkerScope)) {
    const descriptor = Object.getOwnPropertyDescriptor(global, key);

    // Skip keys that exist and are not writable
    if (descriptor && !descriptor.writable) continue;

    // Skip non-configurable properties (navigator etc.)
    if (descriptor && !descriptor.configurable) continue;

    // Safe to define
    Object.defineProperty(global, key, {
      value: serviceWorkerScope[key],
      writable: true,
      configurable: true,
      enumerable: true
    });
  }

  // Install prototype methods too (but skip existing built-ins)
  const protoKeys = Object.getOwnPropertyNames(MockServiceWorkerGlobalScope.prototype);
  for (const key of protoKeys) {
    if (key === "constructor") continue;

    const descriptor = Object.getOwnPropertyDescriptor(global, key);
    if (descriptor && !descriptor.configurable) continue;

    if (!(key in global)) {
      Object.defineProperty(global, key, {
        value: serviceWorkerScope[key],
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
}
