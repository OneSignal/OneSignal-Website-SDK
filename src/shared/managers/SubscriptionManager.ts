import Database from '../services/Database';
import Environment from '../helpers/Environment';
import OneSignalEvent from '../services/OneSignalEvent';
import { ServiceWorkerActiveState } from '../helpers/ServiceWorkerHelper';
import SdkEnvironment from './SdkEnvironment';

import ProxyFrameHost from '../../page/modules/frames/ProxyFrameHost';
import { NotificationPermission } from '../models/NotificationPermission';
import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { Subscription } from '../models/Subscription';
import { UnsubscriptionStrategy } from '../models/UnsubscriptionStrategy';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { IntegrationKind } from '../models/IntegrationKind';

import { PermissionUtils } from '../utils/PermissionUtils';
import { base64ToUint8Array } from '../utils/Encoding';
import { ContextSWInterface } from '../models/ContextSW';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import NotImplementedError from '../errors/NotImplementedError';
import PushPermissionNotGrantedError, {
  PushPermissionNotGrantedErrorReason,
} from '../errors/PushPermissionNotGrantedError';
import { SdkInitError, SdkInitErrorKind } from '../errors/SdkInitError';
import ServiceWorkerRegistrationError from '../errors/ServiceWorkerRegistrationError';
import SubscriptionError, {
  SubscriptionErrorReason,
} from '../errors/SubscriptionError';
import Log from '../libraries/Log';
import { RawPushSubscription } from '../models/RawPushSubscription';
import OneSignalApiShared from '../api/OneSignalApiShared';
import FuturePushSubscriptionRecord from '../../page/userModel/FuturePushSubscriptionRecord';
import {
  FutureSubscriptionModel,
  SupportedSubscription,
} from '../../core/models/SubscriptionModels';
import { StringKeys } from '../../core/models/StringKeys';
import { SessionOrigin } from '../models/Session';
import { executeCallback, logMethodCall } from '../utils/utils';
import UserDirector from '../../onesignal/UserDirector';
import { OSModel } from '../../core/modelRepo/OSModel';
import { isCompleteSubscriptionObject } from '../../core/utils/typePredicates';
import { bowserCastle } from '../utils/bowserCastle';

export interface SubscriptionManagerConfig {
  safariWebId?: string;
  appId: string;
  /**
   * The VAPID public key to use for Chrome-like browsers, including Opera and Yandex browser.
   */
  vapidPublicKey: string;
  /**
   * A globally shared VAPID public key to use for the Firefox browser, which does not use
   * VAPID for authentication but for application identification and uses a single
   */
  onesignalVapidPublicKey: string;
}

