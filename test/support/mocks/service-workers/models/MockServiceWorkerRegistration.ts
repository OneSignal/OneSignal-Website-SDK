import { MockPushManager } from "./MockPushManager";
import { MockServiceWorkerContainer } from "./MockServiceWorkerContainer";

export class MockServiceWorkerRegistration implements ServiceWorkerRegistration {
  active: ServiceWorker | null;
  installing: ServiceWorker | null;
  waiting: ServiceWorker | null;
  onupdatefound: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  readonly pushManager: PushManager;
  readonly sync: SyncManager;
  navigationPreload: NavigationPreloadManager;
  updateViaCache: ServiceWorkerUpdateViaCache;

  constructor() {
    this.active = null;
    this.installing = null;
    this.waiting = null;
    this.pushManager = new MockPushManager();
  }

  get scope(): string {
    return new URL(this.active.scriptURL).origin;
  }

  addEventListener<K extends keyof ServiceWorkerRegistrationEventMap>(type: K, listener: (this: ServiceWorkerRegistration, ev: ServiceWorkerRegistrationEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type, listener, options?: boolean | AddEventListenerOptions): void {
  }

  dispatchEvent(evt: Event): boolean {
    return false;
  }

  getNotifications(filter?: GetNotificationOptions): Promise<Notification[]> {
    return undefined;
  }

  removeEventListener<K extends keyof ServiceWorkerRegistrationEventMap>(type: K, listener: (this: ServiceWorkerRegistration, ev: ServiceWorkerRegistrationEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener | EventListenerObject, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener?: EventListener | EventListenerObject | null, options?: EventListenerOptions | boolean): void;
  removeEventListener(type, listener?, options?: boolean | EventListenerOptions): void {
  }

  showNotification(title: string, options?: NotificationOptions): Promise<void> {
    return undefined;
  }

  async unregister(): Promise<boolean> {
    const container = navigator.serviceWorker as MockServiceWorkerContainer;
    container.mockUnregister(new URL(this.scope).pathname);
    this.active = null;
    return true;
  }

  update(): Promise<void> {
    return undefined;
  }

}

