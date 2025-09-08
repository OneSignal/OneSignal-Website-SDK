import * as OneSignalApiBase from 'src/shared/api/base';
import {
  downloadSWServerAppConfig,
  getUserIdFromSubscriptionIdentifier,
} from 'src/shared/api/sw';
import { getServerAppConfig } from 'src/shared/config/app';
import type { AppConfig } from 'src/shared/config/types';
import { containsMatch } from 'src/shared/context/helpers';
import {
  db,
  getCurrentSession,
  getOptionsValue,
} from 'src/shared/database/client';
import { getAppState, getDBAppConfig } from 'src/shared/database/config';
import {
  putNotificationClickedForOutcomes,
  putNotificationReceivedForOutcomes,
} from 'src/shared/database/notifications';
import {
  getSubscription,
  setSubscription,
} from 'src/shared/database/subscription';
import { getDeviceType } from 'src/shared/environment/detect';
import { delay } from 'src/shared/helpers/general';
import {
  deactivateSession,
  upsertSession,
} from 'src/shared/helpers/service-worker';
import Log from 'src/shared/libraries/Log';
import { WorkerMessengerCommand } from 'src/shared/libraries/workerMessenger/constants';
import { WorkerMessengerSW } from 'src/shared/libraries/workerMessenger/sw';
import type { WorkerMessengerMessage } from 'src/shared/libraries/workerMessenger/types';
import ContextSW from 'src/shared/models/ContextSW';
import type { DeliveryPlatformKindValue } from 'src/shared/models/DeliveryPlatformKind';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import { SubscriptionStrategyKind } from 'src/shared/models/SubscriptionStrategyKind';
import type {
  IMutableOSNotification,
  IOSNotification,
  NotificationClickEventInternal,
  NotificationForegroundWillDisplayEventSerializable,
} from 'src/shared/notifications/types';
import { SessionStatus } from 'src/shared/session/constants';
import {
  type PageVisibilityRequest,
  type PageVisibilityResponse,
  type UpsertOrDeactivateSessionPayload,
} from 'src/shared/session/types';
import { NotificationType } from 'src/shared/subscriptions/constants';
import type { NotificationTypeValue } from 'src/shared/subscriptions/types';
import { Browser } from 'src/shared/useragent/constants';
import { getBrowserName } from 'src/shared/useragent/detect';
import { VERSION } from 'src/shared/utils/EnvVariables';
import { cancelableTimeout } from '../helpers/CancelableTimeout';
import {
  isValidPayload,
  toNativeNotificationAction,
  toOSNotification,
} from '../helpers/notifications';
import { OSWebhookNotificationEventSender } from '../webhooks/notifications/OSWebhookNotificationEventSender';
import { getPushSubscriptionIdByToken } from './helpers';
import type {
  OSMinifiedNotificationPayload,
  OSServiceWorkerFields,
  SubscriptionChangeEvent,
} from './types';

declare const self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

const MAX_CONFIRMED_DELIVERY_DELAY = 25;

/**
 * The main service worker script fetching and displaying notifications to users in the background even when the client
 * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
 * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
 */
export class OneSignalServiceWorker {
  static get _webhookNotificationEventSender() {
    return new OSWebhookNotificationEventSender();
  }

  static async _getPushSubscriptionId(): Promise<string | undefined> {
    const pushSubscription =
      await self.registration.pushManager.getSubscription();
    const pushToken = pushSubscription?.endpoint;
    if (!pushToken) return undefined;
    return getPushSubscriptionIdByToken(pushToken);
  }

  /**
   * Allows message passing between this service worker and pages on the same domain.
   * This allows events like notification dismissed, clicked, and displayed to be
   * fired on the clients. It also allows the clients to communicate with the
   * service worker to close all active notifications.
   */
  static get _workerMessenger(): WorkerMessengerSW {
    if (!self._workerMessenger) {
      self._workerMessenger = new WorkerMessengerSW(undefined);
    }
    return self._workerMessenger;
  }

