
export default class OneSignalStub {

  static promiseStub() {
    return {
      then: OneSignalStub.promiseStub,
      catch: OneSignalStub.promiseStub
    }
  }

  static get log() {
    return {
      setLevel: function() {}
    }
  }

  static isPushNotificationsSupported() {
    return false;
  }

  static push(item) {
    if (typeof(item) == "function")
      item();
    else {
      var functionName = item.shift();
      OneSignal[functionName].apply(null, item);
    }
  }
}

var untypedOneSignalStub = OneSignalStub as any;

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
  = function() { };

untypedOneSignalStub.setDefaultNotificationUrl = untypedOneSignalStub.setDefaultTitle
  = untypedOneSignalStub.syncHashedEmail
  = untypedOneSignalStub.getTags
  = untypedOneSignalStub.sendTag
  = untypedOneSignalStub.sendTags
  = untypedOneSignalStub.deleteTag
  = untypedOneSignalStub.deleteTags
  = untypedOneSignalStub.addListenerForNotificationOpened
  = untypedOneSignalStub.getIdsAvailable
  = untypedOneSignalStub.isPushNotificationsEnabled
  = untypedOneSignalStub.setSubscription
  = untypedOneSignalStub.getUserId
  = untypedOneSignalStub.getRegistrationId
  = untypedOneSignalStub.getSubscription
  = untypedOneSignalStub.sendSelfNotification
  = untypedOneSignalStub.promiseStub;
