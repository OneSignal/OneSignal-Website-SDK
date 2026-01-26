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
import {
  type NotificationWillDisplayResponsePayload,
  WorkerMessengerCommand,
} from 'src/shared/libraries/workerMessenger/constants';
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
import { VERSION } from 'src/shared/utils/env';
import { cancelableTimeout } from '../helpers/CancelableTimeout';
import {
  isValidPayload,
  toNativeNotificationAction,
  toOSNotification,
} from '../helpers/notifications';
import {
  notificationClick,
  notificationDismissed,
  notificationWillDisplay,
} from '../webhooks/notifications/webhookNotificationEvent';
import { getPushSubscriptionIdByToken } from './helpers';
import type {
  OSMinifiedNotificationPayload,
  OSServiceWorkerFields,
  SubscriptionChangeEvent,
} from './types';

declare const self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

const MAX_CONFIRMED_DELIVERY_DELAY = 25;
/**
 * How long to wait for page to respond to foregroundWillDisplay event before
 * displaying the notification anyway. This is short to ensure timely notification
 * display while giving the page a chance to call preventDefault().
 */
const NOTIFICATION_WILL_DISPLAY_RESPONSE_TIMEOUT_MS = 250;
const workerMessenger = new WorkerMessengerSW(undefined);

async function getPushSubscriptionId(): Promise<string | undefined> {
  const pushSubscription =
    await self.registration.pushManager.getSubscription();
  const pushToken = pushSubscription?.endpoint;
  if (!pushToken) return undefined;
  return getPushSubscriptionIdByToken(pushToken);
}

/**
 * Service worker entry point.
 */
