import OneSignalApiShared from '../api/OneSignalApiShared';
import Log from '../libraries/Log';
import { CustomLinkManager } from '../managers/CustomLinkManager';
import { ContextSWInterface } from '../models/ContextSW';
import Database from '../services/Database';
import LimitStore from '../services/LimitStore';
import BrowserUtils from '../utils/BrowserUtils';
import OneSignalUtils from '../utils/OneSignalUtils';
import PromptsHelper from './PromptsHelper';
import OneSignalEvent from "../services/OneSignalEvent";
import SubscriptionChangeEvent from '../../page/models/SubscriptionChangeEvent';
import MainHelper from './MainHelper';
import { NotificationClickEvent, NotificationClickEventInternal } from '../models/NotificationEvent';

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
    // isPushEnabled = subscribed && is not opted out
    const isPushEnabled: boolean = await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
    // isOptedIn = native permission granted && is not opted out
    const isOptedIn: boolean = await OneSignal.context.subscriptionManager.isOptedIn();

    const appState = await Database.getAppState();
    const { lastKnownPushEnabled, lastKnownPushId, lastKnownPushToken, lastKnownOptedIn } = appState;

    const currentPushToken = await MainHelper.getCurrentPushToken();

    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
    const pushSubscriptionId = pushModel?.data?.id;

    const didStateChange = (
      lastKnownPushEnabled === null ||
      isPushEnabled !== lastKnownPushEnabled ||
      currentPushToken !== lastKnownPushToken ||
      pushSubscriptionId !== lastKnownPushId
    );
    if (!didStateChange) {
      return;
    }

    // update notification_types via core module
    await context.subscriptionManager.updateNotificationTypes()

    appState.lastKnownPushEnabled = isPushEnabled;
    appState.lastKnownPushToken = currentPushToken;
    appState.lastKnownPushId = pushSubscriptionId;
    appState.lastKnownOptedIn = isOptedIn;
    await Database.setAppState(appState);

    const change: SubscriptionChangeEvent = {
      previous: {
        id: lastKnownPushId,
        token: lastKnownPushToken,
        // default to true if not stored yet
        optedIn: lastKnownOptedIn ?? true,
      },
      current: {
        id: pushSubscriptionId,
        token: currentPushToken,
        optedIn: isOptedIn,
      }
    };
    Log.info("Push Subscription state changed: ", change);
    EventHelper.triggerSubscriptionChanged(change);
  }

  static async _onSubscriptionChanged(change: SubscriptionChangeEvent | undefined) {
    // TODO: Re-enable welcome notifications
    // EventHelper.onSubscriptionChanged_showWelcomeNotification(change?.current.enabled);
    EventHelper.onSubscriptionChanged_sendCategorySlidedownTags(change?.current?.optedIn);
    EventHelper.onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate();
    EventHelper.onSubscriptionChanged_updateCustomLink();
  }

  private static async onSubscriptionChanged_sendCategorySlidedownTags(isSubscribed?: boolean | null) {
    if (isSubscribed !== true) {
      return;
    }

    const prompts = OneSignal.context.appConfig.userConfig.promptOptions?.slidedown?.prompts;
    if (PromptsHelper.isCategorySlidedownConfigured(prompts)) {
      await OneSignal.context.tagManager.sendTags();
    }
  }

  private static sendingOrSentWelcomeNotification = false;
  private static async onSubscriptionChanged_showWelcomeNotification(isSubscribed: boolean | undefined) {
    if (OneSignal.__doNotShowWelcomeNotification) {
      Log.debug('Not showing welcome notification because user has previously subscribed.');
      return;
    }
    const welcome_notification_opts = OneSignal.config?.userConfig.welcomeNotification;
    const welcome_notification_disabled =
      welcome_notification_opts !== undefined && welcome_notification_opts['disable'] === true;

    if (welcome_notification_disabled) {
      return;
    }

    if (isSubscribed !== true) {
      return;
    }

    // Workaround only for this v15 branch; There are race conditions in the SDK
    // that result in the onSubscriptionChanged firing more than once sometimes.
    if (EventHelper.sendingOrSentWelcomeNotification) {
      return;
    }
    EventHelper.sendingOrSentWelcomeNotification = true;

    const { deviceId } = await Database.getSubscription();
    const { appId } = await Database.getAppConfig();
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
    const unopenableWelcomeNotificationUrl = new URL(location.href).origin + '?_osp=do_not_open';
    const url =
      welcome_notification_opts && welcome_notification_opts['url'] && welcome_notification_opts['url'].length > 0
        ? welcome_notification_opts['url']
        : unopenableWelcomeNotificationUrl;
    title = BrowserUtils.decodeHtmlEntities(title);
    message = BrowserUtils.decodeHtmlEntities(message);

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
    OneSignalEvent.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {
      title: title,
      message: message,
      url: url
    });
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
      new CustomLinkManager(OneSignal.config.userConfig.promptOptions.customlink).initialize();
    }
  }

  static triggerSubscriptionChanged(change: SubscriptionChangeEvent) {
    OneSignalEvent.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, change);
  }

  static triggerNotificationClick(event: NotificationClickEventInternal): Promise<void> {
    const publicEvent: NotificationClickEvent = {
      notification: event.notification,
      result: event.result,
    };
    return OneSignalEvent.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, publicEvent);
  }

  /**
   * When notifications are clicked, because the site isn't open, the notification is stored in the database. The next
   * time the page opens, the event is triggered if its less than 5 minutes (usually page opens instantly from click).
   *
   * This method is fired for both HTTPS and HTTP sites, so for HTTP sites, the host URL needs to be used, not the
   * subdomain.onesignal.com URL.
   */
  static async fireStoredNotificationClicks(url: string = document.URL) {
    async function fireEventWithNotification(selectedEvent: NotificationClickEventInternal) {
      // Remove the notification from the recently clicked list
      // Once this page processes this retroactively provided clicked event, nothing should get the same event
      const appState = await Database.getAppState();
      appState.notificationClickEventsPendingUrlOpening[selectedEvent.result.url] = null;
      await Database.setAppState(appState);

      const timestamp = selectedEvent.timestamp;
      if (timestamp) {
        const minutesSinceNotificationClicked = (Date.now() - timestamp) / 1000 / 60;
        if (minutesSinceNotificationClicked > 5) return;
      }

      EventHelper.triggerNotificationClick(selectedEvent);
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
      for (const clickedNotificationUrl of Object.keys(appState.notificationClickEventsPendingUrlOpening)) {
        // Using notificationClickHandlerMatch: 'origin', as long as the notification's URL's origin matches our current tab's origin,
        // fire the clicked event
        if (new URL(clickedNotificationUrl).origin === location.origin) {
          const clickedNotification = appState.notificationClickEventsPendingUrlOpening[clickedNotificationUrl];
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
      var pageClickedNotifications = appState.notificationClickEventsPendingUrlOpening[url];
      if (pageClickedNotifications) {
        await fireEventWithNotification(pageClickedNotifications);
      } else if (!pageClickedNotifications && url.endsWith('/')) {
        var urlWithoutTrailingSlash = url.substring(0, url.length - 1);
        pageClickedNotifications = appState.notificationClickEventsPendingUrlOpening[urlWithoutTrailingSlash];
        if (pageClickedNotifications) {
          await fireEventWithNotification(pageClickedNotifications);
        }
      }
    }
  }
}
