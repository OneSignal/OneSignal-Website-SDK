import NotImplementedError from '../../../../src/errors/NotImplementedError';
import ServiceWorker from './ServiceWorker';
import ServiceWorkerRegistration from './models/ServiceWorkerRegistration';
import { EventHandler } from "../../../../src/libraries/Emitter";
import ExtendableEvent from "./models/ExtendableEvent";

export class ServiceWorkerContainer implements EventTarget {
  private resolveReadyPromise: Function;
  private readyPromise: Promise<ServiceWorkerRegistration>;
  private serviceWorker: ServiceWorker;
  private listeners: Map<string, EventHandler[]>;

  public controller: ServiceWorker;
  public serviceWorkerRegistration: ServiceWorkerRegistration;

  constructor() {
    this.serviceWorkerRegistration = null;
    this.readyPromise = new Promise(resolve => (this.resolveReadyPromise = resolve));
    this.listeners = new Map();
    this.controller = null;
  }

  public get ready(): Promise<ServiceWorkerRegistration> {
    return this.readyPromise;
  }

  public async register(scriptURL: string, options?: RegistrationOptions): Promise<ServiceWorkerRegistration> {
    if (scriptURL.startsWith('/')) {
      const fakeScriptUrl = new URL(window.location.toString());
      scriptURL = fakeScriptUrl.origin + scriptURL;
    }
    this.serviceWorkerRegistration = new ServiceWorkerRegistration();
    this.serviceWorker = new ServiceWorker();
    (this.serviceWorker as any).scriptURL = scriptURL;
    (this.serviceWorker as any).state = 'activated';
    this.serviceWorkerRegistration.active = this.serviceWorker;
    this.resolveReadyPromise(this.serviceWorkerRegistration);
    this.controller = this.serviceWorker;
    return await this.serviceWorkerRegistration;
  }

  public async getRegistration(clientURL: string = ''): Promise<ServiceWorkerRegistration> {
    return this.serviceWorkerRegistration;
  }

  public async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
    if (this.serviceWorkerRegistration) {
      return [this.serviceWorkerRegistration];
    } else {
      return [];
    }
  }

  public addEventListener(eventName: string, callback: EventHandler) {
    if (this.listeners.has(eventName)) {
      const handlers = this.listeners.get(eventName);
      handlers.push(callback);
      this.listeners.set(eventName, handlers);
    } else {
      this.listeners.set(eventName, [callback]);
    }
  }

  public removeEventListener(eventName: string, callback: EventHandler) {
    if (this.listeners.has(eventName)) {
      const handlers = this.listeners.get(eventName);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
        this.listeners.set(eventName, handlers);
      }
    }
  }

  public dispatchEvent(event: Event): boolean {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
      return true;
    } else {
      return false;
    }
  }
  // EventHandler oncontrollerchange;
  // EventHandler onmessage; // event.source of message events is ServiceWorker object
  // EventHandler onmessageerror;
}
