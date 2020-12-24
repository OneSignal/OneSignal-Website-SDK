import { DispatchEventUtil } from "../utils/DispatchEventUtil";
import { MockServiceWorker } from "./MockServiceWorker";
import { MockServiceWorkerRegistration } from "./MockServiceWorkerRegistration";

export class MockServiceWorkerContainer implements ServiceWorkerContainer {
  controller: ServiceWorker | null;
  oncontrollerchange: ((this: ServiceWorkerContainer, ev: Event) => any) | null;
  onmessage: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null;
  onmessageerror: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null;
  readonly ready: Promise<ServiceWorkerRegistration>;

  private dispatchEventUtil: DispatchEventUtil = new DispatchEventUtil();
  public serviceWorkerRegistration: ServiceWorkerRegistration | null;

  constructor() {
    this.serviceWorkerRegistration = null;
    this.ready = new Promise<ServiceWorkerRegistration>(resolve => (resolve(new MockServiceWorkerRegistration())));
    this.controller = null;
    this.oncontrollerchange = null;
    this.onmessage = null;
    this.onmessageerror = null;
  }

  addEventListener<K extends keyof ServiceWorkerContainerEventMap>(type: K, listener: (this: ServiceWorkerContainer, ev: ServiceWorkerContainerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
    this.dispatchEventUtil.addEventListener(type, listener, options);
  }

  dispatchEvent(evt: Event): boolean {
    return this.dispatchEventUtil.dispatchEvent(evt);
  }

  async getRegistration(_clientURL?: string): Promise<ServiceWorkerRegistration | undefined> {
    return this.serviceWorkerRegistration || undefined;
  }

  async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
    if (this.serviceWorkerRegistration)
      return [this.serviceWorkerRegistration];
    return [];
  }

  async register(scriptURL: string, _options?: RegistrationOptions): Promise<ServiceWorkerRegistration> {
    if (scriptURL.startsWith('/')) {
      const fakeScriptUrl = new URL(window.location.toString());
      scriptURL = fakeScriptUrl.origin + scriptURL;
    }

    const mockSw = new MockServiceWorker();
    mockSw.scriptURL = scriptURL;
    mockSw.state = 'activated';
    this.controller = mockSw;

    const swReg = new MockServiceWorkerRegistration();
    swReg.active = this.controller;
    this.serviceWorkerRegistration = swReg;

    return this.serviceWorkerRegistration;
  }

  removeEventListener<K extends keyof ServiceWorkerContainerEventMap>(type: K, listener: (this: ServiceWorkerContainer, ev: ServiceWorkerContainerEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener?: EventListener | EventListenerObject | null, options?: EventListenerOptions | boolean): void;
  removeEventListener(type: string, listener?: EventListener | EventListenerObject | null, options?: boolean | EventListenerOptions): void {
    this.dispatchEventUtil.removeEventListener(type, listener, options);
  }

  startMessages(): void {
  }

}
