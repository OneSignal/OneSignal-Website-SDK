import { MockServiceWorkerRegistration } from "./MockServiceWorkerRegistration";
import { MockWorkerNavigator } from "./MockWorkerNavigator";
import { DispatchEventUtil } from "../utils/DispatchEventUtil";
import { MockClients } from "./MockClients";
import NotImplementedError from "../../../../../src/errors/NotImplementedError";


/**
 * NOTE: Some of the methods are defined from ployfill.ts, NodeJS.Global, or other places
 * Check if addServiceWorkerGlobalScopeToGlobal is omitting them if additional logic is added here.
  */

export class MockServiceWorkerGlobalScope implements ServiceWorkerGlobalScope {
  public registration: ServiceWorkerRegistration = new MockServiceWorkerRegistration();
  private dispatchEventUtil: DispatchEventUtil = new DispatchEventUtil();

  get mockRegistration(): MockServiceWorkerRegistration {
    return this.registration;
  }

  readonly caches: CacheStorage;
  readonly clients: Clients = new MockClients();
  readonly console: Console;
  readonly indexedDB: IDBFactory;
  readonly isSecureContext: boolean;
  readonly location: WorkerLocation;
  readonly msIndexedDB: IDBFactory;
  readonly navigator: WorkerNavigator = new MockWorkerNavigator(
      "Mozilla",
      "Netscape",
      "5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36",
      "MacIntel",
      "Gecko",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.167 Safari/537.36"
    );


  onactivate: ((this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => any) | null = null;
  onerror: ((this: WorkerGlobalScope, ev: ErrorEvent) => any) | null = null;
  onfetch: ((this: ServiceWorkerGlobalScope, ev: FetchEvent) => any) | null = null;
  oninstall: ((this: ServiceWorkerGlobalScope, ev: ExtendableEvent) => any) | null = null;
  onmessage: ((this: ServiceWorkerGlobalScope, ev: ExtendableMessageEvent) => any) | null = null;
  onmessageerror: ((this: ServiceWorkerGlobalScope, ev: MessageEvent) => any) | null = null;
  onnotificationclick: ((this: ServiceWorkerGlobalScope, ev: NotificationEvent) => any) | null = null;
  onnotificationclose: ((this: ServiceWorkerGlobalScope, ev: NotificationEvent) => any) | null = null;
  onpush: ((this: ServiceWorkerGlobalScope, ev: PushEvent) => any) | null = null;
  onpushsubscriptionchange: ((this: ServiceWorkerGlobalScope, ev: PushSubscriptionChangeEvent) => any) | null = null;
  onsync: ((this: ServiceWorkerGlobalScope, ev: SyncEvent) => any) | null = null;

  readonly performance: Performance;
  readonly self: WorkerGlobalScope;

  addEventListener<K extends keyof ServiceWorkerGlobalScopeEventMap>(type: K, listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener<K extends keyof WorkerGlobalScopeEventMap>(type: K, listener: (this: WorkerGlobalScope, ev: WorkerGlobalScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
    this.dispatchEventUtil.addEventListener(type, listener, options);
  }

  atob(_encodedString: string): string {
    // ployfill.ts is used instead
    throw new NotImplementedError();
  }

  btoa(_rawString: string): string {
    // ployfill.ts is used instead
    throw new NotImplementedError();
  }

  clearImmediate(_handle: number): void {
    throw new NotImplementedError();
  }

  clearInterval(_handle: number): void {
    throw new NotImplementedError();
  }

  clearTimeout(_handle: number): void {
    throw new NotImplementedError();
  }

  createImageBitmap(image: ImageBitmap | ImageData | Blob, options?: ImageBitmapOptions): Promise<ImageBitmap>;
  createImageBitmap(image: ImageBitmap | ImageData | Blob, sx: number, sy: number, sw: number, sh: number, options?: ImageBitmapOptions): Promise<ImageBitmap>;
  createImageBitmap(_image: ImageBitmap | ImageData | Blob, _options?: ImageBitmapOptions | number, _sy?: number, _sw?: number, _sh?: number, _options2?: ImageBitmapOptions): Promise<ImageBitmap> {
    throw new NotImplementedError();
  }

  dispatchEvent(evt: Event): boolean {
    return this.dispatchEventUtil.dispatchEvent(evt);
  }

  fetch(_input?: Request | string, _init?: RequestInit): Promise<Response> {
    // ployfill.ts is used instead
    throw new NotImplementedError();
  }

  importScripts(..._urls: string[]): void {
    throw new NotImplementedError();
  }

  msWriteProfilerMark(_profilerMarkName: string): void {
    throw new NotImplementedError();
  }

  removeEventListener<K extends keyof ServiceWorkerGlobalScopeEventMap>(type: K, listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener<K extends keyof WorkerGlobalScopeEventMap>(type: K, listener: (this: WorkerGlobalScope, ev: WorkerGlobalScopeEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener?: EventListener | EventListenerObject | null, options?: EventListenerOptions | boolean): void {
    this.dispatchEventUtil.removeEventListener(type, listener, options);
  }

  setImmediate(_handler: any, ..._args: any[]): number {
    throw new NotImplementedError();
  }

  setInterval(_handler: any, _timeout?: any, ..._args: any[]): number {
    throw new NotImplementedError();
  }

  setTimeout(_handler: any, _timeout?: any, ..._args: any[]): number {
    throw new NotImplementedError();
  }

  async skipWaiting(): Promise<void> {
    throw new NotImplementedError();
  }

}
