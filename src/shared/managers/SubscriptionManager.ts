import { isCompleteSubscriptionObject } from 'src/core/utils/typePredicates';
import UserDirector from 'src/onesignal/UserDirector';
import LoginManager from 'src/page/managers/LoginManager';
import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import { NotificationType } from 'src/shared/subscriptions/constants';
import type { NotificationTypeValue } from 'src/shared/subscriptions/types';
import { getOneSignalApiUrl, useSafariLegacyPush } from '../environment/detect';
import {
  MissingSafariWebIdError,
  PermissionBlockedError,
  SWRegistrationError,
} from '../errors/common';
import { ServiceWorkerActiveState } from '../helpers/service-worker';
import Log from '../libraries/Log';
import type { ContextSWInterface } from '../models/ContextSW';
import { NotificationPermission } from '../models/NotificationPermission';
import type { PushSubscriptionState } from '../models/PushSubscriptionState';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { Subscription } from '../models/Subscription';
import {
  SubscriptionStrategyKind,
  type SubscriptionStrategyKindValue,
} from '../models/SubscriptionStrategyKind';
import {
  UnsubscriptionStrategy,
  type UnsubscriptionStrategyValue,
} from '../models/UnsubscriptionStrategy';
import Database from '../services/Database';
import OneSignalEvent from '../services/OneSignalEvent';
import { SessionOrigin } from '../session/constants';
import { Browser } from '../useragent/constants';
import { getBrowserName } from '../useragent/detect';
import { base64ToUint8Array } from '../utils/Encoding';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { PermissionUtils } from '../utils/PermissionUtils';
import { logMethodCall } from '../utils/utils';
import { IDManager } from './IDManager';
export const DEFAULT_DEVICE_ID = '99999999-9999-9999-9999-999999999999';

declare let self: ServiceWorkerGlobalScope;

export interface SubscriptionManagerConfig {
  safariWebId?: string;
  appId: string;
  /**
   * The VAPID public key to use for Chrome-like browsers, including Opera and Yandex browser.
   */
  vapidPublicKey?: string;
  /**
   * A globally shared VAPID public key to use for the Firefox browser, which does not use
   * VAPID for authentication but for application identification and uses a single
   */
  onesignalVapidPublicKey?: string;
}

export type SubscriptionStateServiceWorkerNotIntalled = Exclude<
  NotificationTypeValue,
  typeof NotificationType.Subscribed | typeof NotificationType.UserOptedOut
>;

export const updatePushSubscriptionModelWithRawSubscription = async (
  rawPushSubscription: RawPushSubscription,
) => {
  // incase a login op was called before user accepts the notifcations permissions, we need to wait for it to finish
  // otherwise there would be two login ops in the same bucket for LoginOperationExecutor which would error
  await LoginManager.switchingUsersPromise;

  let pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
  // for new users, we need to create a new push subscription model and also save its push id to IndexedDB
  if (!pushModel) {
    pushModel =
      OneSignal.coreDirector.generatePushSubscriptionModel(rawPushSubscription);
    return UserDirector.createUserOnServer();
  }
  // for users with data failed to create a user or user + subscription on the server
  if (IDManager.isLocalId(pushModel.id)) {
    return UserDirector.createUserOnServer();
  }

  // in case of notification state changes, we need to update its web_auth, web_p256, and other keys
  const serializedSubscriptionRecord = new FuturePushSubscriptionRecord(
    rawPushSubscription,
  ).serialize();
  for (const key in serializedSubscriptionRecord) {
    const modelKey = key as keyof typeof serializedSubscriptionRecord;
    pushModel.setProperty(modelKey, serializedSubscriptionRecord[modelKey]);
  }
};

function executeCallback<T>(callback?: (...args: any[]) => T, ...args: any[]) {
  if (callback) {
    // eslint-disable-next-line prefer-spread
    return callback.apply(null, args);
  }
}

const NotImplementedError = new Error('Not implemented');

export class SubscriptionManager {
  private context: ContextSWInterface;
  private config: SubscriptionManagerConfig;
  private safariPermissionPromptFailed = false;

  constructor(context: ContextSWInterface, config: SubscriptionManagerConfig) {
    this.context = context;
    this.config = config;
  }