  /**
   * Service worker entry point.
   */
  static _run() {
    self.addEventListener(
      'activate',
      OneSignalServiceWorker._onServiceWorkerActivated,
    );
    self.addEventListener('push', OneSignalServiceWorker._onPushReceived);
    self.addEventListener('notificationclose', (event: NotificationEvent) =>
      event.waitUntil(OneSignalServiceWorker._onNotificationClosed(event)),
    );
    self.addEventListener('notificationclick', (event: NotificationEvent) =>
      event.waitUntil(OneSignalServiceWorker._onNotificationClicked(event)),
    );
    self.addEventListener('pushsubscriptionchange', (event: Event) => {
      (event as FetchEvent).waitUntil(
        OneSignalServiceWorker._onPushSubscriptionChange(
          event as unknown as SubscriptionChangeEvent,
        ),
      );
    });

    self.addEventListener('message', (event: ExtendableMessageEvent) => {
      const data: WorkerMessengerMessage = event.data;
      const payload = data?.payload;

      switch (data?.command) {
        case WorkerMessengerCommand.SessionUpsert:
          Log._debug('[Service Worker] Received SessionUpsert', payload);
          OneSignalServiceWorker._debounceRefreshSession(
            event,
            payload as UpsertOrDeactivateSessionPayload,
          );
          break;
        case WorkerMessengerCommand.SessionDeactivate:
          Log._debug('[Service Worker] Received SessionDeactivate', payload);
          OneSignalServiceWorker._debounceRefreshSession(
            event,
            payload as UpsertOrDeactivateSessionPayload,
          );
          break;
        default:
          return;
      }
    });
    /*
      According to
      https://w3c.github.io/ServiceWorker/#run-service-worker-algorithm:

      "user agents are encouraged to show a warning that the event listeners
      must be added on the very first evaluation of the worker script."

      We have to register our event handler statically (not within an
      asynchronous method) so that the browser can optimize not waking up the
      service worker for events that aren't known for sure to be listened for.

      Also see: https://github.com/w3c/ServiceWorker/issues/1156
    */
    Log._debug('Setting up message listeners.');

    // delay for setting up test mocks like global.ServiceWorkerGlobalScope
    setTimeout(() => {
      // self.addEventListener('message') is statically added inside the listen() method
      OneSignalServiceWorker._workerMessenger._listen();

      // Install messaging event handlers for page <-> service worker communication
      OneSignalServiceWorker._setupMessageListeners();
    }, 0);
  }

  static async _getAppId(): Promise<string> {
    if (self.location.search) {
      const match = self.location.search.match(/appId=([0-9a-z-]+)&?/i);
      // Successful regex matches are at position 1
      if (match && match.length > 1) {
        const appId = match[1];
        return appId;
      }
    }
    const { appId } = await getDBAppConfig();
    return appId;
  }

  static _setupMessageListeners() {
    OneSignalServiceWorker._workerMessenger._on(
      WorkerMessengerCommand.WorkerVersion,
      () => {
        Log._debug('[Service Worker] Received worker version message.');
        OneSignalServiceWorker._workerMessenger._broadcast(
          WorkerMessengerCommand.WorkerVersion,
          VERSION,
        );
      },
    );
    OneSignalServiceWorker._workerMessenger._on(
      WorkerMessengerCommand.Subscribe,
      async (appConfigBundle: AppConfig) => {
        const appConfig = appConfigBundle;
        Log._debug('[Service Worker] Received subscribe message.');
        const context = new ContextSW(appConfig);
        const rawSubscription = await context._subscriptionManager._subscribe(
          SubscriptionStrategyKind.ResubscribeExisting,
        );
        const subscription =
          await context._subscriptionManager._registerSubscription(
            rawSubscription,
          );
        OneSignalServiceWorker._workerMessenger._broadcast(
          WorkerMessengerCommand.Subscribe,
          subscription._serialize(),
        );
      },
    );
    OneSignalServiceWorker._workerMessenger._on(
      WorkerMessengerCommand.SubscribeNew,
      async (appConfigBundle: AppConfig) => {
        const appConfig = appConfigBundle;
        Log._debug('[Service Worker] Received subscribe new message.');
        const context = new ContextSW(appConfig);
        const rawSubscription = await context._subscriptionManager._subscribe(
          SubscriptionStrategyKind.SubscribeNew,
        );
        const subscription =
          await context._subscriptionManager._registerSubscription(
            rawSubscription,
          );

        OneSignalServiceWorker._workerMessenger._broadcast(
          WorkerMessengerCommand.SubscribeNew,
          subscription._serialize(),
        );
      },
    );

    OneSignalServiceWorker._workerMessenger._on(
      WorkerMessengerCommand.AreYouVisibleResponse,
      async (payload: PageVisibilityResponse) => {
        Log._debug(
          '[Service Worker] Received response for AreYouVisible',
          payload,
        );

        const timestamp = payload.timestamp;
        if (self.clientsStatus?.timestamp !== timestamp) {
          return;
        }

        self.clientsStatus.receivedResponsesCount++;
        if (payload.focused) {
          self.clientsStatus.hasAnyActiveSessions = true;
        }
      },
    );
    OneSignalServiceWorker._workerMessenger._on(
      WorkerMessengerCommand.SetLogging,
      async (payload: { shouldLog: boolean }) => {
        if (payload.shouldLog) {
          self.shouldLog = true;
        } else {
          self.shouldLog = undefined;
        }
      },
    );
  }

