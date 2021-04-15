import bowser from "bowser";

import Database from "../services/Database";
import OneSignalApiShared from "../OneSignalApiShared";
import { ServiceWorkerManager } from "./ServiceWorkerManager";
import Environment from "../Environment";
import Event from "../Event";
import Log from "../libraries/Log";
import { ServiceWorkerActiveState } from "../helpers/ServiceWorkerHelper";
import SdkEnvironment from "../managers/SdkEnvironment";

import ProxyFrameHost from "../modules/frames/ProxyFrameHost";
import { NotificationPermission } from "../models/NotificationPermission";
import { RawPushSubscription } from "../models/RawPushSubscription";
import { SubscriptionStateKind } from "../models/SubscriptionStateKind";
import { WindowEnvironmentKind } from "../models/WindowEnvironmentKind";
import { Subscription } from "../models/Subscription";
import { UnsubscriptionStrategy } from "../models/UnsubscriptionStrategy";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";
import { IntegrationKind } from "../models/IntegrationKind";
import { InvalidStateError, InvalidStateReason } from "../errors/InvalidStateError";
import PushPermissionNotGrantedError from "../errors/PushPermissionNotGrantedError";
import { PushPermissionNotGrantedErrorReason } from "../errors/PushPermissionNotGrantedError";
import { SdkInitError, SdkInitErrorKind } from "../errors/SdkInitError";
import SubscriptionError from "../errors/SubscriptionError";
import { SubscriptionErrorReason } from "../errors/SubscriptionError";
import ServiceWorkerRegistrationError from "../errors/ServiceWorkerRegistrationError";
import NotImplementedError from "../errors/NotImplementedError";

import { PermissionUtils } from "../utils/PermissionUtils";
import { base64ToUint8Array } from "../utils/Encoding";
import { ContextSWInterface } from '../models/ContextSW';

export interface SubscriptionManagerConfig {
  safariWebId?: string;
  appId: string;
  /**
   * The VAPID public key to use for Chrome-like browsers, including Opera and Yandex browser.
   */
  vapidPublicKey: string;
  /**
   * A globally shared VAPID public key to use for the Firefox browser, which does not use VAPID for authentication but for application identification and uses a single
   */
  onesignalVapidPublicKey: string;
}

export type SubscriptionStateServiceWorkerNotIntalled = 
  SubscriptionStateKind.ServiceWorkerStatus403 | 
  SubscriptionStateKind.ServiceWorkerStatus404;

export class SubscriptionManager {
  private context: ContextSWInterface;
  private config: SubscriptionManagerConfig;

  constructor(context: ContextSWInterface, config: SubscriptionManagerConfig) {
    this.context = context;
    this.config = config;
  }

  static isSafari(): boolean {
    return Environment.isSafari();
  }

  /**
   * Subscribes for a web push subscription.
   *
   * This method is aware of different subscription environments like subscribing from a webpage,
   * service worker, or OneSignal HTTP popup and will select the correct method. This is intended to
   * be the single public API for obtaining a raw web push subscription (i.e. what the browser
   * returns from a successful subscription).
   */
  public async subscribe(subscriptionStrategy: SubscriptionStrategyKind): Promise<RawPushSubscription> {
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
        rawPushSubscription = await this.subscribeFcmFromWorker(subscriptionStrategy);
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
        if ((await OneSignal.privateGetNotificationPermission()) === NotificationPermission.Denied)
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);

        if (SubscriptionManager.isSafari()) {
          rawPushSubscription = await this.subscribeSafari();
          /* Now that permissions have been granted, install the service worker */
          Log.info("Installing SW on Safari");
          try {
            await this.context.serviceWorkerManager.installWorker();
            Log.info("SW on Safari successfully installed");
          } catch(e) {
            Log.error("SW on Safari failed to install.");
          }

        } else {
          rawPushSubscription = await this.subscribeFcmFromPage(subscriptionStrategy);
        }
        break;
      default:
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    return rawPushSubscription;
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

    const deviceRecord: PushDeviceRecord = PushDeviceRecord.createFromPushSubscription(
      this.config.appId,
      pushSubscription,
      subscriptionState
    );

    let newDeviceId: string | undefined = undefined;
    if (await this.isAlreadyRegisteredWithOneSignal()) {
      await this.context.updateManager.sendPlayerUpdate(deviceRecord);
    } else {
      newDeviceId = await this.context.updateManager.sendPlayerCreate(deviceRecord);
      if (newDeviceId) {
        await this.associateSubscriptionWithEmail(newDeviceId);
      }
    }