  /**
   * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise, false.
   * @returns {Promise<boolean>}
   */
  public async isPushNotificationsEnabled(): Promise<boolean> {
    const subscriptionState = await this.getSubscriptionState();
    return subscriptionState.subscribed && !subscriptionState.optedOut;
  }

  /**
   * isOptedIn - true if the user has granted permission and has not opted out.
   * IMPORTANT: This method is not the same as isPushNotificationsEnabled(). isPushNotificationsEnabled() represents
   * the current state of the user's subscription, while isOptedIn() represents the user's intention.
   * @returns {Promise<boolean>}
   */
  async isOptedIn(): Promise<boolean> {
    const subscriptionState = await this.getSubscriptionState();
    const permission =
      await OneSignal.context.permissionManager.getPermissionStatus();
    return permission === 'granted' && !subscriptionState.optedOut;
  }

  /**
   * Legacy method for determining if the user is subscribed.
   * @param callback
   * @returns
   */
  async isOptedOut(
    callback?: (optedOut: boolean | undefined | null) => void,
  ): Promise<boolean | undefined | null> {
    logMethodCall('isOptedOut', callback);
    const { optedOut } = await Database.getSubscription();
    executeCallback(callback, optedOut);
    return optedOut;
  }

  /**
   * Subscribes for a web push subscription.
   *
   * This method can be called from the page context or a webpage a service worker context
   * and will select the correct method.
   */
  public async subscribe(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    let rawPushSubscription: RawPushSubscription;

    if (IS_SERVICE_WORKER) {
      rawPushSubscription =
        await this.subscribeFcmFromWorker(subscriptionStrategy);
    } else {
      /*
        Check our notification permission before subscribing.

        - If notifications are blocked, we can't subscribe.
        - If notifications are granted, the user should be completely resubscribed.
        - If notifications permissions are untouched, the user will be prompted and then
          subscribed.

        Subscribing is only possible on the top-level frame, so there's no permission ambiguity
        here.
      */
      if (
        (await OneSignal.context.permissionManager.getPermissionStatus()) ===
        NotificationPermission.Denied
      )
        throw PermissionBlockedError;

      if (useSafariLegacyPush()) {
        rawPushSubscription = await this.subscribeSafari();
        await updatePushSubscriptionModelWithRawSubscription(
          rawPushSubscription,
        );
        /* Now that permissions have been granted, install the service worker */
        Log.info('Installing SW on Safari');
        try {
          await this.context.serviceWorkerManager.installWorker();
          Log.info('SW on Safari successfully installed');
        } catch (e) {
          Log.error('SW on Safari failed to install.');
        }
      } else {
        rawPushSubscription =
          await this.subscribeFcmFromPage(subscriptionStrategy);
        await updatePushSubscriptionModelWithRawSubscription(
          rawPushSubscription,
        );
      }
    }

    return rawPushSubscription;
  }

  async updateNotificationTypes(): Promise<void> {
    const notificationTypes = await this.getNotificationTypes();
    await this.updatePushSubscriptionNotificationTypes(notificationTypes);
  }

  async getNotificationTypes(): Promise<NotificationTypeValue> {
    const { optedOut } = await Database.getSubscription();
    if (optedOut) {
      return NotificationType.UserOptedOut;
    }

    const permission =
      await OneSignal.context.permissionManager.getPermissionStatus();
    if (permission === 'granted') {
      return NotificationType.Subscribed;
    }

    return NotificationType.NoNativePermission;
  }

  async updatePushSubscriptionNotificationTypes(
    notificationTypes: NotificationTypeValue,
  ): Promise<void> {
    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (!pushModel) {
      Log.info('No Push Subscription yet to update notification_types.');
      return;
    }

    pushModel.notification_types = notificationTypes;
    pushModel.enabled = notificationTypes === NotificationType.Subscribed;
  }

