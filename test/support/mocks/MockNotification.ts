// This is a mock for the w3c Notification
export default class MockNotification implements Notification {
  readonly body: string;
  readonly data: any;
  readonly dir: NotificationDirection;
  readonly icon: string;
  readonly image: string;
  readonly renotify: boolean;
  readonly requireInteraction: boolean;
  readonly vibrate: number[];
  readonly silent: boolean;
  readonly timestamp: number;
  readonly lang: string;
  readonly actions: NotificationAction[];
  readonly badge: string;
  onclick: ((this: Notification, ev: Event) => any) | null;
  onclose: ((this: Notification, ev: Event) => any) | null;
  onerror: ((this: Notification, ev: Event) => any) | null;
  onshow: ((this: Notification, ev: Event) => any) | null;
  readonly tag: string;
  readonly title: string;
  static permission: NotificationPermission = "default";

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.data = options && options.data;
    this.actions = [];
    this.body = "";
    this.dir = "auto";
    this.icon = "";
    this.image = "";
    this.badge = "";
    this.lang = "";
    this.renotify = false;
    this.requireInteraction = false;
    this.silent = false;
    this.timestamp = 0;
    this.vibrate = [];
    this.onclick = null;
    this.onclose = null;
    this.onerror = null;
    this.onshow = null;
    this.tag = "";
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
  
  static async requestPermission(callback?: NotificationPermissionCallback | undefined): Promise<NotificationPermission> {
    if (callback) {
      callback(MockNotification.permission);
    }
    return MockNotification.permission;
  }
}
