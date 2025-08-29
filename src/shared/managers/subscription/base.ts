import {
  getSubscription,
  setSubscription,
} from 'src/shared/database/subscription';
import type { NotificationTypeValue } from 'src/shared/subscriptions/types';
import type { ContextInterface, ContextSWInterface } from '../../context/types';
import { useSafariLegacyPush } from '../../environment/detect';
import Log from '../../libraries/Log';
import { RawPushSubscription } from '../../models/RawPushSubscription';
import type { Subscription } from '../../models/Subscription';
import {
  SubscriptionStrategyKind,
  type SubscriptionStrategyKindValue,
} from '../../models/SubscriptionStrategyKind';
import OneSignalEvent from '../../services/OneSignalEvent';
import { SessionOrigin } from '../../session/constants';
import { Browser } from '../../useragent/constants';
import { getBrowserName } from '../../useragent/detect';
import { base64ToUint8Array } from '../../utils/Encoding';
import { IS_SERVICE_WORKER } from '../../utils/EnvVariables';
import { DEFAULT_DEVICE_ID } from './constants';

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

export class SubscriptionManagerBase<
  C extends ContextSWInterface | ContextInterface,
> {
  protected context: C;
  protected config: SubscriptionManagerConfig;

  constructor(context: C, config: SubscriptionManagerConfig) {
    this.context = context;
    this.config = config;
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
      if ('_updateManager' in this.context) {
        await this.context._updateManager.sendPushDeviceRecordUpdate();
      }

      // NOTE: We only have sessionManager in the page context, should sw upsert do anything?
    } else if ('_sessionManager' in this.context) {
      this.context._sessionManager.upsertSession(SessionOrigin.UserCreate);
    }

    const subscription = await getSubscription();
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
    await setSubscription(subscription);

    if (!IS_SERVICE_WORKER) {
      OneSignalEvent.trigger(OneSignal.EVENTS.REGISTERED);
    }

    if (typeof OneSignal !== 'undefined') {
      OneSignal._sessionInitAlreadyRunning = false;
    }
    return subscription;
  }

  public async isAlreadyRegisteredWithOneSignal(): Promise<boolean> {
    const { deviceId } = await getSubscription();
    return !!deviceId;
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
          await SubscriptionManagerBase.doPushUnsubscribe(
            existingPushSubscription,
          );
        }
        break;
      case SubscriptionStrategyKind.SubscribeNew:
        /* Since we want a new subscription every time with this strategy, just unsubscribe. */
        if (existingPushSubscription) {
          await SubscriptionManagerBase.doPushUnsubscribe(
            existingPushSubscription,
          );
        }
        break;
    }

    // Actually subscribe the user to push
    const [newPushSubscription, isNewSubscription] =
      await SubscriptionManagerBase.doPushSubscribe(
        pushManager,
        this.getVapidKeyForBrowser(),
      );

    // Update saved create and expired times
    await SubscriptionManagerBase.updateSubscriptionTime(
      isNewSubscription,
      newPushSubscription.expirationTime,
    );

    // Create our own custom object from the browser's native PushSubscription object
    const pushSubscriptionDetails =
      RawPushSubscription.setFromW3cSubscription(newPushSubscription);
    return pushSubscriptionDetails;
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

  private static async updateSubscriptionTime(
    updateCreatedAt: boolean,
    expirationTime: number | null,
  ): Promise<void> {
    const bundle = await getSubscription();
    if (updateCreatedAt) {
      bundle.createdAt = new Date().getTime();
    }
    bundle.expirationTime = expirationTime;
    await setSubscription(bundle);
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
          await SubscriptionManagerBase.doPushUnsubscribe(subscription);
        }
        return [await pushManager.subscribe(subscriptionOptions), true];
      } else throw e; // If some other error, bubble the exception up
    }
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
}