  /**
   * Creates a device record from the provided raw push subscription and forwards this device record
   * to OneSignal to create or update the device ID.
   *
   * @param rawPushSubscription The raw push subscription obtained from calling subscribe(). This
   * can be null, in which case OneSignal's device record is set to unsubscribed.
   *
   * @param subscriptionState TODO: This is no longer used here and needs some refactoring to
   * put this back into place.
   * Describes whether the device record is subscribed, unsubscribed, or in
   * another state. By default, this is set from the availability of rawPushSubscription (exists:
   * Subscribed, null: Unsubscribed). Other use cases may result in creation of a device record that
   * warrants a special subscription state. For example, a device ID can be retrieved by providing
   * an identifier, and a new device record will be created if the identifier didn't exist. These
   * records are marked with a special subscription state for tracking purposes.
   */
  public async registerSubscription(
    pushSubscription: RawPushSubscription | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _subscriptionState?: NotificationTypeValue | null,
  ): Promise<Subscription> {
    /*
      This may be called after the RawPushSubscription has been serialized across a postMessage
      frame. This means it will only have object properties and none of the functions. We have to
      recreate the RawPushSubscription.

      Keep in mind pushSubscription can be null in cases where resubscription isn't possible
      (blocked permission).
    */
    if (pushSubscription) {
      pushSubscription = RawPushSubscription.deserialize(pushSubscription);
    }

    if (await this.isAlreadyRegisteredWithOneSignal()) {
      await this.context.updateManager.sendPushDeviceRecordUpdate();
    } else {
      this.context.sessionManager.upsertSession(SessionOrigin.UserCreate);
    }

    const subscription = await Database.getSubscription();
    // User Model: TO DO: Remove this once we have a better way to determine if the user is subscribed
    subscription.deviceId = DEFAULT_DEVICE_ID;
    subscription.optedOut = false;
    if (pushSubscription) {
      if (useSafariLegacyPush()) {
        subscription.subscriptionToken = pushSubscription.safariDeviceToken;
      } else {
        subscription.subscriptionToken = pushSubscription.w3cEndpoint
          ? pushSubscription.w3cEndpoint.toString()
          : null;
      }
    } else {
      subscription.subscriptionToken = null;
    }
    await Database.setSubscription(subscription);

    if (!IS_SERVICE_WORKER) {
      OneSignalEvent.trigger(OneSignal.EVENTS.REGISTERED);
    }

    if (typeof OneSignal !== 'undefined') {
      OneSignal._sessionInitAlreadyRunning = false;
    }
    return subscription;
  }

  /**
   * Used before subscribing for push, we request notification permissions
   * before installing the service worker to prevent non-subscribers from
   * querying our server for an updated service worker every 24 hours.
   */
  private static async requestPresubscribeNotificationPermission(): Promise<NotificationPermission> {
    return await SubscriptionManager.requestNotificationPermission();
  }

  public async unsubscribe(strategy: UnsubscriptionStrategyValue) {
    if (strategy === UnsubscriptionStrategy.DestroySubscription) {
      throw NotImplementedError;
    } else if (strategy === UnsubscriptionStrategy.MarkUnsubscribed) {
      if (IS_SERVICE_WORKER) {
        await Database.put('Options', { key: 'optedOut', value: true });
      } else {
        throw NotImplementedError;
      }
    } else {
      throw NotImplementedError;
    }
  }

  /**
   * Calls Notification.requestPermission(), but returns a Promise instead of
   * accepting a callback like the actual Notification.requestPermission();
   *
   * window.Notification.requestPermission: The callback was deprecated since Gecko 46 in favor of a Promise
   */
  public static async requestNotificationPermission(): Promise<NotificationPermission> {
    const results = await window.Notification.requestPermission();
    // TODO: Clean up our custom NotificationPermission
    //         in favor of TS union type NotificationPermission instead of converting
    return results as NotificationPermission;
  }

  public async isAlreadyRegisteredWithOneSignal(): Promise<boolean> {
    const { deviceId } = await Database.getSubscription();
    return !!deviceId;
  }

  private async subscribeSafariPromptPermission(): Promise<string | null> {
    const requestPermission = (url: string) => {
      return new Promise<string | null>((resolve) => {
        window.safari?.pushNotification?.requestPermission(
          url,
          this.config.safariWebId,
          { app_id: this.config.appId },
          (response) => {
            if (response && response.deviceToken) {
              resolve(response.deviceToken.toLowerCase());
            } else {
              resolve(null);
            }
          },
        );
      });
    };

    if (!this.safariPermissionPromptFailed) {
      return requestPermission(
        `${getOneSignalApiUrl({
          legacy: true,
        }).toString()}safari/apps/${this.config.appId}`,
      );
    } else {
      // If last attempt failed, retry with the legacy URL
      return requestPermission(
        `${getOneSignalApiUrl({
          legacy: true,
        }).toString()}safari`,
      );
    }
  }

