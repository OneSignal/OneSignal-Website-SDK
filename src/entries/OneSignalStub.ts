// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.

export default class OneSignalStub {

  public static promiseStub() {
    return {
      then: OneSignalStub.promiseStub,
      catch: OneSignalStub.promiseStub
    };
  }

  public static get log() {
    return {
      setLevel: function() {}
    };
  }

  public static isPushNotificationsSupported(): boolean {
    return false;
  }

  public static isPushNotificationsEnabled(): boolean {
    return false;
  }

  public static push(item: Function | any[]): void {
    if (typeof(item) == "function")
      item();
    else {
      const functionName = item.shift();
      OneSignal[functionName].apply(null, item);
    }
  }

  static VERSION(): number {
    return (typeof __VERSION__ === "undefined" ? 1 : Number(__VERSION__));
  }
}

export function oneSignalSdkInitStubs(): void {

  const untypedOneSignalStub = OneSignalStub as any;

  untypedOneSignalStub.init = untypedOneSignalStub.showHttpPrompt
    = untypedOneSignalStub.registerForPushNotifications
    = untypedOneSignalStub.showHttpPermissionRequest
    = untypedOneSignalStub.getNotificationPermission
    = untypedOneSignalStub.on
    = untypedOneSignalStub.off
    = untypedOneSignalStub.once
    = untypedOneSignalStub.config
    = untypedOneSignalStub.SERVICE_WORKER_PATH
    = untypedOneSignalStub.SERVICE_WORKER_UPDATER_PATH
    = untypedOneSignalStub.checkAndWipeUserSubscription
    = untypedOneSignalStub.subscriptionBell
    = untypedOneSignalStub.notifyButton
    = function () {
  };

  untypedOneSignalStub.setDefaultNotificationUrl = untypedOneSignalStub.setDefaultTitle
    = untypedOneSignalStub.syncHashedEmail
    = untypedOneSignalStub.getTags
    = untypedOneSignalStub.sendTag
    = untypedOneSignalStub.sendTags
    = untypedOneSignalStub.deleteTag
    = untypedOneSignalStub.deleteTags
    = untypedOneSignalStub.addListenerForNotificationOpened
    = untypedOneSignalStub.getIdsAvailable
    = untypedOneSignalStub.setSubscription
    = untypedOneSignalStub.getUserId
    = untypedOneSignalStub.getRegistrationId
    = untypedOneSignalStub.getSubscription
    = untypedOneSignalStub.sendSelfNotification
    = untypedOneSignalStub.setEmail
    = untypedOneSignalStub.logoutEmail
    = untypedOneSignalStub.promiseStub;

  let predefinedOneSignalPushes: Function[] | object[] | undefined;
  if (typeof OneSignal !== "undefined") {
    predefinedOneSignalPushes = OneSignal;
  }

  (window as any).OneSignal = OneSignalStub;

  function processPredefinedOneSignalPushes(predefinedOneSignalPushes: Function[] | object[] | undefined): void {
    if (!predefinedOneSignalPushes)
      return;
    if (!Array.isArray(predefinedOneSignalPushes)) {
      return;
    }

    for (const item of predefinedOneSignalPushes) {
      try {
        OneSignal.push(item);
      } catch (e) {
        // Catch and log error here so other elements still run
        console.error(e);
      }
    }
  }

  processPredefinedOneSignalPushes(predefinedOneSignalPushes);
}

// Only if running on page in browser
if (typeof window !== "undefined")
  oneSignalSdkInitStubs();
