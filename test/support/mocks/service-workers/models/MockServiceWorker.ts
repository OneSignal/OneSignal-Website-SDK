import NotImplementedError from "../../../../../src/errors/NotImplementedError";

export class MockServiceWorker implements ServiceWorker {
  scriptURL: string;
  state: ServiceWorkerState;

  constructor() {
  }

  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
  onstatechange: ((this: ServiceWorker, ev: Event) => any) | null;

  addEventListener<K extends keyof ServiceWorkerEventMap>(type: K, listener: (this: ServiceWorker, ev: ServiceWorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  addEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject | null, _options?: boolean | AddEventListenerOptions): void {
    throw new NotImplementedError();
  }

  dispatchEvent(_evt: Event): boolean {
    throw new NotImplementedError();
  }

  postMessage(message: any, transfer: Array<Transferable> | PostMessageOptions): void {
  }

  removeEventListener<K extends keyof ServiceWorkerEventMap>(type: K, listener: (this: ServiceWorker, ev: ServiceWorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener?: EventListener | EventListenerObject | null, options?: EventListenerOptions | boolean): void;
  removeEventListener<K extends keyof AbstractWorkerEventMap>(type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(_type: string, _listener?: EventListenerOrEventListenerObject | null, _options?: boolean | EventListenerOptions): void {
    throw new NotImplementedError();
  }
}