  /**
   * Occurs when a push message is received.
   * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
   * notifications.
   */
  static _onPushReceived(event: PushEvent): void {
    Log._debug(
      `Called onPushReceived(${JSON.stringify(event, null, 4)}):`,
      event,
    );

    event.waitUntil(
      OneSignalServiceWorker._parseOrFetchNotifications(event)
        .then(
          async (rawNotificationsArray: OSMinifiedNotificationPayload[]) => {
            //Display push notifications in the order we received them
            const notificationEventPromiseFns = [];
            const notificationReceivedPromises: Promise<void>[] = [];
            const appId = await OneSignalServiceWorker._getAppId();

            for (const rawNotification of rawNotificationsArray) {
              Log._debug('Raw Notification from OneSignal:', rawNotification);
              const notification = toOSNotification(rawNotification);

              notificationReceivedPromises.push(
                putNotificationReceivedForOutcomes(appId, notification),
              );
              // TODO: decide what to do with all the notif received promises
              // Probably should have it's own error handling but not blocking the rest of the execution?

              // Never nest the following line in a callback from the point of entering from retrieveNotifications
              notificationEventPromiseFns.push(
                (async (notif: IOSNotification) => {
                  const event: NotificationForegroundWillDisplayEventSerializable =
                    {
                      notification: notif,
                    };
                  await OneSignalServiceWorker._workerMessenger
                    ._broadcast(
                      WorkerMessengerCommand.NotificationWillDisplay,
                      event,
                    )
                    .catch((e) => Log._error(e));
                  const pushSubscriptionId =
                    await OneSignalServiceWorker._getPushSubscriptionId();

                  OneSignalServiceWorker._webhookNotificationEventSender.willDisplay(
                    notif,
                    pushSubscriptionId,
                  );

                  return OneSignalServiceWorker._displayNotification(notif)
                    .then(() =>
                      OneSignalServiceWorker._sendConfirmedDelivery(notif),
                    )
                    .catch((e) => Log._error(e));
                }).bind(null, notification),
              );
            }

            // @ts-expect-error - TODO: improve type
            return notificationEventPromiseFns.reduce((p, fn) => {
              // @ts-expect-error - TODO: improve type
              return (p = p.then(fn));
            }, Promise.resolve());
          },
        )
        .catch((e) => {
          Log._debug('Failed to display a notification:', e);
        }),
    );
  }

  /**
   * Makes a PUT call to log the delivery of the notification
   * @param notification A JSON object containing notification details.
   * @returns {Promise}
   */
  static async _sendConfirmedDelivery(
    notification: IOSNotification,
  ): Promise<void | null> {
    if (!notification) return;

    if (!OneSignalServiceWorker._browserSupportsConfirmedDelivery())
      return null;

    if (!notification.confirmDelivery) return;

    const appId = await OneSignalServiceWorker._getAppId();
    const pushSubscriptionId = await this._getPushSubscriptionId();

    // app and notification ids are required, decided to exclude deviceId from required params
    // In rare case we don't have it we can still report as confirmed to backend to increment count
    const hasRequiredParams = !!(appId && notification.notificationId);
    if (!hasRequiredParams) return;

    // JSON.stringify() does not include undefined values
    // Our response will not contain those fields here which have undefined values
    const postData = {
      player_id: pushSubscriptionId,
      app_id: appId,
      device_type: getDeviceType(),
    };

    Log._debug(
      `Called sendConfirmedDelivery(${JSON.stringify(notification, null, 4)})`,
    );

    await delay(
      Math.floor(Math.random() * MAX_CONFIRMED_DELIVERY_DELAY * 1_000),
    );
    await OneSignalApiBase.put(
      `notifications/${notification.notificationId}/report_received`,
      postData,
    );
  }

  /**
   * Confirmed Delivery isn't supported on Safari since they are very strict about the amount
   * of time you have to finish the onpush event. Spending to much time in the onpush event
   * will cause the push endpoint to become revoked!, causing the device to stop receiving pushes!
   *
   * iPadOS 16.4 it was observed to be only about 10 secounds.
   * macOS 13.3 didn't seem to have this restriction when testing up to a 25 secound delay, however
   * to be safe we are disabling it for all Safari browsers.
   */
  static _browserSupportsConfirmedDelivery(): boolean {
    return getBrowserName() !== Browser.Safari;
  }

  /**
   * Gets an array of window clients
   * @returns {Promise}
   */
  static async _getWindowClients(): Promise<ReadonlyArray<WindowClient>> {
    return await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
  }

