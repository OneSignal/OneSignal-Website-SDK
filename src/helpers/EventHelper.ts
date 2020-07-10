import Event from '../Event';
import LimitStore from '../LimitStore';
import OneSignalApiShared from '../OneSignalApiShared';
import Database from '../services/Database';
import { ContextSWInterface } from "../models/ContextSW";
import Log from '../libraries/Log';
import { CustomLink } from "../CustomLink";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import { BrowserUtils } from "../utils/BrowserUtils";
import PromptsHelper from './PromptsHelper';
import LocalStorage from '../utils/LocalStorage';

export default class EventHelper {
  static onNotificationPermissionChange() {
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  static async onInternalSubscriptionSet(optedOut: boolean) {
    LimitStore.put('subscription.optedOut', optedOut);
  }

  static async checkAndTriggerSubscriptionChanged() {
    OneSignalUtils.logMethodCall('checkAndTriggerSubscriptionChanged');
    const context: ContextSWInterface = OneSignal.context;
    const subscriptionState = await context.subscriptionManager.getSubscriptionState();
    const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    const appState = await Database.getAppState();
    const { lastKnownPushEnabled } = appState;
    const didStateChange = (
      lastKnownPushEnabled === null ||
      isPushEnabled !== lastKnownPushEnabled
    );
    if (!didStateChange) return;
    Log.info(
      `The user's subscription state changed from ` +
        `${lastKnownPushEnabled === null ? '(not stored)' : lastKnownPushEnabled} ⟶ ${subscriptionState.subscribed}`
    );
    LocalStorage.setIsPushNotificationsEnabled(isPushEnabled);
    appState.lastKnownPushEnabled = isPushEnabled;
    await Database.setAppState(appState);
    EventHelper.triggerSubscriptionChanged(isPushEnabled);
  }

  static async _onSubscriptionChanged(newSubscriptionState: boolean | undefined) {
    EventHelper.onSubscriptionChanged_showWelcomeNotification(newSubscriptionState);
    EventHelper.onSubscriptionChanged_sendCategorySlidedownTags(newSubscriptionState);
    EventHelper.onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate();
    EventHelper.onSubscriptionChanged_updateCustomLink();
  }

  private static async onSubscriptionChanged_sendCategorySlidedownTags(isSubscribed: boolean | undefined) {
    if (isSubscribed !== true) {
      return;
    }
    const { context } = OneSignal;
    if (PromptsHelper.isCategorySlidedownConfigured(context)) {
      await OneSignal.context.tagManager.sendTags(false);
    }
  }

  private static async onSubscriptionChanged_showWelcomeNotification(isSubscribed: boolean | undefined) {
    if (OneSignal.__doNotShowWelcomeNotification) {
      Log.debug('Not showing welcome notification because user has previously subscribed.');
      return;
    }
    if (isSubscribed === true) {
      const { deviceId } = await Database.getSubscription();
      const { appId } = await Database.getAppConfig();

      let welcome_notification_opts = OneSignal.config.userConfig.welcomeNotification;
      let welcome_notification_disabled =
        welcome_notification_opts !== undefined && welcome_notification_opts['disable'] === true;
      let title =
        welcome_notification_opts !== undefined &&
          welcome_notification_opts['title'] !== undefined &&
          welcome_notification_opts['title'] !== null
          ? welcome_notification_opts['title']
          : '';
      let message =
        welcome_notification_opts !== undefined &&
          welcome_notification_opts['message'] !== undefined &&
          welcome_notification_opts['message'] !== null &&
          welcome_notification_opts['message'].length > 0
          ? welcome_notification_opts['message']
          : 'Thanks for subscribing!';
      let unopenableWelcomeNotificationUrl = new URL(location.href).origin + '?_osp=do_not_open';
      let url =
        welcome_notification_opts && welcome_notification_opts['url'] && welcome_notification_opts['url'].length > 0
          ? welcome_notification_opts['url']
          : unopenableWelcomeNotificationUrl;
      title = BrowserUtils.decodeHtmlEntities(title);
      message = BrowserUtils.decodeHtmlEntities(message);

      if (!welcome_notification_disabled) {
        Log.debug('Sending welcome notification.');
        OneSignalApiShared.sendNotification(
          appId,
          [deviceId],
          { en: title },
          { en: message },
          url,
          null,
          { __isOneSignalWelcomeNotification: true },
          undefined
        );
        Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {
          title: title,
          message: message,
          url: url
        });
      }
    }
  }