export type SubscriptionStateServiceWorkerNotIntalled =
  | SubscriptionStateKind.ServiceWorkerStatus403
  | SubscriptionStateKind.ServiceWorkerStatus404;

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
    callback?: Action<boolean | undefined | null>,
  ): Promise<boolean | undefined | null> {
    logMethodCall('isOptedOut', callback);
    const { optedOut } = await Database.getSubscription();
    executeCallback(callback, optedOut);
    return optedOut;
  }

  /**
   * Subscribes for a web push subscription.
   *
   * This method is aware of different subscription environments like subscribing from a webpage,
   * service worker, or OneSignal HTTP popup and will select the correct method. This is intended to
   * be the single public API for obtaining a raw web push subscription (i.e. what the browser
   * returns from a successful subscription).
   */
  public async subscribe(
    subscriptionStrategy: SubscriptionStrategyKind,
  ): Promise<RawPushSubscription> {
    const env = SdkEnvironment.getWindowEnv();

    switch (env) {
      case WindowEnvironmentKind.CustomIframe:
      case WindowEnvironmentKind.Unknown:
      case WindowEnvironmentKind.OneSignalProxyFrame:
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    let rawPushSubscription: RawPushSubscription;

    switch (env) {
      case WindowEnvironmentKind.ServiceWorker:
        rawPushSubscription =
          await this.subscribeFcmFromWorker(subscriptionStrategy);
        break;
      case WindowEnvironmentKind.Host:
      case WindowEnvironmentKind.OneSignalSubscriptionModal:
      case WindowEnvironmentKind.OneSignalSubscriptionPopup:
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
          throw new PushPermissionNotGrantedError(
            PushPermissionNotGrantedErrorReason.Blocked,
          );

        if (Environment.useSafariLegacyPush()) {
          rawPushSubscription = await this.subscribeSafari();
          await this._updatePushSubscriptionModelWithRawSubscription(
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
          await this._updatePushSubscriptionModelWithRawSubscription(
            rawPushSubscription,
          );
        }
        break;
      default:
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    return rawPushSubscription;
  }

  private async _updatePushSubscriptionModelWithRawSubscription(
    rawPushSubscription: RawPushSubscription,
  ) {
    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();

    if (!pushModel) {
      OneSignal.coreDirector.generatePushSubscriptionModel(rawPushSubscription);
      await UserDirector.createAndHydrateUser();
      return;
    } else {
      // resubscribing. update existing push subscription model
      const serializedSubscriptionRecord = new FuturePushSubscriptionRecord(
        rawPushSubscription,
      ).serialize();
      const keys = Object.keys(
        serializedSubscriptionRecord,
      ) as StringKeys<FutureSubscriptionModel>[];

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (serializedSubscriptionRecord[key]) {
          pushModel.set(key, serializedSubscriptionRecord[key]);
        }
      }
    }
  }

  async updateNotificationTypes(): Promise<void> {
    const notificationTypes = await this.getNotificationTypes();
    await this.updatePushSubscriptionNotificationTypes(notificationTypes);
  }

  async getNotificationTypes(): Promise<SubscriptionStateKind> {
    const { optedOut } = await Database.getSubscription();
    if (optedOut) {
      return SubscriptionStateKind.UserOptedOut;
    }

    const permission =
      await OneSignal.context.permissionManager.getPermissionStatus();
    if (permission === 'granted') {
      return SubscriptionStateKind.Subscribed;
    }

    return SubscriptionStateKind.NoNativePermission;
  }

  async updatePushSubscriptionNotificationTypes(
    notificationTypes: SubscriptionStateKind,
  ): Promise<void> {
    const pushModel = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (!pushModel) {
      Log.info('No Push Subscription yet to update notification_types.');
      return;
    }

    pushModel.set('notification_types', notificationTypes);
    pushModel.set(
      'enabled',
      notificationTypes === SubscriptionStateKind.Subscribed,
    );
  }

  /**
   * Creates a device record from the provided raw push subscription and forwards this device record
   * to OneSignal to create or update the device ID.
   *
   * @param rawPushSubscription The raw push subscription obtained from calling subscribe(). This
   * can be null, in which case OneSignal's device record is set to unsubscribed.
   *
   * @param subscriptionState Describes whether the device record is subscribed, unsubscribed, or in
   * another state. By default, this is set from the availability of rawPushSubscription (exists:
   * Subscribed, null: Unsubscribed). Other use cases may result in creation of a device record that
   * warrants a special subscription state. For example, a device ID can be retrieved by providing
   * an identifier, and a new device record will be created if the identifier didn't exist. These
   * records are marked with a special subscription state for tracking purposes.
   */
  public async registerSubscription(
    pushSubscription: RawPushSubscription,
    subscriptionState?: SubscriptionStateKind,
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
      this.context.sessionManager.upsertSession(SessionOrigin.PlayerCreate);
    }

    const subscription = await Database.getSubscription();
    // User Model: TO DO: Remove this once we have a better way to determine if the user is subscribed
    subscription.deviceId = '99999999-9999-9999-9999-999999999999';
    subscription.optedOut = false;
    if (pushSubscription) {
      if (Environment.useSafariLegacyPush()) {
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

    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
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

  public async unsubscribe(strategy: UnsubscriptionStrategy) {
    if (strategy === UnsubscriptionStrategy.DestroySubscription) {
      throw new NotImplementedError();
    } else if (strategy === UnsubscriptionStrategy.MarkUnsubscribed) {
      if (
        SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.ServiceWorker
      ) {
        await Database.put('Options', { key: 'optedOut', value: true });
      } else {
        throw new NotImplementedError();
      }
    } else {
      throw new NotImplementedError();
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
    // TODO: Clean up our custom NotificationPermission enum
    //         in favor of TS union type NotificationPermission instead of converting
    return NotificationPermission[results];
  }

  /**
   * Called after registering a subscription with OneSignal to associate this subscription with an
   * email record if one exists.
   */
  public async associateSubscriptionWithEmail(newDeviceId: string) {
    const emailProfile = await Database.getEmailProfile();
    if (!emailProfile.subscriptionId) {
      return;
    }

    // Update the push device record with a reference to the new email ID and email address
    await OneSignalApiShared.updatePlayer(this.config.appId, newDeviceId, {
      parent_player_id: emailProfile.subscriptionId,
      email: emailProfile.identifier,
    });
  }

  public async isAlreadyRegisteredWithOneSignal(): Promise<boolean> {
    const { deviceId } = await Database.getSubscription();
    return !!deviceId;
  }

  private async subscribeSafariPromptPermission(): Promise<string | null> {
    const requestPermission = (url: string) => {
      return new Promise<string | null>((resolve) => {
        window.safari.pushNotification.requestPermission(
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
        `${SdkEnvironment.getOneSignalApiUrl().toString()}/safari/apps/${
          this.config.appId
        }`,
      );
    } else {
      // If last attempt failed, retry with the legacy URL
      return requestPermission(
        `${SdkEnvironment.getOneSignalApiUrl().toString()}/safari`,
      );
    }
  }

  private async subscribeSafari(): Promise<RawPushSubscription> {
    const pushSubscriptionDetails = new RawPushSubscription();
    if (!this.config.safariWebId) {
      throw new SdkInitError(SdkInitErrorKind.MissingSafariWebId);
    }

    const { deviceToken: existingDeviceToken } =
      window.safari.pushNotification.permission(this.config.safariWebId);

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
      throw new SubscriptionError(SubscriptionErrorReason.InvalidSafariSetup);
    }
    return pushSubscriptionDetails;
  }

  private async subscribeFcmFromPage(
    subscriptionStrategy: SubscriptionStrategyKind,
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
      SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
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
          throw new PushPermissionNotGrantedError(
            PushPermissionNotGrantedErrorReason.Dismissed,
          );
        case NotificationPermission.Denied:
          Log.debug(
            'Exiting subscription and not registering worker because the permission was blocked.',
          );
          OneSignal._sessionInitAlreadyRunning = false;
          throw new PushPermissionNotGrantedError(
            PushPermissionNotGrantedErrorReason.Blocked,
          );
      }
    }

    /* Now that permissions have been granted, install the service worker */
    let workerRegistration: ServiceWorkerRegistration | undefined | null;
    try {
      workerRegistration =
        await this.context.serviceWorkerManager.installWorker();
    } catch (err) {
      if (err instanceof ServiceWorkerRegistrationError) {
        if (err.status === 403) {
          await this.context.subscriptionManager.registerFailedSubscription(
            SubscriptionStateKind.ServiceWorkerStatus403,
            this.context,
          );
        } else if (err.status === 404) {
          await this.context.subscriptionManager.registerFailedSubscription(
            SubscriptionStateKind.ServiceWorkerStatus404,
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
    subscriptionStrategy: SubscriptionStrategyKind,
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

    const swRegistration = (<ServiceWorkerGlobalScope>(<any>self)).registration;

    if (!swRegistration.active && bowserCastle().name !== 'firefox') {
      throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
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
      throw new PushPermissionNotGrantedError(
        PushPermissionNotGrantedErrorReason.Blocked,
      );
    } else if (pushPermission === 'prompt') {
      throw new PushPermissionNotGrantedError(
        PushPermissionNotGrantedErrorReason.Default,
      );
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

    if (bowserCastle().name === 'firefox') {
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
      return <ArrayBuffer>base64ToUint8Array(key).buffer;
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
    subscriptionStrategy: SubscriptionStrategyKind,
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
      if (e.name == 'InvalidStateError') {
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
    const integrationKind = await SdkEnvironment.getIntegration();
    const windowEnv = SdkEnvironment.getWindowEnv();

    switch (integrationKind) {
      case IntegrationKind.Secure:
        return await this.isSubscriptionExpiringForSecureIntegration();
      case IntegrationKind.SecureProxy:
        if (windowEnv === WindowEnvironmentKind.Host) {
          const proxyFrameHost: ProxyFrameHost = OneSignal.proxyFrameHost;
          if (!proxyFrameHost) {
            throw new InvalidStateError(InvalidStateReason.NoProxyFrame);
          } else {
            return await proxyFrameHost.runCommand<boolean>(
              OneSignal.POSTMAM_COMMANDS.SUBSCRIPTION_EXPIRATION_STATE,
            );
          }
        } else {
          return await this.isSubscriptionExpiringForSecureIntegration();
        }
      case IntegrationKind.InsecureProxy: {
        /* If we're in an insecure frame context, check the stored expiration since we can't access
        the actual push subscription. */
        const { expirationTime } = await Database.getSubscription();
        if (!expirationTime) {
          /* If an existing subscription does not have a stored expiration time, do not
          treat it as expired. The subscription may have been created before this feature was added,
          or the browser may not assign any expiration time. */
          return false;
        }

        /* The current time (in UTC) is past the expiration time (also in UTC) */
        return new Date().getTime() >= expirationTime;
      }
    }
  }

  private async isSubscriptionExpiringForSecureIntegration(): Promise<boolean> {
    const serviceWorkerState =
      await this.context.serviceWorkerManager.getActiveState();
    if (!(serviceWorkerState === ServiceWorkerActiveState.OneSignalWorker)) {
      /* If the service worker isn't activated, there's no subscription to look for */
      return false;
    }

    const serviceWorkerRegistration =
      await this.context.serviceWorkerManager.getRegistration();
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
    /* Safari Legacy supports HTTP so we don't have to use the subdomain workaround. */
    if (Environment.useSafariLegacyPush()) {
      return this.getSubscriptionStateForSecure();
    }

    const windowEnv = SdkEnvironment.getWindowEnv();

    switch (windowEnv) {
      case WindowEnvironmentKind.ServiceWorker: {
        const pushSubscription = await (<ServiceWorkerGlobalScope>(
          (<any>self)
        )).registration.pushManager.getSubscription();
        const { optedOut } = await Database.getSubscription();
        return {
          subscribed: !!pushSubscription,
          optedOut: !!optedOut,
        };
      }
      default: {
        /* Regular browser window environments */
        const integration = await SdkEnvironment.getIntegration();

        switch (integration) {
          case IntegrationKind.Secure:
            return this.getSubscriptionStateForSecure();
          case IntegrationKind.SecureProxy:
            switch (windowEnv) {
              case WindowEnvironmentKind.OneSignalProxyFrame:
              case WindowEnvironmentKind.OneSignalSubscriptionPopup:
              case WindowEnvironmentKind.OneSignalSubscriptionModal:
                return this.getSubscriptionStateForSecure();
              default: {
                /* Re-run this command in the proxy frame */
                const proxyFrameHost: ProxyFrameHost = OneSignal.proxyFrameHost;
                const pushSubscriptionState =
                  await proxyFrameHost.runCommand<PushSubscriptionState>(
                    OneSignal.POSTMAM_COMMANDS.GET_SUBSCRIPTION_STATE,
                  );
                return pushSubscriptionState;
              }
            }
          case IntegrationKind.InsecureProxy:
            return await this.getSubscriptionStateForInsecure();
          default:
            throw new InvalidStateError(
              InvalidStateReason.UnsupportedEnvironment,
            );
        }
      }
    }
  }

  private async getSubscriptionStateForSecure(): Promise<PushSubscriptionState> {
    const { optedOut, subscriptionToken } = await Database.getSubscription();

    const pushSubscriptionOSModel: OSModel<SupportedSubscription> | undefined =
      await OneSignal.coreDirector.getPushSubscriptionModel();
    const isValidPushSubscription =
      isCompleteSubscriptionObject(pushSubscriptionOSModel?.data) &&
      !!pushSubscriptionOSModel?.onesignalId;

    if (Environment.useSafariLegacyPush()) {
      const subscriptionState: SafariRemoteNotificationPermission | undefined =
        window.safari?.pushNotification?.permission(this.config.safariWebId);
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

    const workerState =
      await this.context.serviceWorkerManager.getActiveState();
    const workerRegistration =
      await this.context.serviceWorkerManager.getRegistration();
    const notificationPermission =
      await this.context.permissionManager.getNotificationPermission(
        this.context.appConfig.safariWebId,
      );
    const isWorkerActive =
      workerState === ServiceWorkerActiveState.OneSignalWorker;

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
     *   notificationPermission === NotificationPermission.Granted &&
     *   isWorkerActive
     * );
     */

    const isPushEnabled = !!(
      isValidPushSubscription &&
      subscriptionToken &&
      notificationPermission === NotificationPermission.Granted &&
      isWorkerActive
    );

    return {
      subscribed: isPushEnabled,
      optedOut: !!optedOut,
    };
  }

  private async getSubscriptionStateForInsecure(): Promise<PushSubscriptionState> {
    /* For HTTP, we need to rely on stored values; we never have access to the actual data */
    const { deviceId, subscriptionToken, optedOut } =
      await Database.getSubscription();
    const notificationPermission =
      await this.context.permissionManager.getNotificationPermission(
        this.context.appConfig.safariWebId,
      );

    const isPushEnabled = !!(
      deviceId &&
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