  private async subscribeSafari(): Promise<RawPushSubscription> {
    const pushSubscriptionDetails = new RawPushSubscription();
    if (!this.config.safariWebId) {
      throw MissingSafariWebIdError;
    }

    const { deviceToken: existingDeviceToken } =
      window.safari?.pushNotification?.permission(this.config.safariWebId) ||
      {};

    if (existingDeviceToken) {
      pushSubscriptionDetails.setFromSafariSubscription(
        existingDeviceToken.toLowerCase(),
      );
      return pushSubscriptionDetails;
    }

    /*
      We're about to show the Safari native permission request. It can fail for a number of
      reasons, e.g.:
        - Setup-related reasons when developers just starting to get set up
          - Address bar URL doesn't match safari certificate allowed origins (case-sensitive)
          - Safari web ID doesn't match provided web ID
          - Browsing in a Safari private window
          - Bad icon DPI

      but shouldn't fail for sites that have already gotten Safari working.

      We'll show the permissionPromptDisplay event if the Safari user isn't already subscribed,
      otherwise an already subscribed Safari user would not see the permission request again.
    */
    OneSignalEvent.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
    const deviceToken = await this.subscribeSafariPromptPermission();
    PermissionUtils.triggerNotificationPermissionChanged();
    if (deviceToken) {
      pushSubscriptionDetails.setFromSafariSubscription(deviceToken);
    } else {
      this.safariPermissionPromptFailed = true;
      throw new Error('Safari url/icon/certificate invalid or in private mode');
    }
    return pushSubscriptionDetails;
  }

  private async subscribeFcmFromPage(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    /*
      Before installing the service worker, request notification permissions. If
      the visitor doesn't grant permissions, this saves bandwidth bleeding from
      an unused install service worker periodically fetching an updated version
      from our CDN.
    */

    /*
      Trigger the permissionPromptDisplay event to the best of our knowledge.
    */
    if (
      !IS_SERVICE_WORKER &&
      Notification.permission === NotificationPermission.Default
    ) {
      await OneSignalEvent.trigger(
        OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED,
      );
      const permission =
        await SubscriptionManager.requestPresubscribeNotificationPermission();

      /*
        The native event handler does not broadcast an event for dismissing the
        prompt, because going from "default" permissions to "default"
        permissions isn't a change. We specifically broadcast "default" to "default" changes.
       */
      const forcePermissionChangeEvent =
        permission === NotificationPermission.Default;
      await PermissionUtils.triggerNotificationPermissionChanged(
        forcePermissionChangeEvent,
      );

      // If the user did not grant push permissions, throw and exit
      switch (permission) {
        case NotificationPermission.Default:
          Log.debug(
            'Exiting subscription and not registering worker because the permission was dismissed.',
          );
          OneSignal._sessionInitAlreadyRunning = false;
          throw new Error('Permission dismissed');
        case NotificationPermission.Denied:
          Log.debug(
            'Exiting subscription and not registering worker because the permission was blocked.',
          );
          OneSignal._sessionInitAlreadyRunning = false;
          throw PermissionBlockedError;
      }
    }

    /* Now that permissions have been granted, install the service worker */
    let workerRegistration: ServiceWorkerRegistration | undefined | null;
    try {
      workerRegistration =
        await this.context.serviceWorkerManager.installWorker();
    } catch (err) {
      if (err instanceof SWRegistrationError) {
        // TODO: This doesn't register the subscription any more, most likely broke
        // in some refactoring in the v16 major release. It would be useful if a
        // subscription was created so the customer knows this failed by seeing
        // subscriptions in this state on the OneSignal dashboard.
        if (err.status === 403) {
          await this.context.subscriptionManager.registerFailedSubscription(
            NotificationType.ServiceWorkerStatus403,
            this.context,
          );
        } else if (err.status === 404) {
          await this.context.subscriptionManager.registerFailedSubscription(
            NotificationType.ServiceWorkerStatus404,
            this.context,
          );
        }
      }
      throw err;
    }

    if (!workerRegistration) {
      throw new Error('OneSignal service worker not found!');
    }
    Log.debug(
      '[Subscription Manager] Service worker is ready to continue subscribing.',
    );

    return await this.subscribeWithVapidKey(
      workerRegistration.pushManager,
      subscriptionStrategy,
    );
  }

