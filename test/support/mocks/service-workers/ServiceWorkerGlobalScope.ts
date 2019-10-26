import CacheStorage from './models/CacheStorage';
import Clients from './models/Clients';
import ServiceWorkerRegistration from './models/ServiceWorkerRegistration';
import { EventHandler } from "../../../../src/libraries/Emitter";
import WorkerNavigator from './models/WorkerNavigator';

export default class ServiceWorkerGlobalScope implements EventTarget {

  /* Define methods ES5-style otherwise Object.assign(global, serviceWorkerGlobalScope) won't copy
  ES6 style methods */

  public clients: Clients;
  public registration: ServiceWorkerRegistration;
  public caches: CacheStorage;
  private listeners: Map<string, EventHandler[]>;
  public something: any;
  public skipWaiting;
  public addEventListener;
  public removeEventListener;
  public dispatchEvent;
  public navigator: WorkerNavigator;

  constructor() {
    this.clients = new Clients();
    this.registration = new ServiceWorkerRegistration();
    this.caches = new CacheStorage();
    this.listeners = new Map();
    this.navigator = new WorkerNavigator(
      "Mozilla",
      "Netscape",
      "5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36",
      "MacIntel",
      "Gecko",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36"
    );

    this.skipWaiting = async function() { };
    this.addEventListener = function(eventName: string, callback: EventHandler) {
      if (this.listeners.has(eventName)) {
        const handlers = this.listeners.get(eventName);
        handlers.push(callback);
        this.listeners.set(eventName, handlers);
      }
      else
        this.listeners.set(eventName, [callback]);
    };
    this.removeEventListener = function(eventName: string, callback: EventHandler) {
      if (this.listeners.has(eventName)) {
        const handlers = this.listeners.get(eventName);
        const index = handlers.indexOf(callback);
        if (index > -1) {
          handlers.splice(index, 1);
          this.listeners.set(eventName, handlers);
        }
      }
    };
    this.dispatchEvent = function(event: Event): boolean {
      const handlers = this.listeners.get(event.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(event);
        }
        return true;
      } else {
        return false;
      }
    };
  }

  snapshot() {
    return {
      caches: this.caches.snapshot(),
      clients: this.clients.snapshot(),
      notifications: this.registration.snapshot()
    };
  }
};
