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

interface String {
  endsWith(...args): any;
}

declare var swivel;

declare var __VERSION__: string;
declare var __DEV__: string;
declare var __TEST__: string;
declare var __STAGING__: string;
declare var DEV_PREFIX: string;
declare var STAGING_PREFIX: string;

declare function fetch(...args): Promise<any>;

declare var Headers: any;
declare var WorkerLocation: any;