  public async subscribeFcmFromWorker(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    /*
      We're running inside of the service worker.

      Check to make sure our registration is activated, otherwise we can't
      subscribe for push.

      HACK: Firefox doesn't set self.registration.active in the service worker
      context. From a non-service worker context, like
      navigator.serviceWorker.getRegistration().active, the property actually is
      set, but it's just not set within the service worker context.

      Because of this, we're not able to check for this property on Firefox.
     */

    const swRegistration = self.registration;

    if (!swRegistration.active && getBrowserName() !== Browser.Firefox) {
      throw new Error('SW not activated');
      /*
        Or should we wait for the service worker to be ready?

        await new Promise(resolve => self.onactivate = resolve);
       */
    }

    /*
      Check to make sure push permissions have been granted.
     */
    const pushPermission = await swRegistration.pushManager.permissionState({
      userVisibleOnly: true,
    });
    if (pushPermission === 'denied') {
      throw PermissionBlockedError;
    } else if (pushPermission === 'prompt') {
      throw new Error('Permission not granted');
    }

    return await this.subscribeWithVapidKey(
      swRegistration.pushManager,
      subscriptionStrategy,
    );
  }

  /**
   * Returns the correct VAPID key to use for subscription based on the browser type.
   *
   * If the VAPID key isn't present, undefined is returned instead of null.
   */
  public getVapidKeyForBrowser(): ArrayBuffer | undefined {
    // Specifically return undefined instead of null if the key isn't available
    let key = undefined;

    if (getBrowserName() === Browser.Firefox) {
      /*
        Firefox uses VAPID for application identification instead of
        authentication, and so all apps share an identification key.
       */
      key = this.config.onesignalVapidPublicKey;
    } else {
      /*
        Chrome and Chrome-like browsers including Opera and Yandex use VAPID for
        authentication, and so each app uses a uniquely generated key.
       */
      key = this.config.vapidPublicKey;
    }

    if (key) {
      return base64ToUint8Array(key).buffer as ArrayBuffer;
    } else {
      return undefined;
    }
  }

  /**
   * Uses the browser's PushManager interface to actually subscribe for a web push subscription.
   *
   * @param pushManager An instance of the browser's push manager, either from the page or from the
   * service worker.
   *
   * @param subscriptionStrategy Given an existing push subscription, describes whether the existing
   * push subscription is resubscribed as-is leaving it unchanged, or unsubscribed to make room for
   * a new push subscription.
   */
  public async subscribeWithVapidKey(
    pushManager: PushManager,
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    /*
      Always try subscribing using VAPID by providing an applicationServerKey, except for cases
      where the user is already subscribed, handled below.
     */

    const existingPushSubscription = await pushManager.getSubscription();

    /* Depending on the subscription strategy, handle existing subscription in various ways */
    switch (subscriptionStrategy) {
      case SubscriptionStrategyKind.ResubscribeExisting:
        if (!existingPushSubscription) break;

        if (existingPushSubscription.options) {
          Log.debug(
            "[Subscription Manager] An existing push subscription exists and it's options is not null.",
          );
        } else {
          Log.debug(
            '[Subscription Manager] An existing push subscription exists and options is null. ' +
              'Unsubscribing from push first now.',
          );
          /*
            NOTE: Only applies to rare edge case of migrating from senderId to a VAPID subscription
            There isn't a great solution if PushSubscriptionOptions (supported on Chrome 54+) isn't
            supported.

            We want to subscribe the user, but we don't know whether the user was subscribed via
            GCM's manifest.json or FCM's VAPID.

            This bug (https://bugs.chromium.org/p/chromium/issues/detail?id=692577) shows that a
            mismatched sender ID error is possible if you subscribe via FCM's VAPID while the user
            was originally subscribed via GCM's manifest.json (fails silently).

            Because of this, we should unsubscribe the user from push first and then resubscribe
            them.
          */

          /* We're unsubscribing, so we want to store the created at timestamp */
          await SubscriptionManager.doPushUnsubscribe(existingPushSubscription);
        }
        break;
      case SubscriptionStrategyKind.SubscribeNew:
        /* Since we want a new subscription every time with this strategy, just unsubscribe. */
        if (existingPushSubscription) {
          await SubscriptionManager.doPushUnsubscribe(existingPushSubscription);
        }
        break;
    }

    // Actually subscribe the user to push
    const [newPushSubscription, isNewSubscription] =
      await SubscriptionManager.doPushSubscribe(
        pushManager,
        this.getVapidKeyForBrowser(),
      );

    // Update saved create and expired times
    await SubscriptionManager.updateSubscriptionTime(
      isNewSubscription,
      newPushSubscription.expirationTime,
    );

    // Create our own custom object from the browser's native PushSubscription object
    const pushSubscriptionDetails =
      RawPushSubscription.setFromW3cSubscription(newPushSubscription);
    return pushSubscriptionDetails;
  }

