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

        if (SubscriptionManager.isSafari())
          rawPushSubscription = await this.subscribeSafari();
        else
          rawPushSubscription = await this.subscribeFcmFromPage(subscriptionStrategy);
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
  public static requestNotificationPermission(): Promise<NotificationPermission> {
    return new Promise(resolve => window.Notification.requestPermission(resolve));
  }

  /**
   * Called after registering a subscription with OneSignal to associate this subscription with an
   * email record if one exists.
   */
  public async associateSubscriptionWithEmail(newDeviceId: string) {
    const emailProfile = await Database.getEmailProfile();
    if (!emailProfile.emailId) {
      return;
    }

    // Update the push device record with a reference to the new email ID and email address
    await OneSignalApiShared.updatePlayer(
      this.config.appId,
      newDeviceId,
      {
        parent_player_id: emailProfile.emailId,
        email: emailProfile.emailAddress
      }
    );
  }

  public async isAlreadyRegisteredWithOneSignal() {
    const { deviceId } = await Database.getSubscription();
    return !!deviceId;
  }

  // console.log(`${SdkEnvironment.getOneSignalApiUrl().toString()}/safari`, this.config.safariWebId, JSON.stringify({app_id: this.config.appId}))
  // window.safari.pushNotification.requestPermission(
  //   "https://localhost:3001/api/v1/safari",
  //   "web.onesignal.auto.002ea938-3ebd-4740-ada1-6c17c5eb4600",
  //   {app_id: "f20a2ec4-0f6b-42c6-a9d9-046cb0b346ff"},
  //   (perm_data) => { console.log(666, perm_data, perm_data.permission) }
  // );
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
    console.log(555);
    const deviceToken = await this.subscribeSafariPromptPermission();
    console.log(666);
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
      window.Notification.permission === NotificationPermission.Default
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
    if (await this.context.serviceWorkerManager.shouldInstallWorker()) {
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
    }
      

    Log.debug('Waiting for the service worker to activate...');
    const workerRegistration = await navigator.serviceWorker.ready;
    Log.debug('Service worker is ready to continue subscribing.');

    return await this.subscribeFcmVapidOrLegacyKey(workerRegistration.pushManager, subscriptionStrategy);
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
    if (!self.registration.active && !bowser.firefox) {
      throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
      /*
        Or should we wait for the service worker to be ready?

        await new Promise(resolve => self.onactivate = resolve);
       */
    }

    /*
      Check to make sure push permissions have been granted.
     */
    const pushPermission = await self.registration.pushManager.permissionState({ userVisibleOnly: true });
    if (pushPermission === 'denied') {
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
    } else if (pushPermission === 'prompt') {
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Default);
    }

    return await this.subscribeFcmVapidOrLegacyKey(self.registration.pushManager, subscriptionStrategy);
  }

  /**
   * Returns the correct VAPID key to use for subscription based on the browser type.
   *
   * If the VAPID key isn't present, undefined is returned instead of null.
   */
  public getVapidKeyForBrowser(): ArrayBuffer {
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
  public async subscribeFcmVapidOrLegacyKey(
    pushManager: PushManager,
    subscriptionStrategy: SubscriptionStrategyKind
  ): Promise<RawPushSubscription> {
    /*
      Always try subscribing using VAPID by providing an applicationServerKey, except for cases
      where the user is already subscribed, handled below. If browser doesn't support VAPID's
      applicationServerKey property, our extra options will be safely ignored, and a non-VAPID
      subscription will be automatically returned.
     */
    let subscriptionOptions = {
      userVisibleOnly: true,
      applicationServerKey: this.getVapidKeyForBrowser() ? this.getVapidKeyForBrowser() : undefined
    };

    let newPushSubscription: PushSubscription;

    /*
      Is there an existing push subscription?

      If so, and if we're on Chrome 54+, we can use its details to resubscribe
      without any extra info needed.
     */
    const existingPushSubscription = await pushManager.getSubscription();

    /* Record the subscription created at timestamp only if this is a new subscription */
    let shouldRecordSubscriptionCreatedAt = !existingPushSubscription;

    /* Depending on the subscription strategy, handle existing subscription in various ways */
    switch (subscriptionStrategy) {
      case SubscriptionStrategyKind.ResubscribeExisting:
        /* Use the existing push subscription's PushSubscriptionOptions if it exists to resubscribe
        an identical unchanged subscription, or unsubscribe this existing push subscription if
        PushSubscriptionOptions is null. */

        if (existingPushSubscription && existingPushSubscription.options) {
          Log.debug('[Subscription Manager] An existing push subscription exists and options is not null. ' +
            'Using existing options to resubscribe.');
          /*
            Hopefully we're on Chrome 54+, so we can use PushSubscriptionOptions to get the exact
            applicationServerKey to use, without needing to assume a manifest.json exists or passing
            in our VAPID key and dealing with potential mismatched sender ID issues.
          */

          /*
            Overwrite our subscription options to use the exact same subscription options we used to
            subscribe in the first place. The previous always-use-VAPID assignment is overriden by
            this assignment.
          */
          subscriptionOptions = existingPushSubscription.options;

          /* If we're not subscribing a new subscription, don't overwrite the created at timestamp */
          shouldRecordSubscriptionCreatedAt = false;
        } else if (existingPushSubscription && !existingPushSubscription.options) {
          Log.debug('[Subscription Manager] An existing push subscription exists and options is null. ' +
            'Unsubscribing from push first now.');
          /*
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
          await existingPushSubscription.unsubscribe();

          /* We're unsubscribing, so we want to store the created at timestamp */
          shouldRecordSubscriptionCreatedAt = false;
        }
        break;
      case SubscriptionStrategyKind.SubscribeNew:
        /* Since we want a new subscription every time with this strategy, just unsubscribe. */
        if (existingPushSubscription) {
          Log.debug('[Subscription Manager] Unsubscribing existing push subscription.');
          await existingPushSubscription.unsubscribe();
        }

        // Always record the subscription if we're resubscribing
        shouldRecordSubscriptionCreatedAt = true;
        break;
    }

    // Actually subscribe the user to push
    Log.debug('[Subscription Manager] Subscribing to web push with these options:', subscriptionOptions);
    newPushSubscription = await pushManager.subscribe(subscriptionOptions);

    if (shouldRecordSubscriptionCreatedAt) {
      const bundle = await Database.getSubscription();
      bundle.createdAt = new Date().getTime();
      bundle.expirationTime = newPushSubscription.expirationTime;
      await Database.setSubscription(bundle);
    }

    // Create our own custom object from the browser's native PushSubscription object
    const pushSubscriptionDetails = RawPushSubscription.setFromW3cSubscription(newPushSubscription);
    if (existingPushSubscription) {
      pushSubscriptionDetails.existingW3cPushSubscription =
        RawPushSubscription.setFromW3cSubscription(existingPushSubscription);
    }
    return pushSubscriptionDetails;
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

    const serviceWorkerRegistration = await ServiceWorkerManager.getRegistration();
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
        const pushSubscription = await self.registration.pushManager.getSubscription();
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
      const subscriptionState: SafarPushSubscriptionState = window.safari.pushNotification.permission(this.config.safariWebId);
      const isSubscribedToSafari = !!(subscriptionState.permission === "granted" &&
        subscriptionState.deviceToken &&
        deviceId
      );

      return {
        subscribed: isSubscribedToSafari,
        optedOut: !!optedOut,
      };
    }

    const workerState = await this.context.serviceWorkerManager.getActiveState();
    const workerRegistration = await ServiceWorkerManager.getRegistration();
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
    if (context.sessionManager.isFirstPageView()) {
      context.subscriptionManager.registerSubscription(new RawPushSubscription(), subscriptionState);
      context.sessionManager.incrementPageViewCount();
    }
  }
}
