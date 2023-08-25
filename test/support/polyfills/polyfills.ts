import fetch from 'node-fetch';
import { MockServiceWorkerGlobalScope } from "../mocks/service-workers/models/MockServiceWorkerGlobalScope";

// NodeJS.Global
declare let global: any;

global.URL = require('url').URL;
global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require("fake-indexeddb/lib/FDBKeyRange");
global.Headers = require('./Headers');
global.fetch = fetch;

global.btoa = function(str: string | Buffer) {
  let buffer;
  if (str instanceof Buffer)
    buffer = str;
  else
    buffer = Buffer.from(str.toString(), 'binary'); // Use Buffer.from() instead of new Buffer()

  return buffer.toString('base64');
};
global.atob = function(str: string) {
  return Buffer.from(str, 'base64').toString('binary'); // Use Buffer.from() instead of new Buffer()
};

// Add any methods from ServiceWorkerGlobalScope to NodeJS's global if they don't exist already
export function addServiceWorkerGlobalScopeToGlobal(serviceWorkerGlobalScope: ServiceWorkerGlobalScope): void {
  global = Object.assign(global, serviceWorkerGlobalScope);
  const props = Object.getOwnPropertyNames(MockServiceWorkerGlobalScope.prototype);
  for(const propName of props) {
    // Do NOT replace any existing stubs or default NodeJS global methods
    if (!!global[propName])
      continue;

    // Add method to NodeJS global
    global[propName] = (<any>serviceWorkerGlobalScope)[propName];
  }
}
