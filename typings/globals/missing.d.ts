/**
 * START: Permission Definitions added in TypeScript 3.5.1
 */
interface PermissionStatusEventMap {
  "change": Event;
}

interface PermissionStatus extends EventTarget {
  onchange: ((this: PermissionStatus, ev: Event) => any) | null;
  readonly state: PermissionState;
  addEventListener<K extends keyof PermissionStatusEventMap>(type: K, listener: (this: PermissionStatus, ev: PermissionStatusEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof PermissionStatusEventMap>(type: K, listener: (this: PermissionStatus, ev: PermissionStatusEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

declare var PermissionStatus: {
  prototype: PermissionStatus;
  new(): PermissionStatus;
};

interface Permissions {
  query(permissionDesc: PermissionDescriptor | DevicePermissionDescriptor | MidiPermissionDescriptor | PushPermissionDescriptor): Promise<PermissionStatus>;
}

declare var Permissions: {
  prototype: Permissions;
  new(): Permissions;
};

interface Navigator {
  readonly permissions: Permissions;
}

/**
 * END: Permission Definitions
 */


// FrameType - added in TypeScript 3.5.1
//   https://github.com/microsoft/TypeScript/blob/v3.5.1/lib/lib.webworker.d.ts
type FrameType = "auxiliary" | "top-level" | "nested" | "none";
interface Client {
  readonly frameType: FrameType;
}

// Notification.requestPermission - Added in TypeScript 3.0.0
interface Notification {
  readonly permission: NotificationPermission;
  requestPermission(callback?: NotificationPermissionCallback): Promise<NotificationPermission>;
}

/**
 * START: window.safari definition
 * https://developer.apple.com/documentation/safariextensions
 */
interface SafariRemoteNotificationPermission {
  readonly deviceToken: string | null | undefined;
  readonly permission: string;
}

interface SafariRemoteNotification {
  permission(bundleIdentifier: string): SafariRemoteNotificationPermission;
  requestPermission(
    webAPIURL: string,
    websiteIdentifier: string,
    queryParameterDictionary: any,
    callback: Function
  ): void;
}

interface Window {
  Notification: Notification;
  safari: {
    pushNotification: SafariRemoteNotification
  };
}

/**
 * END: window.safari definition
 */


declare var OneSignal: any;


// These __*__ variables are defined from Webpack to change resulting JS
declare var __VERSION__: string;
declare var __BUILD_TYPE__: string;
declare var __BUILD_ORIGIN__: string;
declare var __API_TYPE__: string;
declare var __API_ORIGIN__: string;
declare var __IS_HTTPS__: boolean;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var __IS_ES6__: string;
declare var __SRC_STYLESHEETS_MD5_HASH__: string;

declare var __LOGGING__: boolean;
