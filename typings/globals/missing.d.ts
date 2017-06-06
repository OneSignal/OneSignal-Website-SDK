interface Navigator {
  permissions: any;
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
}

type ServiceWorkerState = "installing" | "installed" | "activating" | "activated" | "redundant";

interface TestContext {
  context: any;
}

declare module ExtendableError {
}

declare var OneSignal: any;

declare var ExtendableEvent;
declare var swivel;

declare var __VERSION__: string;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var __IS_ES6__: string;

declare var $_VERSION: string;
declare var $_DEV: string;
declare var $_TEST: string;
declare var $_STAGING: string;
declare var $_IS_ES6: string;

declare function fetch(...args): Promise<any>;

declare var Headers: any;
declare var WorkerLocation: any;
