interface Navigator {
  permissions: any;
}

interface String {
    repeat(count: number): string
    substr(from: number, length?: number): string
}

interface Window {
  Notification: any;
  __POSTDATA: any;
  safari: {
    pushNotification: {
      permission: any;
      requestPermission: any;
    }
  }
}

interface ServiceWorkerClients {
  matchAll(options: ServiceWorkerClientsMatchOptions): Promise<Array<WindowClient>>;
}

interface WindowClient extends ServiceWorkerClient {
  /**
   * Loads a specified URL into a controlled client page.
   */
  navigate(url: string): Promise<WindowClient>;
}

interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): any;
  text(): string;
}

interface PushEvent {
  data?: PushMessageData
}

interface String {
  endsWith(...args): any;
}

interface ServiceWorkerGlobalScope {
  addEventListener(type: "push", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "notificationclose", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "notificationclick", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "install", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "activate", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "pushsubscriptionchange", listener: (this: this, ev: any) => any, ...args): void;
  addEventListener(type: "fetch", listener: (this: this, ev: any) => any, ...args): void;
  readonly location: Location;
}

interface TestContext {
  context: any;
}

declare module ExtendableError {
}

interface Element extends Node, GlobalEventHandlers, ElementTraversal, NodeSelector, ChildNode, ParentNode {
  addEventListener<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, optionsOruseCapture?: boolean | { passive: boolean }): void;
}

declare var OneSignal: any;

declare var ExtendableEvent;
declare var __VERSION__: string;
declare var __BUILD_TYPE__: string;
declare var __BUILD_ORIGIN__: string;
declare var __API_TYPE__: string;
declare var __API_ORIGIN__: string;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var __IS_ES6__: string;
declare var __SRC_STYLESHEETS_MD5_HASH__: string;

declare var __LOGGING__: boolean;

declare var WorkerLocation: any;
declare function fetch(...args): Promise<any>;

/* Typing issue */
interface SharedArrayBuffer { }

interface PushSubscription {
  /**
   * A push subscription may have an associated subscription expiration time. When set, it must be
   * the time, in milliseconds since 00:00:00 UTC on 1 January 1970, at which the subscription will
   * be deactivated. The user agent should attempt to refresh the push subscription before the
   * subscription expires.
   *
   * The expirationTime read-only property of the PushSubscription interface returns a
   * DOMHighResTimeStamp of the subscription expiration time associated with the push subscription,
   * if there is one, oor null otherwise.
   */
  expirationTime?: number;
}
