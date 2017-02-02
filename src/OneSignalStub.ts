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

OneSignalStub.init = OneSignalStub.showHttpPrompt
                   = OneSignalStub.registerForPushNotifications
                   = OneSignalStub.showHttpPermissionRequest
                   = OneSignalStub.getNotificationPermission
                   = OneSignalStub.on
                   = OneSignalStub.off
                   = OneSignalStub.once
                   = OneSignalStub.config
                   = OneSignalStub.SERVICE_WORKER_PATH
                   = OneSignalStub.SERVICE_WORKER_UPDATER_PATH
                   = OneSignalStub.checkAndWipeUserSubscription
                   = OneSignalStub.subscriptionBell
                   = OneSignalStub.notifyButton
                   = function() { };

OneSignalStub.setDefaultNotificationUrl = OneSignalStub.setDefaultTitle
                                        = OneSignalStub.syncHashedEmail
                                        = OneSignalStub.getTags
                                        = OneSignalStub.sendTag
                                        = OneSignalStub.sendTags
                                        = OneSignalStub.deleteTag
                                        = OneSignalStub.deleteTags
                                        = OneSignalStub.addListenerForNotificationOpened
                                        = OneSignalStub.getIdsAvailable
                                        = OneSignalStub.isPushNotificationsEnabled
                                        = OneSignalStub.setSubscription
                                        = OneSignalStub.getUserId
                                        = OneSignalStub.getRegistrationId
                                        = OneSignalStub.getSubscription
                                        = OneSignalStub.sendSelfNotification
                                        = OneSignalStub.promiseStub;

module.exports = OneSignalStub;