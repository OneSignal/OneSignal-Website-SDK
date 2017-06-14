import * as Browser from 'bowser';
import * as log from 'loglevel';

import Environment from '../Environment';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import { SdkInitError, SdkInitErrorKind } from '../errors/SdkInitError';
import SubscriptionError from '../errors/SubscriptionError';
import { SubscriptionErrorReason } from '../errors/SubscriptionError';
import Event from '../Event';
import EventHelper from '../helpers/EventHelper';
import MainHelper from '../helpers/MainHelper';
import Context from '../models/Context';
import { DeliveryPlatformKind } from '../models/DeliveryPlatformKind';
import { NotificationPermission } from '../models/NotificationPermission';
import { PushRegistration } from '../models/PushRegistration';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { SubscriptionStateKind } from '../models/SubscriptionStateKind';
import { Uuid } from '../models/Uuid';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import OneSignalApi from '../OneSignalApi';
import Database from '../services/Database';
import SdkEnvironment from './SdkEnvironment';
import { Subscription } from '../models/Subscription';
import { UnsubscriptionStrategy } from '../models/UnsubscriptionStrategy';
import NotImplementedError from '../errors/NotImplementedError';
import { base64ToUint8Array } from '../utils/Encoding';

export interface SubscriptionManagerConfig {
  safariWebId: string;
  appId: Uuid;
  /**
   * The VAPID public key to use for Chrome-like browsers, including Opera and Yandex browser.
   */
  vapidPublicKey: string;
  /**
   * A globally shared VAPID public key to use for the Firefox browser, which does not use VAPID for authentication but for application identification and uses a single
   */
  onesignalVapidPublicKey: string;
}

export class SubscriptionManager {
  private context: Context;
  private config: SubscriptionManagerConfig;

  constructor(context: Context, config: SubscriptionManagerConfig) {
    this.context = context;
    this.config = config;
  }

  isSafari(): boolean {
    return Browser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
  }

