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

type ServiceWorkerState = "installing" | "installed" | "activating" | "activated" | "redundant";

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
declare var swivel;

declare var __VERSION__: string;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var __IS_ES6__: string;
declare var __SRC_STYLESHEETS_MD5_HASH__: string;

declare var $_VERSION: string;
declare var $_DEV: string;
declare var $_TEST: string;
declare var $_STAGING: string;
declare var $_IS_ES6: string;

declare function fetch(...args): Promise<any>;

declare var Headers: any;
declare var WorkerLocation: any;

/* Typing issue */
interface SharedArrayBuffer { };