  static async _updateSessionBasedOnHasActive(
    event: ExtendableMessageEvent,
    hasAnyActiveSessions: boolean,
    options: UpsertOrDeactivateSessionPayload,
  ) {
    if (hasAnyActiveSessions) {
      await upsertSession(
        options.appId,
        options.onesignalId,
        options.subscriptionId,
        options.sessionThreshold,
        options.enableSessionDuration,
        options.sessionOrigin,
        options.outcomesConfig,
      );
    } else {
      const cancelableFinalize = await deactivateSession(
        options.appId,
        options.onesignalId,
        options.subscriptionId,
        options.sessionThreshold,
        options.enableSessionDuration,
        options.outcomesConfig,
      );
      if (cancelableFinalize) {
        self.cancel = cancelableFinalize.cancel;
        event.waitUntil(cancelableFinalize.promise);
      }
    }
  }

  static async _refreshSession(
    event: ExtendableMessageEvent,
    options: UpsertOrDeactivateSessionPayload,
  ): Promise<void> {
    Log._debug('[Service Worker] refreshSession');
    /**
     * getWindowClients -> check for the first focused
     * unfortunately, not enough for safari, it always returns false for focused state of a client
     * have to workaround it with messaging to the client.
     */
    const windowClients = await this._getWindowClients();

    if (options.isSafari) {
      await OneSignalServiceWorker._checkIfAnyClientsFocusedAndUpdateSession(
        event,
        windowClients,
        options,
      );
    } else {
      const hasAnyActiveSessions: boolean = windowClients.some(
        (w) => (w as WindowClient).focused,
      );
      Log._debug('[Service Worker] hasAnyActiveSessions', hasAnyActiveSessions);
      await OneSignalServiceWorker._updateSessionBasedOnHasActive(
        event,
        hasAnyActiveSessions,
        options,
      );
    }
  }

  static async _checkIfAnyClientsFocusedAndUpdateSession(
    event: ExtendableMessageEvent,
    windowClients: ReadonlyArray<Client>,
    sessionInfo: UpsertOrDeactivateSessionPayload,
  ): Promise<void> {
    const timestamp = new Date().getTime();
    self.clientsStatus = {
      timestamp,
      sentRequestsCount: 0,
      receivedResponsesCount: 0,
      hasAnyActiveSessions: false,
    };
    const payload: PageVisibilityRequest = { timestamp };
    windowClients.forEach((c) => {
      // keeping track of number of sent requests mostly for debugging purposes
      self.clientsStatus!.sentRequestsCount++;
      c.postMessage({ command: WorkerMessengerCommand.AreYouVisible, payload });
    });
    const updateOnHasActive = async () => {
      Log._debug('updateSessionBasedOnHasActive', self.clientsStatus);
      await OneSignalServiceWorker._updateSessionBasedOnHasActive(
        event,
        self.clientsStatus!.hasAnyActiveSessions,
        sessionInfo,
      );
      self.clientsStatus = undefined;
    };
    const getClientStatusesCancelable = cancelableTimeout(
      updateOnHasActive,
      0.5,
    );
    self.cancel = getClientStatusesCancelable.cancel;
    event.waitUntil(getClientStatusesCancelable.promise);
  }

  static _debounceRefreshSession(
    event: ExtendableMessageEvent,
    options: UpsertOrDeactivateSessionPayload,
  ) {
    Log._debug('[Service Worker] debounceRefreshSession', options);

    if (self.cancel) {
      self.cancel();
      self.cancel = undefined;
    }

    const executeRefreshSession = async () => {
      await OneSignalServiceWorker._refreshSession(event, options);
    };

    const cancelableRefreshSession = cancelableTimeout(
      executeRefreshSession,
      1,
    );
    self.cancel = cancelableRefreshSession.cancel;
    event.waitUntil(cancelableRefreshSession.promise);
  }

  /**
   * Given an image URL, returns a proxied HTTPS image using the https://images.weserv.nl service.
   * For a null image, returns null so that no icon is displayed.
   * If the image protocol is HTTPS, or origin contains localhost or starts with 192.168.*.*, we do not proxy the image.
   * @param imageUrl An HTTP or HTTPS image URL.
   */
  static _ensureImageResourceHttps(imageUrl?: string) {
    if (imageUrl) {
      try {
        const parsedImageUrl = new URL(imageUrl);
        if (
          parsedImageUrl.hostname === 'localhost' ||
          parsedImageUrl.hostname.indexOf('192.168') !== -1 ||
          parsedImageUrl.hostname === '127.0.0.1' ||
          parsedImageUrl.protocol === 'https:'
        ) {
          return imageUrl;
        }
        if (
          parsedImageUrl.hostname === 'i0.wp.com' ||
          parsedImageUrl.hostname === 'i1.wp.com' ||
          parsedImageUrl.hostname === 'i2.wp.com' ||
          parsedImageUrl.hostname === 'i3.wp.com'
        ) {
          /* Their site already uses Jetpack, just make sure Jetpack is HTTPS */
          return `https://${parsedImageUrl.hostname}${parsedImageUrl.pathname}`;
        }
        /* HTTPS origin hosts can be used by prefixing the hostname with ssl: */
        const replacedImageUrl = parsedImageUrl.host + parsedImageUrl.pathname;
        return `https://i0.wp.com/${replacedImageUrl}`;
      } catch (e) {
        Log._error('ensureImageResourceHttps: ', e);
      }
    }
    return undefined;
  }