  public async subscribe(): Promise<Subscription> {
    const env = SdkEnvironment.getWindowEnv();

    switch (env) {
      case WindowEnvironmentKind.CustomIframe:
      case WindowEnvironmentKind.Unknown:
      case WindowEnvironmentKind.OneSignalSubscriptionModal:
      case WindowEnvironmentKind.OneSignalSubscriptionPopup:
      case WindowEnvironmentKind.OneSignalProxyFrame:
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    let rawPushSubscription: RawPushSubscription;

    switch (env) {
      case WindowEnvironmentKind.ServiceWorker:
        rawPushSubscription = await this.subscribeFcmFromWorker();
        break;
      case WindowEnvironmentKind.Host:
        /*
          Check our notification permission before subscribing.

          - If notifications are blocked, we can't subscribe.
          - If notifications are granted, the user should be completely resubscribed.
          - If notifications permissions are untouched, the user will be prompted and then subscribed.
        */
        if ((await OneSignal.getNotificationPermission()) === NotificationPermission.Denied) {
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
        }

        if (this.isSafari()) {
          rawPushSubscription = await this.subscribeSafari();
          EventHelper.triggerNotificationPermissionChanged();
        } else {
          rawPushSubscription = await this.subscribeFcmFromPage();
        }
        break;
    }

    return this.registerSubscriptionWithOneSignal(rawPushSubscription);
  }

  public async subscribePartially(): Promise<RawPushSubscription> {
    return await this.subscribeFcmFromPage();
  }

  /**
   * Used before subscribing for push, we request notification permissions
   * before installing the service worker to prevent non-subscribers from
   * querying our server for an updated service worker every 24 hours.
   */
  private async requestPresubscribeNotificationPermission(): Promise<NotificationPermission> {
    return SubscriptionManager.requestNotificationPermission();
  }

  public async unsubscribe(strategy: UnsubscriptionStrategy) {
    if (strategy === UnsubscriptionStrategy.DestroySubscription) {
      throw new NotImplementedError();
    } else if (strategy === UnsubscriptionStrategy.MarkUnsubscribed) {
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.ServiceWorker) {
        const { deviceId } = await Database.getSubscription();

        await OneSignalApi.updatePlayer(this.context.appConfig.appId, deviceId, {
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
   */
  public static requestNotificationPermission(): Promise<NotificationPermission> {
    return new Promise(resolve => window.Notification.requestPermission(resolve));
  }

  public async registerSubscriptionWithOneSignal(pushSubscription: RawPushSubscription): Promise<Subscription> {
    let pushRegistration = new PushRegistration();

    pushRegistration.appId = this.config.appId;

    if (this.isSafari()) {
      pushRegistration.deliveryPlatform = DeliveryPlatformKind.Safari;
    } else if (Browser.firefox) {
      pushRegistration.deliveryPlatform = DeliveryPlatformKind.Firefox;
    } else {
      pushRegistration.deliveryPlatform = DeliveryPlatformKind.ChromeLike;
    }

    pushRegistration.subscriptionState = SubscriptionStateKind.Subscribed;
    pushSubscription = RawPushSubscription.deserialize(pushSubscription);
    pushRegistration.subscription = pushSubscription;

    let newDeviceId: Uuid;
    if (await this.isAlreadyRegisteredWithOneSignal()) {
      const { deviceId } = await Database.getSubscription();
      if (pushSubscription.isNewSubscription()) {
        newDeviceId = await OneSignalApi.updateUserSession(deviceId, pushRegistration);
      } else {
        // The subscription hasn't changed; don't register with OneSignal and reuse the existing device ID
        newDeviceId = deviceId;
        log.debug(
          'The existing push subscription was resubscribed, but not registering with OneSignal because the new subscription is identical.'
        );
      }
    } else {
      const id = await OneSignalApi.createUser(pushRegistration);
      newDeviceId = id;
    }
    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
      Event.trigger(OneSignal.EVENTS.REGISTERED);
    }

    const subscription = new Subscription();
    subscription.deviceId = newDeviceId;
    subscription.optedOut = false;
    if (this.isSafari()) {
      subscription.subscriptionToken = pushSubscription.safariDeviceToken;
    } else {
      subscription.subscriptionToken = pushSubscription.w3cEndpoint.toString();
    }

    await Database.setSubscription(subscription);

    return subscription;
  }

  private async isAlreadyRegisteredWithOneSignal() {
    const { deviceId } = await Database.getSubscription();
    return !!deviceId.value;
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

    const deviceToken = await this.subscribeSafariPromptPermission();
    if (deviceToken) {
      pushSubscriptionDetails.setFromSafariSubscription(deviceToken);
    } else {
      throw new SubscriptionError(SubscriptionErrorReason.InvalidSafariSetup);
    }
    return pushSubscriptionDetails;
  }

  private async subscribeFcmFromPage(): Promise<RawPushSubscription> {
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
      Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
      const permission = await this.requestPresubscribeNotificationPermission();

      /*
        Notification permission changes are already broadcast by the page's
        notificationpermissionchange handler. This means that allowing or
        denying the permission prompt will cause double events. However, the
        native event handler does not broadcast an event for dismissing the
        prompt, because going from "default" permissions to "default"
        permissions isn't a change. We specifically broadcast "default" to "default" changes.
       */
      if (permission === NotificationPermission.Default) {
        EventHelper.triggerNotificationPermissionChanged(true);
      }
      // If the user did not grant push permissions, throw and exit
      switch (permission) {
        case NotificationPermission.Default:
          log.debug('Exiting subscription and not registering worker because the permission was dismissed.');
          OneSignal._sessionInitAlreadyRunning = false;
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Dismissed);
        case NotificationPermission.Denied:
          log.debug('Exiting subscription and not registering worker because the permission was blocked.');
          OneSignal._sessionInitAlreadyRunning = false;
          throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
      }
    }

    /* Now that permissions have been granted, install the service worker */
    if (await this.context.serviceWorkerManager.shouldInstallWorker()) {
      await this.context.serviceWorkerManager.installWorker();
    }

    log.debug('Waiting for the service worker to activate...');
    const workerRegistration = await navigator.serviceWorker.ready;
    log.debug('Service worker is ready to continue subscribing.');

    return await this.subscribeFcmVapidOrLegacyKey(workerRegistration);
  }

  private async subscribeFcmFromWorker(): Promise<RawPushSubscription> {
    /*
      We're running inside of the service worker.

      Check to make sure our registration is activated, otherwise we can't
      subscribe for push.
     */
    if (!self.registration.active) {
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
      OneSignal._sessionInitAlreadyRunning = false;
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
    } else if (pushPermission === 'prompt') {
      OneSignal._sessionInitAlreadyRunning = false;
      throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Default);
    }

    return await this.subscribeFcmVapidOrLegacyKey(self.registration);
  }

  /**
   * Returns the correct VAPID key to use for subscription based on the browser type.
   *
   * If the VAPID key isn't present, undefined is returned instead of null.
   */
  public getVapidKeyForBrowser(): ArrayBuffer {
    // Specifically return undefined instead of null if the key isn't available
    let key = undefined;

    if (Browser.firefox) {
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
   * Creates a new push subscription or resubscribes an existing push subscription.
   *
   * In cases where details of the existing push subscription can't be found,
   * the user is first unsubscribed.
   *
   * Given an existing legacy GCM subscription, this function does not try to
   * migrate the subscription to VAPID; this isn't possible unless the user is
   * first unsubscribed, and unsubscribing frequently can be a little risky.
   */
  public async subscribeFcmVapidOrLegacyKey(
    workerRegistration: ServiceWorkerRegistration
  ): Promise<RawPushSubscription> {
    /*
      Always try subscribing using VAPID (except for cases where the user is
      already subscribed, handled below). If a browser doesn't support VAPID,
      our extra options will be safely ignored, and a non-VAPID subscription
      will be automatically returned.
     */
    let options = {
      userVisibleOnly: true,
      applicationServerKey: this.getVapidKeyForBrowser() ? this.getVapidKeyForBrowser() : undefined
    };

    let newPushSubscription: PushSubscription;

    /*
      Is there an existing push subscription?

      If so, and if we're on Chrome 54+, we can use its details to resubscribe
      without any extra info needed.
     */
    const existingPushSubscription = await workerRegistration.pushManager.getSubscription();

    if (existingPushSubscription && existingPushSubscription.options) {
      log.debug('[Subscription Manager] An existing push subscription exists and options is not null. Using existing options to resubscribe.');
      /*
        Hopefully we're on Chrome 54+, so we can use PushSubscriptionOptions to
        get the exact applicationServerKey to use, without needing to assume a
        manifest.json exists or passing in our VAPID key and dealing with
        potential mismatched sender ID issues.
      */

      /*
        Overwrite our subscription options to use the exact same subscription
        options we used to subscribe in the first place. The previous
        always-use-VAPID assignment is overriden by this assignment.
       */
      options = existingPushSubscription.options;
    } else if (existingPushSubscription && !existingPushSubscription.options) {
      log.debug('[Subscription Manager] An existing push subscription exists and options is null. Unsubscribing from push first now.');
      /*
        There isn't a great solution if PushSubscriptionOptions (supported on
        Chrome 54+) aren't supported.

        We want to subscribe the user, but we don't know whether the user was
        subscribed via GCM's manifest.json or FCM's VAPID.

        This bug
        (https://bugs.chromium.org/p/chromium/issues/detail?id=692577) shows
        that a mismatched sender ID error is possible if you subscribe via
        FCM's VAPID while the user was originally subscribed via GCM's
        manifest.json (fails silently).

        Because of this, we should unsubscribe the user from push first and
        then resubscribe them.
      */
      await existingPushSubscription.unsubscribe();
    }
    log.debug('[Subscription Manager] Subscribing to web push with these options:', options);

    // Actually subscribe the user to push
    newPushSubscription = await workerRegistration.pushManager.subscribe(options);

    const pushSubscriptionDetails = new RawPushSubscription();
    pushSubscriptionDetails.setFromW3cSubscription(newPushSubscription);
    if (existingPushSubscription) {
      pushSubscriptionDetails.existingW3cPushSubscription = new RawPushSubscription();
      pushSubscriptionDetails.existingW3cPushSubscription.setFromW3cSubscription(existingPushSubscription);
    }
    return pushSubscriptionDetails;
  }
}
