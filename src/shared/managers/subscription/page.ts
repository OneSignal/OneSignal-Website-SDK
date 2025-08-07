import { isCompleteSubscriptionObject } from 'src/core/utils/typePredicates';
import UserDirector from 'src/onesignal/UserDirector';
import LoginManager from 'src/page/managers/LoginManager';
import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import type { ContextInterface } from 'src/shared/context/types';
import {
  getOneSignalApiUrl,
  useSafariLegacyPush,
} from 'src/shared/environment/detect';
import {
  MissingSafariWebIdError,
  PermissionBlockedError,
  SWRegistrationError,
} from 'src/shared/errors/common';
import {
  incrementPageViewCount,
  isFirstPageView,
} from 'src/shared/helpers/pageview';
import { triggerNotificationPermissionChanged } from 'src/shared/helpers/permissions';
import { ServiceWorkerActiveState } from 'src/shared/helpers/service-worker';
import Log from 'src/shared/libraries/Log';
import { NotificationPermission } from 'src/shared/models/NotificationPermission';
import type { PushSubscriptionState } from 'src/shared/models/PushSubscriptionState';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import type { SubscriptionStrategyKindValue } from 'src/shared/models/SubscriptionStrategyKind';
import {
  UnsubscriptionStrategy,
  type UnsubscriptionStrategyValue,
} from 'src/shared/models/UnsubscriptionStrategy';
import Database from 'src/shared/services/Database';
import OneSignalEvent from 'src/shared/services/OneSignalEvent';
import { NotificationType } from 'src/shared/subscriptions/constants';
import type { NotificationTypeValue } from 'src/shared/subscriptions/types';
import { logMethodCall } from 'src/shared/utils/utils';
import { IDManager } from '../IDManager';
import { SubscriptionManagerBase } from './base';

type SubscriptionStateServiceWorkerNotIntalled = Exclude<
  NotificationTypeValue,
  typeof NotificationType.Subscribed | typeof NotificationType.UserOptedOut
>;

const NotImplementedError = new Error('Not implemented');

function executeCallback<T>(callback?: (...args: any[]) => T, ...args: any[]) {
  if (callback) {
    // eslint-disable-next-line prefer-spread
    return callback.apply(null, args);
  }
}

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

export class SubscriptionManagerPage extends SubscriptionManagerBase<ContextInterface> {
  private safariPermissionPromptFailed = false;

  public async isPushNotificationsEnabled(): Promise<boolean> {
    const subscriptionState = await this.getSubscriptionState();
    return subscriptionState.subscribed && !subscriptionState.optedOut;
  }

  async updateNotificationTypes(): Promise<void> {
    const notificationTypes = await this.getNotificationTypes();
    await this.updatePushSubscriptionNotificationTypes(notificationTypes);
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
   * Returns a promise that resolves to true if all required conditions for push messaging are met; otherwise, false.
   * @returns {Promise<boolean>}
   */

  public async unsubscribe(strategy: UnsubscriptionStrategyValue) {
    if (strategy === UnsubscriptionStrategy.DestroySubscription) {
      throw NotImplementedError;
    } else if (strategy === UnsubscriptionStrategy.MarkUnsubscribed) {
      throw NotImplementedError;
    } else {
      throw NotImplementedError;
    }
  }

  /**
   * Returns an object describing the user's actual push subscription state and opt-out status.
   */
  public async getSubscriptionState(): Promise<PushSubscriptionState> {
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
   * Subscribes for a web push subscription.
   *
   * This method can be called from the page context or a webpage a service worker context
   * and will select the correct method.
   */
  public async subscribe(
    subscriptionStrategy: SubscriptionStrategyKindValue,
  ): Promise<RawPushSubscription> {
    let rawPushSubscription: RawPushSubscription;

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
      await updatePushSubscriptionModelWithRawSubscription(rawPushSubscription);
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
      await updatePushSubscriptionModelWithRawSubscription(rawPushSubscription);
    }

    return rawPushSubscription;
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
    triggerNotificationPermissionChanged();
    if (deviceToken) {
      pushSubscriptionDetails.setFromSafariSubscription(deviceToken);
    } else {
      this.safariPermissionPromptFailed = true;
      throw new Error('Safari url/icon/certificate invalid or in private mode');
    }
    return pushSubscriptionDetails;
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
    if (Notification.permission === NotificationPermission.Default) {
      await OneSignalEvent.trigger(
        OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED,
      );
      const permission =
        await SubscriptionManagerPage.requestPresubscribeNotificationPermission();

      /*
        The native event handler does not broadcast an event for dismissing the
        prompt, because going from "default" permissions to "default"
        permissions isn't a change. We specifically broadcast "default" to "default" changes.
       */
      const forcePermissionChangeEvent =
        permission === NotificationPermission.Default;
      await triggerNotificationPermissionChanged(forcePermissionChangeEvent);

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
          );
        } else if (err.status === 404) {
          await this.context.subscriptionManager.registerFailedSubscription(
            NotificationType.ServiceWorkerStatus404,
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

  /**
   * Broadcasting to the server the fact user tried to subscribe but there was an error during service worker registration.
   * Do it only once for the first page view.
   * @param subscriptionState Describes what went wrong with the service worker installation.
   */
  public async registerFailedSubscription(
    subscriptionState: SubscriptionStateServiceWorkerNotIntalled,
  ) {
    if (isFirstPageView()) {
      this.context.subscriptionManager.registerSubscription(
        new RawPushSubscription(),
        subscriptionState,
      );
      incrementPageViewCount();
    }
  }

  /**
   * Used before subscribing for push, we request notification permissions
   * before installing the service worker to prevent non-subscribers from
   * querying our server for an updated service worker every 24 hours.
   */
  private static async requestPresubscribeNotificationPermission(): Promise<NotificationPermission> {
    return await SubscriptionManagerPage.requestNotificationPermission();
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
}