  /**
   * Given a structured notification object, HTTPS-ifies the notification icons and action button icons, if they exist.
   */
  static _ensureNotificationResourcesHttps(
    notification: IMutableOSNotification,
  ) {
    if (notification) {
      if (notification.icon) {
        notification.icon = OneSignalServiceWorker._ensureImageResourceHttps(
          notification.icon,
        );
      }
      if (notification.image) {
        notification.image = OneSignalServiceWorker._ensureImageResourceHttps(
          notification.image,
        );
      }
      if (notification.actionButtons && notification.actionButtons.length > 0) {
        for (const button of notification.actionButtons) {
          if (button.icon) {
            button.icon = OneSignalServiceWorker._ensureImageResourceHttps(
              button.icon,
            );
          }
        }
      }
    }
  }

  /**
   * Actually displays a visible notification to the user.
   * Any event needing to display a notification calls this so that all the display options can be centralized here.
   * @param notification A structured notification object.
   */
  static async _displayNotification(notification: IMutableOSNotification) {
    Log._debug(
      `Called displayNotification(${JSON.stringify(notification, null, 4)}):`,
      notification,
    );

    // Use the default title if one isn't provided
    const defaultTitle = await OneSignalServiceWorker._getTitle();
    // Use the default icon if one isn't provided
    const defaultIcon = await getOptionsValue<string>('defaultIcon');
    // Get option of whether we should leave notification displaying indefinitely
    const persistNotification = await getOptionsValue<boolean>(
      'persistNotification',
    );

    // Get app ID for tag value
    const appId = await OneSignalServiceWorker._getAppId();

    notification.title = notification.title ? notification.title : defaultTitle;
    notification.icon = notification.icon
      ? notification.icon
      : defaultIcon
        ? defaultIcon
        : undefined;

    OneSignalServiceWorker._ensureNotificationResourcesHttps(notification);

    const notificationOptions: NotificationOptions = {
      body: notification.body,
      icon: notification.icon,
      /*
       On Chrome 56, a large image can be displayed:
       https://bugs.chromium.org/p/chromium/issues/detail?id=614456
       */
      // @ts-expect-error - image is not standard?
      image: notification.image,
      /*
       On Chrome 44+, use this property to store extra information which
       you can read back when the notification gets invoked from a
       notification click or dismissed event. We serialize the
       notification in the 'data' field and read it back in other events.
       See:
       https://developers.google.com/web/updates/2015/05/notifying-you-of-changes-to-notifications?hl=en
       */
      data: notification,
      /*
       On Chrome 48+, action buttons show below the message body of the
       notification. Clicking either button takes the user to a link. See:
       https://developers.google.com/web/updates/2016/01/notification-actions
       */
      actions: toNativeNotificationAction(notification.actionButtons),
      /*
       Tags are any string value that groups notifications together. Two
       or notifications sharing a tag replace each other.
       */
      tag: notification.topic || appId,
      /*
       On Chrome 47+ (desktop), notifications will be dismissed after 20
       seconds unless requireInteraction is set to true. See:
       https://developers.google.com/web/updates/2015/10/notification-requireInteractiom
       */
      requireInteraction: persistNotification !== false,
      /*
       On Chrome 50+, by default notifications replacing
       identically-tagged notifications no longer vibrate/signal the user
       that a new notification has come in. This flag allows subsequent
       notifications to re-alert the user. See:
       https://developers.google.com/web/updates/2016/03/notifications
       */
      renotify: true,
      /*
       On Chrome 53+, returns the URL of the image used to represent the
       notification when there is not enough space to display the
       notification itself.

       The URL of an image to represent the notification when there is not
       enough space to display the notification itself such as, for
       example, the Android Notification Bar. On Android devices, the
       badge should accommodate devices up to 4x resolution, about 96 by
       96 px, and the image will be automatically masked.
       */
      badge: notification.badgeIcon,
    };

    await self.registration.showNotification(
      notification.title,
      notificationOptions,
    );

    if (this._requiresMacOS15ChromiumAfterDisplayWorkaround()) {
      await delay(1_000);
    }
  }

