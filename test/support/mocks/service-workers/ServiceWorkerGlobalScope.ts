import CacheStorage from './models/CacheStorage';
import Clients from './models/Clients';
import ServiceWorkerRegistration from './models/ServiceWorkerRegistration';
import { handleEvents } from './utils/events';

export default class ServiceWorkerGlobalScope {

  public clients: Clients;
  public registration: ServiceWorkerRegistration;
  public caches: CacheStorage;
  public listeners: any;

  constructor() {
    this.clients = new Clients();
    this.registration = new ServiceWorkerRegistration();
    this.caches = new CacheStorage();
    this.listeners = {};
  }

  async skipWaiting() { }

  addEventListener(name, callback) {
    if (!this.listeners[name]) {
      this.listeners[name] = [];
    }
    this.listeners[name].push(callback);
  }

  trigger(name, args) {
    if (this.listeners[name]) {
      return handleEvents(name, args, this.listeners[name]);
    } else return undefined;
  }

  snapshot() {
    return {
      caches: this.caches.snapshot(),
      clients: this.clients.snapshot(),
      notifications: this.registration.snapshot()
    };
  }
};
