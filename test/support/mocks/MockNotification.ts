// This is a mock for the w3c Notification
// NOTE: permission & requestPermission should be static however this was defined wrong in TS 2.x
//       This ws later fixed in newer TypeScript versions
export default class MockNotification implements Notification {
  readonly body: string | null;
  readonly data: any;
  readonly dir: NotificationDirection;
  readonly icon: string | null;
  readonly lang: string | null;
  onclick: ((this: Notification, ev: Event) => any) | null;
  onclose: ((this: Notification, ev: Event) => any) | null;
  onerror: ((this: Notification, ev: Event) => any) | null;
  onshow: ((this: Notification, ev: Event) => any) | null;
  readonly permission: NotificationPermission;
  readonly tag: string | null;
  readonly title: string;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.data = options && options.data;

    this.body = null;
    this.dir = "auto";
    this.icon = null;
    this.lang = null;
    this.onclick = null;
    this.onclose = null;
    this.onerror = null;
    this.onshow = null;
    this.tag = null;
    this.permission = "granted";
  }

  addEventListener<K extends keyof NotificationEventMap>(
    type: K,
    listener: (this: Notification, ev: NotificationEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions): void;
  addEventListener(_type: any, _listener: any, _options?: boolean | AddEventListenerOptions): void {
  }

  close(): void { }

  dispatchEvent(_evt: Event): boolean {
    return false;
  }

  removeEventListener<K extends keyof NotificationEventMap>(
    type: K,
    listener: (this: Notification, ev: NotificationEventMap[K]) => any,
    options?: boolean | EventListenerOptions): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions): void;
  removeEventListener(
    type: string,
    listener?: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean): void;
  removeEventListener(
    _type: any,
    _listener?: any,
    _options?: boolean | EventListenerOptions): void { }

  requestPermission(_callback?: NotificationPermissionCallback | undefined): Promise<NotificationPermission> {
    // Defined in TestEnvironment.ts:stubNotification
    throw new Error("Method not implemented.");
  }
}