export function run() {
  self.addEventListener('activate', onServiceWorkerActivated);
  self.addEventListener('push', onPushReceived);
  self.addEventListener('notificationclose', (event: NotificationEvent) =>
    event.waitUntil(onNotificationClosed(event)),
  );
  self.addEventListener('notificationclick', (event: NotificationEvent) =>
    event.waitUntil(onNotificationClicked(event)),
  );
  self.addEventListener('pushsubscriptionchange', (event: Event) => {
    (event as FetchEvent).waitUntil(
      onPushSubscriptionChange(event as unknown as SubscriptionChangeEvent),
    );
  });

  self.addEventListener('message', (event: ExtendableMessageEvent) => {
    const data: WorkerMessengerMessage = event.data;
    const payload = data?.payload;

    switch (data?.command) {
      case WorkerMessengerCommand._SessionUpsert:
        Log._debug('[Service Worker] Received SessionUpsert', payload);
        debounceRefreshSession(
          event,
          payload as UpsertOrDeactivateSessionPayload,
        );
        break;
      case WorkerMessengerCommand._SessionDeactivate:
        Log._debug('[Service Worker] Received SessionDeactivate', payload);
        debounceRefreshSession(
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
    workerMessenger._listen();

    // Install messaging event handlers for page <-> service worker communication
    setupMessageListeners();
  }, 0);
}

export async function getAppId(): Promise<string> {
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

function setupMessageListeners() {
  workerMessenger._on(WorkerMessengerCommand._WorkerVersion, () => {
    Log._debug('[Service Worker] Received worker version message.');
    workerMessenger._broadcast(WorkerMessengerCommand._WorkerVersion, VERSION);
  });
  workerMessenger._on(
    WorkerMessengerCommand._Subscribe,
    async (appConfigBundle: AppConfig) => {
      const appConfig = appConfigBundle;
      Log._debug('[Service Worker] Received subscribe message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context._subscriptionManager._subscribe(
        SubscriptionStrategyKind._ResubscribeExisting,
      );
      const subscription =
        await context._subscriptionManager._registerSubscription(
          rawSubscription,
        );
      workerMessenger._broadcast(
        WorkerMessengerCommand._Subscribe,
        subscription._serialize(),
      );
    },
  );
  workerMessenger._on(
    WorkerMessengerCommand._SubscribeNew,
    async (appConfigBundle: AppConfig) => {
      const appConfig = appConfigBundle;
      Log._debug('[Service Worker] Received subscribe new message.');
      const context = new ContextSW(appConfig);
      const rawSubscription = await context._subscriptionManager._subscribe(
        SubscriptionStrategyKind._SubscribeNew,
      );
      const subscription =
        await context._subscriptionManager._registerSubscription(
          rawSubscription,
        );

      workerMessenger._broadcast(
        WorkerMessengerCommand._SubscribeNew,
        subscription._serialize(),
      );
    },
  );

  workerMessenger._on(
    WorkerMessengerCommand._AreYouVisibleResponse,
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
  workerMessenger._on(
    WorkerMessengerCommand._SetLogging,
    async (payload: { shouldLog: boolean }) => {
      if (payload.shouldLog) {
        self.shouldLog = true;
      } else {
        self.shouldLog = undefined;
      }
    },
  );

  workerMessenger._on(
    WorkerMessengerCommand._NotificationWillDisplayResponse,
    async (payload: NotificationWillDisplayResponsePayload) => {
      console.log(
        '[OneSignal SW] Received NotificationWillDisplayResponse:',
        payload,
      );
      Log._debug(
        '[Service Worker] Received response for NotificationWillDisplay',
        payload,
      );

      // Only process if we're waiting for this notification's response
      if (self.notificationDisplayStatus?.notificationId !== payload.notificationId) {
        console.log('[OneSignal SW] Ignoring response - notificationId mismatch');
        return;
      }

      console.log('[OneSignal SW] Setting responded=true, preventDefault=' + payload.preventDefault);
      self.notificationDisplayStatus.responded = true;
      self.notificationDisplayStatus.preventDefault = payload.preventDefault;
    },
  );
}

/**
 * Initializes the response tracking for a notification BEFORE broadcasting.
 * This must be called before broadcasting to avoid race conditions where
 * the page responds before we're ready to receive the response.
 */
function initializeNotificationDisplayStatus(notificationId: string): void {
  console.log(
    '[OneSignal SW] Initializing notification display status for:',
    notificationId,
  );
  self.notificationDisplayStatus = {
    notificationId,
    preventDefault: false,
    responded: false,
  };
}

/**
 * Checks if any window client is visible and waits for the page to respond
 * with whether to prevent the notification display.
 * Uses a Promise-based approach with the page responding via postMessage.
 */
async function waitForPreventDefaultResponse(
  notificationId: string,
): Promise<boolean> {
  console.log(
    '[OneSignal SW] waitForPreventDefaultResponse called for:',
    notificationId,
  );

  // Get all window clients
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  console.log('[OneSignal SW] Total clients:', clients.length);

  // If no clients, show notification
  if (clients.length === 0) {
    console.log(
      '[OneSignal SW] No window clients found, showing notification.',
    );
    Log._debug(
      '[Service Worker] No window clients found, showing notification.',
    );
    return false;
  }

  // Check if any client is visible
  const visibleClients = clients.filter(
    (client) => (client as WindowClient).visibilityState === 'visible',
  );

  console.log('[OneSignal SW] Visible clients:', visibleClients.length);

  if (visibleClients.length === 0) {
    console.log('[OneSignal SW] No visible clients, showing notification.');
    Log._debug(
      '[Service Worker] No visible clients, showing notification.',
    );
    return false;
  }

  console.log(
    `[OneSignal SW] Found ${visibleClients.length} visible client(s), waiting for preventDefault response.`,
  );
  Log._debug(
    `[Service Worker] Found ${visibleClients.length} visible client(s), waiting for preventDefault response.`,
  );

  // Check if we already received a response (page may have responded very quickly)
  if (self.notificationDisplayStatus?.responded) {
    const preventDefault = self.notificationDisplayStatus.preventDefault;
    console.log(
      `[OneSignal SW] Already received preventDefault response: ${preventDefault}`,
    );
    Log._debug(
      `[Service Worker] Already received preventDefault response: ${preventDefault}`,
    );
    return preventDefault;
  }

  // Wait for response with timeout
  const startTime = Date.now();
  const timeoutMs = NOTIFICATION_WILL_DISPLAY_RESPONSE_TIMEOUT_MS;

  while (Date.now() - startTime < timeoutMs) {
    if (self.notificationDisplayStatus?.responded) {
      const preventDefault = self.notificationDisplayStatus.preventDefault;
      console.log(
        `[OneSignal SW] Received preventDefault response: ${preventDefault}`,
      );
      Log._debug(
        `[Service Worker] Received preventDefault response: ${preventDefault}`,
      );
      return preventDefault;
    }
    // Short sleep to avoid busy waiting
    await delay(10);
  }

  console.log(
    '[OneSignal SW] No preventDefault response received within timeout, showing notification.',
  );
  Log._debug(
    '[Service Worker] No preventDefault response received within timeout, showing notification.',
  );
  return false;
}

/**
 * Occurs when a push message is received.
 * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
 * notifications.
 */
function onPushReceived(event: PushEvent): void {
  Log._debug(
    `Called onPushReceived(${JSON.stringify(event, null, 4)}):`,
    event,
  );

  // Testing: Try calling event.preventDefault() to see browser behavior
  // According to MDN, this should prevent the default action
  // For push events, the "default" is typically nothing - we must explicitly show notifications
  console.log('[OneSignal SW] Push event received, event.cancelable:', event.cancelable);

  event.waitUntil(
    parseOrFetchNotifications(event)
      .then(async (rawNotificationsArray: OSMinifiedNotificationPayload[]) => {
        //Display push notifications in the order we received them
        const notificationEventPromiseFns = [];
        const notificationReceivedPromises: Promise<void>[] = [];
        const appId = await getAppId();

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

              // IMPORTANT: Set up response tracking BEFORE broadcasting to avoid race condition
              // where the page responds before we're ready to receive the response
              initializeNotificationDisplayStatus(notif.notificationId);

              await workerMessenger
                ._broadcast(
                  WorkerMessengerCommand._NotificationWillDisplay,
                  event,
                )
                .catch((e) => Log._error(e));

              // Wait for page to potentially call preventDefault()
              const shouldPreventDisplay = await waitForPreventDefaultResponse(
                notif.notificationId,
              );

              const pushSubscriptionId = await getPushSubscriptionId();
              notificationWillDisplay(notif, pushSubscriptionId);

              if (shouldPreventDisplay) {
                console.log(
                  `[OneSignal SW] *** NOTIFICATION DISPLAY PREVENTED *** for: ${notif.notificationId}`,
                );
                Log._debug(
                  `[Service Worker] Notification display prevented for: ${notif.notificationId}`,
                );
                // Still send confirmed delivery even if display is prevented
                return sendConfirmedDelivery(notif);
              }

              console.log(
                `[OneSignal SW] *** SHOWING NOTIFICATION *** for: ${notif.notificationId}`,
              );
              return displayNotification(notif)
                .then(() => sendConfirmedDelivery(notif))
                .catch((e) => Log._error(e));
            }).bind(null, notification),
          );
        }

        // @ts-expect-error - TODO: improve type
        return notificationEventPromiseFns.reduce((p, fn) => {
          // @ts-expect-error - TODO: improve type
          return (p = p.then(fn));
        }, Promise.resolve());
      })
      .catch((e) => {
        Log._debug('Failed to display a notification:', e);
      }),
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
function browserSupportsConfirmedDelivery(): boolean {
  return getBrowserName() !== Browser._Safari;
}

/**
 * Makes a PUT call to log the delivery of the notification
 * @param notification A JSON object containing notification details.
 * @returns {Promise}
 */
async function sendConfirmedDelivery(
  notification: IOSNotification,
): Promise<void | null> {
  if (!notification) return;

  if (!browserSupportsConfirmedDelivery()) return null;

  if (!notification.confirmDelivery) return;

  const appId = await getAppId();
  const pushSubscriptionId = await getPushSubscriptionId();

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

  await delay(Math.floor(Math.random() * MAX_CONFIRMED_DELIVERY_DELAY * 1_000));
  await OneSignalApiBase.put(
    `notifications/${notification.notificationId}/report_received`,
    postData,
  );
}

/**
 * Gets an array of window clients
 * @returns {Promise}
 */
async function getWindowClients(): Promise<ReadonlyArray<WindowClient>> {
  return await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
}

async function updateSessionBasedOnHasActive(
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

async function refreshSession(
  event: ExtendableMessageEvent,
  options: UpsertOrDeactivateSessionPayload,
): Promise<void> {
  Log._debug('[Service Worker] refreshSession');
  /**
   * getWindowClients -> check for the first focused
   * unfortunately, not enough for safari, it always returns false for focused state of a client
   * have to workaround it with messaging to the client.
   */
  const windowClients = await getWindowClients();

  if (options.isSafari) {
    await checkIfAnyClientsFocusedAndUpdateSession(
      event,
      windowClients,
      options,
    );
  } else {
    const hasAnyActiveSessions: boolean = windowClients.some(
      (w) => (w as WindowClient).focused,
    );
    Log._debug('[Service Worker] hasAnyActiveSessions', hasAnyActiveSessions);
    await updateSessionBasedOnHasActive(event, hasAnyActiveSessions, options);
  }
}

async function checkIfAnyClientsFocusedAndUpdateSession(
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
    c.postMessage({ command: WorkerMessengerCommand._AreYouVisible, payload });
  });
  const updateOnHasActive = async () => {
    Log._debug('updateSessionBasedOnHasActive', self.clientsStatus);
    await updateSessionBasedOnHasActive(
      event,
      self.clientsStatus!.hasAnyActiveSessions,
      sessionInfo,
    );
    self.clientsStatus = undefined;
  };
  const getClientStatusesCancelable = cancelableTimeout(updateOnHasActive, 0.5);
  self.cancel = getClientStatusesCancelable.cancel;
  event.waitUntil(getClientStatusesCancelable.promise);
}

function debounceRefreshSession(
  event: ExtendableMessageEvent,
  options: UpsertOrDeactivateSessionPayload,
) {
  Log._debug('[Service Worker] debounceRefreshSession', options);

  if (self.cancel) {
    self.cancel();
    self.cancel = undefined;
  }

  const executeRefreshSession = async () => {
    await refreshSession(event, options);
  };

  const cancelableRefreshSession = cancelableTimeout(executeRefreshSession, 1);
  self.cancel = cancelableRefreshSession.cancel;
  event.waitUntil(cancelableRefreshSession.promise);
}

/**
 * Given an image URL, returns a proxied HTTPS image using the https://images.weserv.nl service.
 * For a null image, returns null so that no icon is displayed.
 * If the image protocol is HTTPS, or origin contains localhost or starts with 192.168.*.*, we do not proxy the image.
 * @param imageUrl An HTTP or HTTPS image URL.
 */
function ensureImageResourceHttps(imageUrl?: string) {
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
function ensureNotificationResourcesHttps(
  notification: IMutableOSNotification,
) {
  if (notification) {
    if (notification.icon) {
      notification.icon = ensureImageResourceHttps(notification.icon);
    }
    if (notification.image) {
      notification.image = ensureImageResourceHttps(notification.image);
    }
    if (notification.actionButtons && notification.actionButtons.length > 0) {
      for (const button of notification.actionButtons) {
        if (button.icon) {
          button.icon = ensureImageResourceHttps(button.icon);
        }
      }
    }
  }
}

// Workaround: For Chromium browsers displaying an extra notification, even
// when background rules are followed.
// For reference, the notification body is "This site has been updated in the background".
// https://issues.chromium.org/issues/378103918
function requiresMacOS15ChromiumAfterDisplayWorkaround(): boolean {
  const userAgentData = (navigator as any).userAgentData;
  const isMacOS = userAgentData?.platform === 'macOS';
  const isChromium = !!userAgentData?.brands?.some(
    (item: { brand: string }) => item.brand === 'Chromium',
  );
  return isMacOS && isChromium;
}

/**
 * Actually displays a visible notification to the user.
 * Any event needing to display a notification calls this so that all the display options can be centralized here.
 * @param notification A structured notification object.
 */
async function displayNotification(notification: IMutableOSNotification) {
  Log._debug(
    `Called displayNotification(${JSON.stringify(notification, null, 4)}):`,
    notification,
  );

  // Use the default title if one isn't provided
  const defaultTitle = await getTitle();
  // Use the default icon if one isn't provided
  const defaultIcon = await getOptionsValue<string>('defaultIcon');
  // Get option of whether we should leave notification displaying indefinitely
  const persistNotification = await getOptionsValue<boolean>(
    'persistNotification',
  );

  // Get app ID for tag value
  const appId = await getAppId();

  notification.title = notification.title ? notification.title : defaultTitle;
  notification.icon = notification.icon
    ? notification.icon
    : defaultIcon
      ? defaultIcon
      : undefined;

  ensureNotificationResourcesHttps(notification);

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

  if (requiresMacOS15ChromiumAfterDisplayWorkaround()) {
    await delay(1_000);
  }
}

/**
 * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
 * notification. Otherwise returns true and the link will be opened.
 * @param url
 */
function shouldOpenNotificationUrl(url: string) {
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
async function onNotificationClosed(event: NotificationEvent) {
  Log._debug(
    `Called onNotificationClosed(${JSON.stringify(event, null, 4)}):`,
    event,
  );
  const notification = event.notification.data as IOSNotification;

  workerMessenger
    ._broadcast(WorkerMessengerCommand._NotificationDismissed, notification)
    .catch((e) => Log._error(e));
  const pushSubscriptionId = await getPushSubscriptionId();

  notificationDismissed(notification, pushSubscriptionId);
}

/**
 * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
 * notification body was clicked.
 */
async function getNotificationUrlToOpen(
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
async function onNotificationClicked(event: NotificationEvent) {
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

  const launchUrl = await getNotificationUrlToOpen(
    osNotification,
    event.action,
  );
  const notificationOpensLink: boolean = shouldOpenNotificationUrl(launchUrl);
  const appId = await getAppId();
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
      if (existingSession && existingSession.status === SessionStatus._Active) {
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
  const pushSubscriptionId = await getPushSubscriptionId();
  const convertedAPIRequests = sendConvertedAPIRequests(
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
  const activeClients = await getWindowClients();
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
      (notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
      (notificationClickHandlerMatch === 'origin' &&
        clientOrigin === launchOrigin)
    ) {
      if (
        client.url === launchUrl ||
        (notificationClickHandlerAction === 'focus' &&
          clientOrigin === launchOrigin)
      ) {
        workerMessenger._unicast(
          WorkerMessengerCommand._NotificationClicked,
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
          await openUrl(launchUrl);
        }
      }
      doNotOpenLink = true;
      break;
    }
  }

  if (notificationOpensLink && !doNotOpenLink) {
    await openUrl(launchUrl);
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
async function sendConvertedAPIRequests(
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

  await notificationClick(notificationClickEvent, pushSubscriptionId);
  if (onesignalRestPromise) await onesignalRestPromise;
}

/**
 * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
 * @param url May not be well-formed.
 */
async function openUrl(url: string): Promise<Client | null> {
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
function onServiceWorkerActivated(event: ExtendableEvent) {
  Log._info(`OneSignal Service Worker activated (version ${VERSION})`);
  event.waitUntil(self.clients.claim());
}

async function onPushSubscriptionChange(event: SubscriptionChangeEvent) {
  Log._debug(
    `Called onPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`,
    event,
  );

  const appId = await getAppId();
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
        SubscriptionStrategyKind._SubscribeNew,
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
      subscriptionState = NotificationType._PermissionRevoked;
    } else if (!rawPushSubscription) {
      /*
        If it's not a permission revoked issue, the subscription expired or was revoked by the
        push server.
       */
      subscriptionState = NotificationType._PushSubscriptionRevoked;
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
function getTitle(): Promise<string> {
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
 * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
 * Otherwise returns false.
 * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
 */
function isValidPushPayload(rawData: PushMessageData) {
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

/**
 * Returns an array of raw notification objects, read from the event.data.payload property
 * @param event
 * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
 * an array is returned for backwards compatibility with the rest of the service worker plumbing.
 */
function parseOrFetchNotifications(
  event: PushEvent,
): Promise<OSMinifiedNotificationPayload[]> {
  if (!event || !event.data) {
    return Promise.reject('Missing event.data on push payload!');
  }

  const isValidPayload = isValidPushPayload(event.data);
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