  // Workaround: For Chromium browsers displaying an extra notification, even
  // when background rules are followed.
  // For reference, the notification body is "This site has been updated in the background".
  // https://issues.chromium.org/issues/378103918
  static _requiresMacOS15ChromiumAfterDisplayWorkaround(): boolean {
    const userAgentData = (navigator as any).userAgentData;
    const isMacOS = userAgentData?.platform === 'macOS';
    const isChromium = !!userAgentData?.brands?.some(
      (item: { brand: string }) => item.brand === 'Chromium',
    );
    return isMacOS && isChromium;
  }

  /**
   * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
   * notification. Otherwise returns true and the link will be opened.
   * @param url
   */
  static _shouldOpenNotificationUrl(url: string) {
    return (
      url !== 'javascript:void(0);' &&
      url !== 'do_not_open' &&
      !containsMatch(url, '_osp=do_not_open')
    );
  }

  /**
   * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
   * Supported on: Chrome 50+ only
   */
  static async _onNotificationClosed(event: NotificationEvent) {
    Log._debug(
      `Called onNotificationClosed(${JSON.stringify(event, null, 4)}):`,
      event,
    );
    const notification = event.notification.data as IOSNotification;

    OneSignalServiceWorker._workerMessenger
      ._broadcast(WorkerMessengerCommand.NotificationDismissed, notification)
      .catch((e) => Log._error(e));
    const pushSubscriptionId =
      await OneSignalServiceWorker._getPushSubscriptionId();

    OneSignalServiceWorker._webhookNotificationEventSender.dismiss(
      notification,
      pushSubscriptionId,
    );
  }

  /**
   * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
   * notification body was clicked.
   */
  static async _getNotificationUrlToOpen(
    notification: IOSNotification,
    actionId?: string,
  ): Promise<string> {
    // If the user clicked an action button, use the URL provided by the action button.
    // Unless the action button URL is null
    if (actionId) {
      const clickedButton = notification?.actionButtons?.find(
        (button) => button.actionId === actionId,
      );
      if (clickedButton?.launchURL && clickedButton.launchURL !== '') {
        return clickedButton.launchURL;
      }
    }

    if (notification.launchURL && notification.launchURL !== '') {
      return notification.launchURL;
    }

    const { defaultNotificationUrl: dbDefaultNotificationUrl } =
      await getAppState();
    if (dbDefaultNotificationUrl) {
      return dbDefaultNotificationUrl;
    }

    return location.origin;
  }

