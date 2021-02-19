import { DispatchEventUtil } from "../utils/DispatchEventUtil";
import { MockServiceWorker } from "./MockServiceWorker";
import { MockServiceWorkerRegistration } from "./MockServiceWorkerRegistration";

// abstract to indicate this isn't designed to be used directly as part of the tests. (expect for the meta one)
// This is a generic mock.
//   - no OneSignal specifics, see MockServiceWorkerContainerWithAPIBan
export abstract class MockServiceWorkerContainer implements ServiceWorkerContainer {
  protected _controller: ServiceWorker | null;
  get controller(): ServiceWorker | null {
    return this._controller;
  }

  get ready(): Promise<ServiceWorkerRegistration> {
    return new Promise<ServiceWorkerRegistration>(resolve => (resolve(new MockServiceWorkerRegistration())));
  }
  
  set oncontrollerchange(event: ((this: ServiceWorkerContainer, ev: Event) => any) | null) {
  }

  onmessage: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null;
  onmessageerror: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null;

  private dispatchEventUtil: DispatchEventUtil = new DispatchEventUtil();
  public serviceWorkerRegistration: ServiceWorkerRegistration | null;

  constructor() {
    this.serviceWorkerRegistration = null;
    this._controller = null;
    this.onmessage = null;
    this.onmessageerror = null;
  }

  addEventListener<K extends keyof ServiceWorkerContainerEventMap>(type: K, listener: (this: ServiceWorkerContainer, ev: ServiceWorkerContainerEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void {
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
 
    this._controller = mockSw;

    const swReg = new MockServiceWorkerRegistration();
    swReg.active = this._controller;
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