  private static async updateSubscriptionTime(
    updateCreatedAt: boolean,
    expirationTime: number | null,
  ): Promise<void> {
    const bundle = await Database.getSubscription();
    if (updateCreatedAt) {
      bundle.createdAt = new Date().getTime();
    }
    bundle.expirationTime = expirationTime;
    await Database.setSubscription(bundle);
  }

  private static async doPushUnsubscribe(
    pushSubscription: PushSubscription,
  ): Promise<boolean> {
    Log.debug(
      '[Subscription Manager] Unsubscribing existing push subscription.',
    );
    const result = await pushSubscription.unsubscribe();
    Log.debug(
      `[Subscription Manager] Unsubscribing existing push subscription result: ${result}`,
    );
    return result;
  }

  // Subscribes the ServiceWorker for a pushToken.
  // If there is an error doing so unsubscribe from existing and try again
  //    - This handles subscribing to new server VAPID key if it has changed.
  // return type - [PushSubscription, createdNewPushSubscription(boolean)]
  private static async doPushSubscribe(
    pushManager: PushManager,
    applicationServerKey: ArrayBuffer | undefined,
  ): Promise<[PushSubscription, boolean]> {
    if (!applicationServerKey) {
      throw new Error(
        "Missing required 'applicationServerKey' to subscribe for push notifications!",
      );
    }

    const subscriptionOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    };
    Log.debug(
      '[Subscription Manager] Subscribing to web push with these options:',
      subscriptionOptions,
    );
    try {
      const existingSubscription = await pushManager.getSubscription();
      return [
        await pushManager.subscribe(subscriptionOptions),
        !existingSubscription,
      ];
    } catch (e) {
      if (e instanceof Error) {
        // This exception is thrown if the key for the existing applicationServerKey is different,
        //    so we must unregister first.
        // In Chrome, e.message contains will be the following in this case for reference;
        // Registration failed - A subscription with a different applicationServerKey (or gcm_sender_id) already exists;
        //    to change the applicationServerKey, unsubscribe then resubscribe.
        Log.warn(
          "[Subscription Manager] Couldn't re-subscribe due to applicationServerKey changing, " +
            'unsubscribe and attempting to subscribe with new key.',
          e,
        );
        const subscription = await pushManager.getSubscription();
        if (subscription) {
          await SubscriptionManager.doPushUnsubscribe(subscription);
        }
        return [await pushManager.subscribe(subscriptionOptions), true];
      } else throw e; // If some other error, bubble the exception up
    }
  }

  public async isSubscriptionExpiring(): Promise<boolean> {
    const serviceWorkerState =
      await this.context.serviceWorkerManager.getActiveState();
    if (!(serviceWorkerState === ServiceWorkerActiveState.OneSignalWorker)) {
      /* If the service worker isn't activated, there's no subscription to look for */
      return false;
    }

    const serviceWorkerRegistration =
      await this.context.serviceWorkerManager.getOneSignalRegistration();
    if (!serviceWorkerRegistration) return false;

    // It's possible to get here in Safari 11.1+ version
    //   since they released support for service workers but not push api.
    if (!serviceWorkerRegistration.pushManager) return false;

    const pushSubscription =
      await serviceWorkerRegistration.pushManager.getSubscription();
    // Not subscribed to web push
    if (!pushSubscription) return false;

    // No push subscription expiration time
    if (!pushSubscription.expirationTime) return false;

    let { createdAt: subscriptionCreatedAt } = await Database.getSubscription();

    if (!subscriptionCreatedAt) {
      /* If we don't have a record of when the subscription was created, set it into the future to
      guarantee expiration and obtain a new subscription */
      const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
      subscriptionCreatedAt = new Date().getTime() + ONE_YEAR;
    }

    const midpointExpirationTime =
      subscriptionCreatedAt +
      (pushSubscription.expirationTime - subscriptionCreatedAt) / 2;

    return (
      !!pushSubscription.expirationTime &&
      /* The current time (in UTC) is past the expiration time (also in UTC) */
      (new Date().getTime() >= pushSubscription.expirationTime ||
        new Date().getTime() >= midpointExpirationTime)
    );
  }

  /**
   * Returns an object describing the user's actual push subscription state and opt-out status.
   */
  public async getSubscriptionState(): Promise<PushSubscriptionState> {
    if (IS_SERVICE_WORKER) {
      const pushSubscription =
        await self.registration.pushManager.getSubscription();
      const { optedOut } = await Database.getSubscription();
      return {
        subscribed: !!pushSubscription,
        optedOut: !!optedOut,
      };
    }
    /* Regular browser window environments */
    return this.getSubscriptionStateFromBrowserContext();
  }

  private async getSubscriptionStateFromBrowserContext(): Promise<PushSubscriptionState> {
    const { optedOut, subscriptionToken } = await Database.getSubscription();

    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();
    const isValidPushSubscription = isCompleteSubscriptionObject(
      pushSubscriptionModel,
    );

    if (useSafariLegacyPush()) {
      const subscriptionState = window.safari?.pushNotification?.permission(
        this.config.safariWebId,
      );
      const isSubscribedToSafari = !!(
        isValidPushSubscription &&
        subscriptionToken &&
        subscriptionState?.permission === 'granted' &&
        subscriptionState?.deviceToken
      );

      return {
        subscribed: isSubscribedToSafari,
        optedOut: !!optedOut,
      };
    }

    const workerRegistration =
      await this.context.serviceWorkerManager.getOneSignalRegistration();
    const notificationPermission =
      await this.context.permissionManager.getNotificationPermission(
        this.context.appConfig.safariWebId,
      );
    if (!workerRegistration) {
      /* You can't be subscribed without a service worker registration */
      return {
        subscribed: false,
        optedOut: !!optedOut,
      };
    }

    /*
     * Removing pushSubscription from this method due to inconsistent behavior between browsers.
     * Doesn't matter for re-subscribing, worker is present and active.
     * Previous implementation for reference:
     * const pushSubscription = await workerRegistration.pushManager.getSubscription();
     * const isPushEnabled = !!(
     *   pushSubscription &&
     *   deviceId &&
     *   notificationPermission === NotificationPermission.Granted
     * );
     */

    const isPushEnabled = !!(
      isValidPushSubscription &&
      subscriptionToken &&
      notificationPermission === NotificationPermission.Granted
    );

    return {
      subscribed: isPushEnabled,
      optedOut: !!optedOut,
    };
  }

  /**
   * Broadcasting to the server the fact user tried to subscribe but there was an error during service worker registration.
   * Do it only once for the first page view.
   * @param subscriptionState Describes what went wrong with the service worker installation.
   */
  public async registerFailedSubscription(
    subscriptionState: SubscriptionStateServiceWorkerNotIntalled,
    context: ContextSWInterface,
  ) {
    if (context.pageViewManager.isFirstPageView()) {
      context.subscriptionManager.registerSubscription(
        new RawPushSubscription(),
        subscriptionState,
      );
      context.pageViewManager.incrementPageViewCount();
    }
  }
}