  /**
   * Occurs when the notification's body or action buttons are clicked. Does not occur if the notification is
   * dismissed by clicking the 'X' icon. See the notification close event for the dismissal event.
   */
  static async _onNotificationClicked(event: NotificationEvent) {
    Log._debug(
      `Called onNotificationClicked(${JSON.stringify(event, null, 4)}):`,
      event,
    );

    // Close the notification first here, before we do anything that might fail
    event.notification.close();

    const osNotification = event.notification.data as IOSNotification;

    let notificationClickHandlerMatch = 'exact';
    let notificationClickHandlerAction = 'navigate';

    const matchPreference = await getOptionsValue<string>(
      'notificationClickHandlerMatch',
    );
    if (matchPreference) notificationClickHandlerMatch = matchPreference;

    const actionPreference = await getOptionsValue<string>(
      'notificationClickHandlerAction',
    );
    if (actionPreference) notificationClickHandlerAction = actionPreference;

    const launchUrl = await OneSignalServiceWorker._getNotificationUrlToOpen(
      osNotification,
      event.action,
    );
    const notificationOpensLink: boolean =
      OneSignalServiceWorker._shouldOpenNotificationUrl(launchUrl);
    const appId = await OneSignalServiceWorker._getAppId();
    const deviceType = getDeviceType();

    const notificationClickEvent: NotificationClickEventInternal = {
      notification: osNotification,
      result: {
        actionId: event.action,
        url: launchUrl,
      },
      timestamp: new Date().getTime(),
    };

    Log._info('NotificationClicked', notificationClickEvent);
    const saveNotificationClickedPromise = (async (notificationClickEvent) => {
      try {
        const existingSession = await getCurrentSession();
        if (
          existingSession &&
          existingSession.status === SessionStatus.Active
        ) {
          return;
        }

        await putNotificationClickedForOutcomes(appId, notificationClickEvent);

        // upgrade existing session to be directly attributed to the notif
        // if it results in re-focusing the site
        if (existingSession) {
          existingSession.notificationId =
            notificationClickEvent.notification.notificationId;
          await db.put('Sessions', existingSession);
        }
      } catch (e) {
        Log._error('Failed to save clicked notification.', e);
      }
    })(notificationClickEvent);

    // Start making REST API requests BEFORE self.clients.openWindow is called.
    // It will cause the service worker to stop on Chrome for Android when site is added to the home screen.
    const pushSubscriptionId = await this._getPushSubscriptionId();
    const convertedAPIRequests =
      OneSignalServiceWorker._sendConvertedAPIRequests(
        appId,
        pushSubscriptionId,
        notificationClickEvent,
        deviceType,
      );

    /*
     Check if we can focus on an existing tab instead of opening a new url.
     If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
     an identical new tab being created. With a special setting, any existing tab matching the origin will
     be focused instead of an identical new tab being created.
     */
    const activeClients = await OneSignalServiceWorker._getWindowClients();
    let doNotOpenLink = false;
    for (const client of activeClients) {
      const clientUrl = client.url;
      let clientOrigin = '';
      try {
        clientOrigin = new URL(clientUrl).origin;
      } catch (e) {
        Log._error(`Failed to get the HTTP site's actual origin:`, e);
      }
      let launchOrigin = null;
      try {
        // Check if the launchUrl is valid; it can be null
        launchOrigin = new URL(launchUrl).origin;
      } catch (e) {
        Log._error(`Failed parse launchUrl:`, e);
      }

      if (
        (notificationClickHandlerMatch === 'exact' &&
          clientUrl === launchUrl) ||
        (notificationClickHandlerMatch === 'origin' &&
          clientOrigin === launchOrigin)
      ) {
        if (
          client.url === launchUrl ||
          (notificationClickHandlerAction === 'focus' &&
            clientOrigin === launchOrigin)
        ) {
          OneSignalServiceWorker._workerMessenger._unicast(
            WorkerMessengerCommand.NotificationClicked,
            notificationClickEvent,
            client,
          );
          try {
            if (client instanceof WindowClient) await client.focus();
          } catch (e) {
            Log._error('Failed to focus:', client, e);
          }
        } else {
          /*
          We must focus first; once the client navigates away, it may not be on a domain the same domain, and
          the client ID may change, making it unable to focus.

          client.navigate() is available on Chrome 49+ and Firefox 50+.
           */
          if (client instanceof WindowClient && client.navigate) {
            try {
              Log._debug(
                'Client is standard HTTPS site. Attempting to focus() client.',
              );
              if (client instanceof WindowClient) await client.focus();
            } catch (e) {
              Log._error('Failed to focus:', client, e);
            }
            try {
              if (notificationOpensLink) {
                Log._debug(`Redirecting HTTPS site to (${launchUrl}).`);
                await client.navigate(launchUrl);
              } else {
                Log._debug('Not navigating because link is special.');
              }
            } catch (e) {
              Log._error('Failed to navigate:', client, launchUrl, e);
            }
          } else {
            // If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
            await OneSignalServiceWorker._openUrl(launchUrl);
          }
        }
        doNotOpenLink = true;
        break;
      }
    }

    if (notificationOpensLink && !doNotOpenLink) {
      await OneSignalServiceWorker._openUrl(launchUrl);
    }
    if (saveNotificationClickedPromise) {
      await saveNotificationClickedPromise;
    }

    return await convertedAPIRequests;
  }

  /**
   * Makes network calls for the notification open event to;
   *    1. OneSignal.com to increase the notification open count.
   *    2. A website developer defined webhook URL, if set.
   */
  static async _sendConvertedAPIRequests(
    appId: string | undefined | null,
    pushSubscriptionId: string | undefined,
    notificationClickEvent: NotificationClickEventInternal,
    deviceType: DeliveryPlatformKindValue,
  ): Promise<void> {
    const notificationData = notificationClickEvent.notification;

    if (!notificationData.notificationId) {
      console.error(
        'No notification id, skipping networks calls to report open!',
      );
      return;
    }

    let onesignalRestPromise: Promise<any> | undefined;

    if (appId) {
      onesignalRestPromise = OneSignalApiBase.put(
        `notifications/${notificationData.notificationId}`,
        {
          app_id: appId,
          player_id: pushSubscriptionId,
          opened: true,
          device_type: deviceType,
        },
      );
    } else {
      console.error(
        'No app Id, skipping OneSignal API call for notification open!',
      );
    }

    await OneSignalServiceWorker._webhookNotificationEventSender.click(
      notificationClickEvent,
      pushSubscriptionId,
    );
    if (onesignalRestPromise) await onesignalRestPromise;
  }

  /**
   * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
   * @param url May not be well-formed.
   */
  static async _openUrl(url: string): Promise<Client | null> {
    Log._debug('Opening notification URL:', url);
    try {
      return await self.clients.openWindow(url);
    } catch (e) {
      Log._warn(`Failed to open the URL '${url}':`, e);
      return null;
    }
  }

  /**
   * Fires when the ServiceWorker can control pages.
   * @param event
   */
  static _onServiceWorkerActivated(event: ExtendableEvent) {
    Log._info(`OneSignal Service Worker activated (version ${VERSION})`);
    event.waitUntil(self.clients.claim());
  }