  private static async onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate() {
    if (!OneSignal.config.userConfig.notifyButton)
      return;

    const displayPredicate = OneSignal.config.userConfig.notifyButton.displayPredicate;
    if (displayPredicate && typeof displayPredicate === "function" && OneSignal.notifyButton) {
      const predicateResult = await displayPredicate();
      if (predicateResult !== false) {
        Log.debug('Showing notify button because display predicate returned true.');
        OneSignal.notifyButton.launcher.show();
      } else {
        Log.debug('Hiding notify button because display predicate returned false.');
        OneSignal.notifyButton.launcher.hide();
      }
    }
  }

  private static async onSubscriptionChanged_updateCustomLink() {
    if (OneSignal.config.userConfig.promptOptions) {
      await CustomLink.initialize(OneSignal.config.userConfig.promptOptions.customlink);
    }
  }

  static triggerSubscriptionChanged(to) {
    Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
  }

  /**
   * When notifications are clicked, because the site isn't open, the notification is stored in the database. The next
   * time the page opens, the event is triggered if its less than 5 minutes (usually page opens instantly from click).
   *
   * This method is fired for both HTTPS and HTTP sites, so for HTTP sites, the host URL needs to be used, not the
   * subdomain.onesignal.com URL.
   */
  static async fireStoredNotificationClicks(url: string = document.URL) {
    async function fireEventWithNotification(clickedNotificationInfo) {
      // Remove the notification from the recently clicked list
      // Once this page processes this retroactively provided clicked event, nothing should get the same event
      const appState = await Database.getAppState();
      appState.clickedNotifications[clickedNotificationInfo.url] = null;
      await Database.setAppState(appState);

      /* Clicked notifications look like:
      {
        "url": "https://notify.tech",
        "data": {
          "id": "f44dfcc7-e8cd-47c6-af7e-e2b7ac68afca",
          "heading": "Example Notification",
          "content": "This is an example notification.",
          "icon": "https://onesignal.com/images/notification_logo.png"
          (there would be a URL field here if it was set)
        },
        "timestamp": 1490998270607
      }
      */
      const { data: notification, timestamp } = clickedNotificationInfo;

      if (timestamp) {
        const minutesSinceNotificationClicked = (Date.now() - timestamp) / 1000 / 60;
        if (minutesSinceNotificationClicked > 5) return;
      }
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification);
    }

    const appState = await Database.getAppState();

    /* Is the flag notificationClickHandlerMatch: origin enabled?

       If so, this means we should provide a retroactive notification.clicked event as long as there exists any recently clicked
       notification that matches this site's origin.

       Otherwise, the default behavior is to only provide a retroactive notification.clicked event if this page's URL exactly
       matches the notification's URL.
    */
    const notificationClickHandlerMatch = await Database.get<string>('Options', 'notificationClickHandlerMatch');
    if (notificationClickHandlerMatch === 'origin') {
      for (const clickedNotificationUrl of Object.keys(appState.clickedNotifications)) {
        // Using notificationClickHandlerMatch: 'origin', as long as the notification's URL's origin matches our current tab's origin,
        // fire the clicked event
        if (new URL(clickedNotificationUrl).origin === location.origin) {
          const clickedNotification = appState.clickedNotifications[clickedNotificationUrl];
          await fireEventWithNotification(clickedNotification);
        }
      }
    } else {
      /*
        If a user is on https://site.com, document.URL and location.href both report the page's URL as https://site.com/.
        This causes checking for notifications for the current URL to fail, since there is a notification for https://site.com,
        but there is no notification for https://site.com/.

        As a workaround, if there are no notifications for https://site.com/, we'll do a check for https://site.com.
      */
      var pageClickedNotifications = appState.clickedNotifications[url];
      if (pageClickedNotifications) {
        await fireEventWithNotification(pageClickedNotifications);
      } else if (!pageClickedNotifications && url.endsWith('/')) {
        var urlWithoutTrailingSlash = url.substring(0, url.length - 1);
        pageClickedNotifications = appState.clickedNotifications[urlWithoutTrailingSlash];
        if (pageClickedNotifications) {
          await fireEventWithNotification(pageClickedNotifications);
        }
      }
    }
  }
}
