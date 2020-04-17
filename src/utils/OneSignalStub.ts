// NOTE: This is used with the OneSignalSDK.js shim
// Careful if adding imports, ES5 targets can't clean up functions never called.

export type PossiblePredefinedOneSignal = Array<Object[] | Function> | undefined | null;

export abstract class OneSignalStub<T> implements IndexableByString<any> {
  public VERSION = (typeof __VERSION__) === "undefined" ? 1 : Number(__VERSION__);
  public SERVICE_WORKER_UPDATER_PATH: string | undefined;
  public SERVICE_WORKER_PATH: string | undefined;
  public SERVICE_WORKER_PARAM: { scope: string } | undefined;

  [key: string]: any;

  public currentLogLevel: string | undefined;
  public log = {
    setLevel: (level: string): void => {
      this.currentLogLevel = level;
    }
  };

  private static FUNCTION_LIST_TO_STUB = [
    "on",
    "off",
    "once",
    "push"
  ];

  private static FUNCTION_LIST_WITH_PROMISE_TO_STUB = [
    "init",
    "_initHttp",
    "isPushNotificationsEnabled",
    "showHttpPrompt",
    "registerForPushNotifications",
    "setDefaultNotificationUrl",
    "setDefaultTitle",
    "syncHashedEmail",
    "getTags",
    "sendTag",
    "sendTags",
    "deleteTag",
    "deleteTags",
    "addListenerForNotificationOpened",
    "getIdsAvailable",
    "setSubscription",
    "showHttpPermissionRequest",
    "showNativePrompt",
    "showSlidedownPrompt",
    "showDelayedPrompt",
    "getNotificationPermission",
    "getUserId",
    "getRegistrationId",
    "getSubscription",
    "sendSelfNotification",
    "setEmail",
    "logoutEmail",
    "setExternalUserId",
    "removeExternalUserId",
    "getExternalUserId",
    "provideUserConsent",
    "isOptedOut",
    "getEmailId",
    "sendOutcome"
  ];

  public abstract isPushNotificationsSupported(): boolean;

  // Methods to be implemented by ES5 or ES6 implementation.
  // Includes thisObj as the "this" variable other we it's context through setupStubFunctions
  protected abstract stubFunction(thisObj: T, functionName: string, args: any[]): any;
  protected abstract stubPromiseFunction(thisObj: T, functionName: string, args: any[]): Promise<any>;

  protected constructor(omitStubsFor: Array<string>) {
    this.setupStubFunctions(OneSignalStub.FUNCTION_LIST_TO_STUB, this.stubFunction, omitStubsFor);
    this.setupStubFunctions(OneSignalStub.FUNCTION_LIST_WITH_PROMISE_TO_STUB, this.stubPromiseFunction, omitStubsFor);
  }

  private setupStubFunctions(stubList: Array<string>, stubFunction: Function, omitStubsFor: Array<string>) {
    for(const functionName of stubList) {
      if (omitStubsFor.indexOf(functionName) > -1)
        continue;

      const functionNameWithStub =
        (...args: any[]): any => {
          return stubFunction(this, functionName, args);
        };

      Object.defineProperty(this, functionName, { value: functionNameWithStub });
    }
  }
}