  static async _onPushSubscriptionChange(event: SubscriptionChangeEvent) {
    Log._debug(
      `Called onPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`,
      event,
    );

    const appId = await OneSignalServiceWorker._getAppId();
    if (!appId) {
      // Without an app ID, we can't make any calls
      return;
    }
    const appConfig = await getServerAppConfig(
      { appId },
      downloadSWServerAppConfig,
    );
    if (!appConfig) {
      // Without a valid app config (e.g. deleted app), we can't make any calls
      return;
    }
    const context = new ContextSW(appConfig);

    // Get our current device ID
    let deviceIdExists: boolean;
    {
      let deviceId: string | null | undefined = (await getSubscription())
        .deviceId;

      deviceIdExists = !!deviceId;
      if (!deviceIdExists && event.oldSubscription) {
        // We don't have the device ID stored, but we can look it up from our old subscription
        deviceId = await getUserIdFromSubscriptionIdentifier(
          appId,
          getDeviceType(),
          event.oldSubscription.endpoint,
        );

        // Store the device ID, so it can be looked up when subscribing
        const subscription = await getSubscription();
        subscription.deviceId = deviceId;
        await setSubscription(subscription);
      }
      deviceIdExists = !!deviceId;
    }

    // Get our new push subscription
    let rawPushSubscription: RawPushSubscription | undefined;

    // Set it initially by the provided new push subscription
    const providedNewSubscription = event.newSubscription;
    if (providedNewSubscription) {
      rawPushSubscription = RawPushSubscription._setFromW3cSubscription(
        providedNewSubscription,
      );
    } else {
      // Otherwise set our push registration by resubscribing
      try {
        rawPushSubscription = await context._subscriptionManager._subscribe(
          SubscriptionStrategyKind.SubscribeNew,
        );
      } catch (e) {
        // Let rawPushSubscription be null
      }
    }
    const hasNewSubscription = !!rawPushSubscription;

    if (!deviceIdExists && !hasNewSubscription) {
      await db.delete('Ids', 'userId');
      await db.delete('Ids', 'registrationId');
    } else {
      /*
        Determine subscription state we should set new record to.

        If the permission is revoked, we should set the subscription state to permission revoked.
       */
      let subscriptionState: null | NotificationTypeValue = null;
      const pushPermission = Notification.permission;

      if (pushPermission !== 'granted') {
        subscriptionState = NotificationType.PermissionRevoked;
      } else if (!rawPushSubscription) {
        /*
          If it's not a permission revoked issue, the subscription expired or was revoked by the
          push server.
         */
        subscriptionState = NotificationType.PushSubscriptionRevoked;
      }

      // rawPushSubscription may be null if no push subscription was retrieved
      await context._subscriptionManager._registerSubscription(
        rawPushSubscription,
        subscriptionState,
      );
    }
  }

  /**
   * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
   */
  static _getTitle(): Promise<string> {
    return new Promise((resolve) => {
      Promise.all([
        getOptionsValue<string>('defaultTitle'),
        getOptionsValue<string>('pageTitle'),
      ]).then(([defaultTitle, pageTitle]) => {
        if (defaultTitle !== null) {
          resolve(defaultTitle);
        } else if (pageTitle != null) {
          resolve(pageTitle);
        } else {
          resolve('');
        }
      });
    });
  }

  /**
   * Returns an array of raw notification objects, read from the event.data.payload property
   * @param event
   * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
   * an array is returned for backwards compatibility with the rest of the service worker plumbing.
   */
  static _parseOrFetchNotifications(
    event: PushEvent,
  ): Promise<OSMinifiedNotificationPayload[]> {
    if (!event || !event.data) {
      return Promise.reject('Missing event.data on push payload!');
    }

    const isValidPayload = OneSignalServiceWorker._isValidPushPayload(
      event.data,
    );
    if (isValidPayload) {
      Log._debug('Received a valid encrypted push payload.');
      const payload: OSMinifiedNotificationPayload = event.data.json();
      return Promise.resolve([payload]);
    }

    /*
     We received a push message payload from another service provider or a malformed
     payload. The last received notification will be displayed.
    */
    return Promise.reject(
      `Unexpected push message payload received: ${event.data}`,
    );
  }

  /**
   * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
   * Otherwise returns false.
   * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
   */
  static _isValidPushPayload(rawData: PushMessageData) {
    try {
      const payload = rawData.json();
      if (isValidPayload(payload)) {
        return true;
      } else {
        Log._debug(
          'isValidPushPayload: Valid JSON but missing notification UUID:',
          payload,
        );
        return false;
      }
    } catch (e) {
      Log._debug('isValidPushPayload: Parsing to JSON failed with:', e);
      return false;
    }
  }
}

OneSignalServiceWorker._run();