    const subscription = await Database.getSubscription();
    subscription.deviceId = newDeviceId;
    subscription.optedOut = false;
    if (pushSubscription) {
      if (SubscriptionManager.isSafari()) {
        subscription.subscriptionToken = pushSubscription.safariDeviceToken;
      } else {
        subscription.subscriptionToken = pushSubscription.w3cEndpoint ? pushSubscription.w3cEndpoint.toString() : null;
      }
    } else {
      subscription.subscriptionToken = null;
    }
    await Database.setSubscription(subscription);

    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
      Event.trigger(OneSignal.EVENTS.REGISTERED);
    }

    if (typeof OneSignal !== "undefined") {
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
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.ServiceWorker) {
        const { deviceId } = await Database.getSubscription();

        await OneSignalApiShared.updatePlayer(this.context.appConfig.appId, deviceId, {
          notification_types: SubscriptionStateKind.MutedByApi
        });

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
    if (!emailProfile.playerId) {
      return;
    }

    // Update the push device record with a reference to the new email ID and email address
    await OneSignalApiShared.updatePlayer(
      this.config.appId,
      newDeviceId,
      {
        parent_player_id: emailProfile.playerId,
        email: emailProfile.identifier
      }
    );
  }

  public async isAlreadyRegisteredWithOneSignal(): Promise<boolean> {
    const { deviceId } = await Database.getSubscription();
    return !!deviceId;
  }

  private subscribeSafariPromptPermission(): Promise<string | null> {
    return new Promise<string>(resolve => {
      window.safari.pushNotification.requestPermission(
        `${SdkEnvironment.getOneSignalApiUrl().toString()}/safari`,
        this.config.safariWebId,
        {
          app_id: this.config.appId
        },
        response => {
          if ((response as any).deviceToken) {
            resolve((response as any).deviceToken.toLowerCase());
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  private async subscribeSafari(): Promise<RawPushSubscription> {
    const pushSubscriptionDetails = new RawPushSubscription();
    if (!this.config.safariWebId) {
      throw new SdkInitError(SdkInitErrorKind.MissingSafariWebId);
    }

    const { deviceToken: existingDeviceToken } = window.safari.pushNotification.permission(this.config.safariWebId);
    pushSubscriptionDetails.existingSafariDeviceToken = existingDeviceToken;

    if (!existingDeviceToken) {
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
      Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
    }
    const deviceToken = await this.subscribeSafariPromptPermission();
    PermissionUtils.triggerNotificationPermissionChanged();
    if (deviceToken) {
      pushSubscriptionDetails.setFromSafariSubscription(deviceToken);
    } else {
      throw new SubscriptionError(SubscriptionErrorReason.InvalidSafariSetup);
    }
    return pushSubscriptionDetails;
  }

  private async subscribeFcmFromPage(
    subscriptionStrategy: SubscriptionStrategyKind
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
      await Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
      const permission = await SubscriptionManager.requestPresubscribeNotificationPermission();

      /*
        Notification permission changes are already broadcast by the page's
        notificationpermissionchange handler. This means that allowing or
        denying the permission prompt will cause double events. However, the
        native event handler does not broadcast an event for dismissing the
        prompt, because going from "default" permissions to "default"
        permissions isn't a change. We specifically broadcast "default" to "default" changes.
       */
      if (permission === NotificationPermission.Default)
        await PermissionUtils.triggerNotificationPermissionChanged(true);

      // If the user did not grant push permissions, throw and exit
      switch (permission) {
        case NotificationPermission.Default:
          Log.debug('Exiting subscription and not registering worker because the permission was dismissed.');
          OneSignal._sessionInitAlreadyRunning = false;
          OneSignal._isRegisteringForPush = false;
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Dismissed);
        case NotificationPermission.Denied:
          Log.debug('Exiting subscription and not registering worker because the permission was blocked.');
          OneSignal._sessionInitAlreadyRunning = false;
          OneSignal._isRegisteringForPush = false;
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
      }
    }

    /* Now that permissions have been granted, install the service worker */
    try {
      await this.context.serviceWorkerManager.installWorker();
    } catch(err) {
      if (err instanceof ServiceWorkerRegistrationError) {
        if (err.status === 403) {
          await this.context.subscriptionManager.registerFailedSubscription(
            SubscriptionStateKind.ServiceWorkerStatus403, 
            this.context);
        } else if (err.status === 404) {
          await this.context.subscriptionManager.registerFailedSubscription(
            SubscriptionStateKind.ServiceWorkerStatus404,
            this.context);
        } 
      } 
      throw err;
    }

    Log.debug('[Subscription Manager] Getting OneSignal service Worker...');
    const workerRegistration = await this.context.serviceWorkerManager.getRegistration();
    if (!workerRegistration) {
      throw new Error("OneSignal service worker not found!");
    }
    Log.debug('[Subscription Manager] Service worker is ready to continue subscribing.');

    return await this.subscribeWithVapidKey(workerRegistration.pushManager, subscriptionStrategy);
  }

  public async subscribeFcmFromWorker(
    subscriptionStrategy: SubscriptionStrategyKind
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

    const swRegistration = (<ServiceWorkerGlobalScope><any>self).registration;

    if (!swRegistration.active && !bowser.firefox) {
      throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
      /*
        Or should we wait for the service worker to be ready?

        await new Promise(resolve => self.onactivate = resolve);
       */
    }

    /*
      Check to make sure push permissions have been granted.
     */
    const pushPermission = await swRegistration.pushManager.permissionState({ userVisibleOnly: true });
    if (pushPermission === 'denied') {
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
    } else if (pushPermission === 'prompt') {
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Default);
    }

    return await this.subscribeWithVapidKey(swRegistration.pushManager, subscriptionStrategy);
  }

  /**
   * Returns the correct VAPID key to use for subscription based on the browser type.
   *
   * If the VAPID key isn't present, undefined is returned instead of null.
   */
  public getVapidKeyForBrowser(): ArrayBuffer | undefined {
    // Specifically return undefined instead of null if the key isn't available
    let key = undefined;

    if (bowser.firefox) {
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
    subscriptionStrategy: SubscriptionStrategyKind
  ): Promise<RawPushSubscription> {
    /*
      Always try subscribing using VAPID by providing an applicationServerKey, except for cases
      where the user is already subscribed, handled below.
     */

    const existingPushSubscription = await pushManager.getSubscription();

    /* Depending on the subscription strategy, handle existing subscription in various ways */
    switch (subscriptionStrategy) {
      case SubscriptionStrategyKind.ResubscribeExisting:
        if (!existingPushSubscription)
          break;

        if (existingPushSubscription.options) {
          Log.debug("[Subscription Manager] An existing push subscription exists and it's options is not null.");
        }
        else {
          Log.debug('[Subscription Manager] An existing push subscription exists and options is null. ' +
            'Unsubscribing from push first now.');
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
      await SubscriptionManager.doPushSubscribe(pushManager, this.getVapidKeyForBrowser());

    // Update saved create and expired times
    await SubscriptionManager.updateSubscriptionTime(isNewSubscription, newPushSubscription.expirationTime);

    // Create our own custom object from the browser's native PushSubscription object
    const pushSubscriptionDetails = RawPushSubscription.setFromW3cSubscription(newPushSubscription);
    if (existingPushSubscription) {
      pushSubscriptionDetails.existingW3cPushSubscription =
        RawPushSubscription.setFromW3cSubscription(existingPushSubscription);
    }
    return pushSubscriptionDetails;
  }

  private static async updateSubscriptionTime(updateCreatedAt: boolean, expirationTime: number | null): Promise<void> {
    const bundle = await Database.getSubscription();
    if (updateCreatedAt) {
      bundle.createdAt = new Date().getTime();
    }
    bundle.expirationTime = expirationTime;
    await Database.setSubscription(bundle);
  }

  private static async doPushUnsubscribe(pushSubscription: PushSubscription): Promise<boolean> {
    Log.debug('[Subscription Manager] Unsubscribing existing push subscription.');
    const result = await pushSubscription.unsubscribe();
    Log.debug(`[Subscription Manager] Unsubscribing existing push subscription result: ${result}`);
    return result;
  }

  // Subscribes the ServiceWorker for a pushToken.
  // If there is an error doing so unsubscribe from existing and try again
  //    - This handles subscribing to new server VAPID key if it has changed.
  // return type - [PushSubscription, createdNewPushSubscription(boolean)]
  private static async doPushSubscribe(
    pushManager: PushManager,
    applicationServerKey: ArrayBuffer | undefined)
    :Promise<[PushSubscription, boolean]> {

    if (!applicationServerKey) {
      throw new Error("Missing required 'applicationServerKey' to subscribe for push notifications!");
    }

    const subscriptionOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    };
    Log.debug('[Subscription Manager] Subscribing to web push with these options:', subscriptionOptions);
    try {
      const existingSubscription = await pushManager.getSubscription();
      return [await pushManager.subscribe(subscriptionOptions), !existingSubscription];
    } catch (e) {
      if (e.name == "InvalidStateError") {
        // This exception is thrown if the key for the existing applicationServerKey is different,
        //    so we must unregister first.
        // In Chrome, e.message contains will be the following in this case for reference;
        // Registration failed - A subscription with a different applicationServerKey (or gcm_sender_id) already exists;
        //    to change the applicationServerKey, unsubscribe then resubscribe.
        Log.warn("[Subscription Manager] Couldn't re-subscribe due to applicationServerKey changing, " +
          "unsubscribe and attempting to subscribe with new key.", e);
        const subscription = await pushManager.getSubscription();
        if (subscription) {
          await SubscriptionManager.doPushUnsubscribe(subscription);
        }
        return [await pushManager.subscribe(subscriptionOptions), true];
      }
      else
        throw e; // If some other error, bubble the exception up
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
              OneSignal.POSTMAM_COMMANDS.SUBSCRIPTION_EXPIRATION_STATE
            );
          }
        } else {
          return await this.isSubscriptionExpiringForSecureIntegration();
        }
      case IntegrationKind.InsecureProxy:
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

  private async isSubscriptionExpiringForSecureIntegration(): Promise<boolean> {
    const serviceWorkerState = await this.context.serviceWorkerManager.getActiveState();
    if (!(
      serviceWorkerState === ServiceWorkerActiveState.WorkerA ||
      serviceWorkerState === ServiceWorkerActiveState.WorkerB)) {
        /* If the service worker isn't activated, there's no subscription to look for */
        return false;
    }

    const serviceWorkerRegistration = await this.context.serviceWorkerManager.getRegistration();
    if (!serviceWorkerRegistration)
      return false;

    // It's possible to get here in Safari 11.1+ version
    //   since they released support for service workers but not push api.
    if (!serviceWorkerRegistration.pushManager)
      return false;

    const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
    // Not subscribed to web push
    if (!pushSubscription)
      return false;

    // No push subscription expiration time
    if (!pushSubscription.expirationTime)
      return false;

    let { createdAt: subscriptionCreatedAt } = await Database.getSubscription();

    if (!subscriptionCreatedAt) {
      /* If we don't have a record of when the subscription was created, set it into the future to
      guarantee expiration and obtain a new subscription */
      const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
      subscriptionCreatedAt = new Date().getTime() + ONE_YEAR;
    }

    const midpointExpirationTime =
      subscriptionCreatedAt + ((pushSubscription.expirationTime - subscriptionCreatedAt) / 2);

    return !!pushSubscription.expirationTime && (
      /* The current time (in UTC) is past the expiration time (also in UTC) */
      new Date().getTime() >= pushSubscription.expirationTime ||
      new Date().getTime() >= midpointExpirationTime
    );
  }

  /**
   * Returns an object describing the user's actual push subscription state and opt-out status.
   */
  public async getSubscriptionState(): Promise<PushSubscriptionState> {
    /* Safari should always return Secure because HTTP doesn't apply on Safari */
    if (SubscriptionManager.isSafari()) {
      return this.getSubscriptionStateForSecure();
    }

    const windowEnv = SdkEnvironment.getWindowEnv();

    switch (windowEnv) {
      case WindowEnvironmentKind.ServiceWorker:
        const pushSubscription = await (<ServiceWorkerGlobalScope><any>self).registration.pushManager.getSubscription();
        const { optedOut } = await Database.getSubscription();
        return {
          subscribed: !!pushSubscription,
          optedOut: !!optedOut
        };
      default:
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
              default:
                /* Re-run this command in the proxy frame */
                const proxyFrameHost: ProxyFrameHost = OneSignal.proxyFrameHost;
                const pushSubscriptionState = await proxyFrameHost.runCommand<PushSubscriptionState>(
                  OneSignal.POSTMAM_COMMANDS.GET_SUBSCRIPTION_STATE
                );
                return pushSubscriptionState;
            }
          case IntegrationKind.InsecureProxy:
            return await this.getSubscriptionStateForInsecure();
          default:
            throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
        }
    }
  }

  private async getSubscriptionStateForSecure(): Promise<PushSubscriptionState> {
    const { deviceId, optedOut } = await Database.getSubscription();

    if (SubscriptionManager.isSafari()) {
      const subscriptionState: SafariRemoteNotificationPermission =
        window.safari.pushNotification.permission(this.config.safariWebId);
      const isSubscribedToSafari = !!(
        subscriptionState.permission === "granted" &&
        subscriptionState.deviceToken &&
        deviceId
      );

      return {
        subscribed: isSubscribedToSafari,
        optedOut: !!optedOut,
      };
    }

    const workerState = await this.context.serviceWorkerManager.getActiveState();
    const workerRegistration = await this.context.serviceWorkerManager.getRegistration();
    const notificationPermission =
      await this.context.permissionManager.getNotificationPermission(this.context.appConfig.safariWebId);
    const isWorkerActive = (
      workerState === ServiceWorkerActiveState.WorkerA ||
      workerState === ServiceWorkerActiveState.WorkerB
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
     *   notificationPermission === NotificationPermission.Granted &&
     *   isWorkerActive
     * );
     */

    const isPushEnabled = !!(
      deviceId &&
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
    const { deviceId, subscriptionToken, optedOut } = await Database.getSubscription();
    const notificationPermission =
      await this.context.permissionManager.getNotificationPermission(this.context.appConfig.safariWebId);

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
    context: ContextSWInterface) {
    if (context.pageViewManager.isFirstPageView()) {
      context.subscriptionManager.registerSubscription(new RawPushSubscription(), subscriptionState);
      context.pageViewManager.incrementPageViewCount();
    }
  }
}
