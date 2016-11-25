import OneSignalApi from '../OneSignalApi';
import * as log from 'loglevel';
import LimitStore from '../LimitStore';
import Event from "../Event";
import Database from '../Database';
import * as Browser from 'bowser';
import {
  getConsoleStyle, contains, normalizeSubdomain, getDeviceTypeForBrowser, capitalize,
  isPushNotificationsSupported, getUrlQueryParam, executeAndTimeoutPromiseAfter, wipeLocalIndexedDb,
  unsubscribeFromPush, decodeHtmlEntities
} from '../utils';
import MainHelper from "./MainHelper";
import SubscriptionHelper from "./SubscriptionHelper";

declare var OneSignal: any;


export default class EventHelper {
  static onNotificationPermissionChange(event) {
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  static checkAndTriggerSubscriptionChanged() {
    log.info('Called %ccheckAndTriggerSubscriptionChanged', getConsoleStyle('code'));

    let _currentSubscription, _subscriptionChanged;
    Promise.all([
      OneSignal.isPushNotificationsEnabled(),
      Database.get('Options', 'isPushEnabled')
    ])
           .then(([currentSubscription, previousSubscription]) => {
             _currentSubscription = currentSubscription;
             let subscriptionChanged = (previousSubscription === null ||
             previousSubscription !== currentSubscription);
             _subscriptionChanged = subscriptionChanged;
             if (subscriptionChanged) {
               log.info('New Subscription:', currentSubscription);
               return Database.put('Options', {key: 'isPushEnabled', value: currentSubscription});
             }
           })
           .then(() => {
             if (_subscriptionChanged) {
               EventHelper.triggerSubscriptionChanged(_currentSubscription);
             }
           });
  }

  static _onSubscriptionChanged(newSubscriptionState) {
    if (OneSignal.__doNotShowWelcomeNotification) {
      log.debug('Not showing welcome notification because user state was reset.');
      return;
    }
    if (newSubscriptionState === true) {
      Promise.all([
        OneSignal.getUserId(),
        MainHelper.getAppId()
      ])
             .then(([userId, appId]) => {
               let welcome_notification_opts = OneSignal.config['welcomeNotification'];
               let welcome_notification_disabled = ((welcome_notification_opts !== undefined) &&
               (welcome_notification_opts['disable'] === true));
               let title = ((welcome_notification_opts !== undefined) &&
               (welcome_notification_opts['title'] !== undefined) &&
               (welcome_notification_opts['title'] !== null)) ? welcome_notification_opts['title'] : '';
               let message = ((welcome_notification_opts !== undefined) &&
               (welcome_notification_opts['message'] !== undefined) &&
               (welcome_notification_opts['message'] !== null) &&
               (welcome_notification_opts['message'].length > 0)) ?
                 welcome_notification_opts['message'] :
                 'Thanks for subscribing!';
               let unopenableWelcomeNotificationUrl = new URL(location.href).origin + '?_osp=do_not_open';
               let url = (welcome_notification_opts &&
               welcome_notification_opts['url'] &&
               (welcome_notification_opts['url'].length > 0)) ?
                 welcome_notification_opts['url'] :
                 unopenableWelcomeNotificationUrl;
               title = decodeHtmlEntities(title);
               message = decodeHtmlEntities(message);
               if (!welcome_notification_disabled) {
                 log.debug('Sending welcome notification.');
                 OneSignalApi.sendNotification(appId, [userId], {'en': title}, {'en': message}, url, null,
                   {__isOneSignalWelcomeNotification: true}, undefined);
                 Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {title: title, message: message, url: url});
               }
             });
    }
  }

  static _onDbValueSet(info) {
    /*
     For HTTPS sites, this is how the subscription change event gets fired.
     For HTTP sites, leaving this enabled fires the subscription change event twice. The first event is from Postmam
     remotely re-triggering the db.set event to notify the host page that the popup set the user ID in the db. The second
     event is from Postmam remotely re-triggering the subscription.changed event which is also fired from the popup.
     */
    if (info.type === 'userId' && !SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      EventHelper.checkAndTriggerSubscriptionChanged();
    }
  }

  static _onInternalSubscriptionSet(event) {
    var newSubscriptionValue = event;
    LimitStore.put('setsubscription.value', newSubscriptionValue);
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  static onDatabaseRebuilt() {
    OneSignal._isNewVisitor = true;
  }

  static triggerNotificationPermissionChanged(updateIfIdentical = false) {
    let newPermission, isUpdating;
    return Promise.all([
      OneSignal.getNotificationPermission(),
      Database.get('Options', 'notificationPermission')
    ])
                  .then(([currentPermission, previousPermission]) => {
                    newPermission = currentPermission;
                    isUpdating = (currentPermission !== previousPermission || updateIfIdentical);

                    if (isUpdating) {
                      return Database.put('Options', {key: 'notificationPermission', value: currentPermission});
                    }
                  })
                  .then(() => {
                    if (isUpdating) {
                      Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
                        from: null,
                        to: newPermission
                      });
                    }
                  });
  }

  static triggerSubscriptionChanged(to) {
    Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  }

  static triggerInternalSubscriptionSet(value) {
    Event.trigger(OneSignal.EVENTS.INTERNAL_SUBSCRIPTIONSET, value);
  }

  static fireTransmittedNotificationClickedCallbacks(data) {
    for (let notificationOpenedCallback of OneSignal._notificationOpenedCallbacks) {
      notificationOpenedCallback(data);
    }
  }

  static fireSavedNotificationClickedCallbacks() {
    Database.get("NotificationOpened", document.URL)
            .then(notificationOpened => {
              if (notificationOpened) {
                Database.remove("NotificationOpened", document.URL);
                let notificationData = (notificationOpened as any).data;
                let timestamp = (notificationOpened as any).timestamp;
                let discardNotification = false;
                // 3/4: Timestamp is a new feature and previous notification opened results don't have it
                if (timestamp) {
                  let now = Date.now();
                  let diffMilliseconds = Date.now() - timestamp;
                  let diffMinutes = diffMilliseconds / 1000 / 60;
                  /*
                   When the notification is clicked, its data is saved to IndexedDB, a new tab is opened, which then retrieves the just-saved data and runs this code.
                   If more than 5 minutes has passed, the page is probably being opened a long time later; do not fire the notification click event.
                   */
                  discardNotification = diffMinutes > 5;
                }
                if (discardNotification)
                  return;

                for (let notificationOpenedCallback of OneSignal._notificationOpenedCallbacks) {
                  notificationOpenedCallback(notificationData);
                }
              }
            });
  }
}