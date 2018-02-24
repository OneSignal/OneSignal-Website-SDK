import * as Browser from 'bowser';
import * as log from 'loglevel';

import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import TimeoutError from '../errors/TimeoutError';
import Event from '../Event';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { getConsoleStyle, timeoutPromise } from '../utils';
import EventHelper from './EventHelper';
import MainHelper from './MainHelper';
import TestHelper from './TestHelper';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import Context from '../models/Context';
import { ServiceWorkerActiveState } from '../managers/ServiceWorkerManager';
import { Subscription } from '../models/Subscription';
import { NotificationPermission } from '../models/NotificationPermission';
import Database from '../services/Database';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";

export default class SubscriptionHelper {
  static async registerForPush(): Promise<Subscription> {
    let subscription: Subscription;
    const context: Context = OneSignal.context;

    /*
      Within the same page navigation (the same session), do not register for
      push if the user is already subscribed, otherwise the user will have its
      session count incremented on each page refresh. However, if the user is
      not subscribed, subscribe.
    */
    const isPushEnabled = await OneSignal.isPushNotificationsEnabled();

    if (isPushEnabled && !context.sessionManager.isFirstPageView()) {
      log.debug('Not registering for push because the user is subscribed and this is not the first page view.');
      return null;
    }

    if (typeof OneSignal !== "undefined") {
      if (OneSignal._isRegisteringForPush) {
        return null;
      } else {
        OneSignal._isRegisteringForPush = true;
      }
    }

    switch (SdkEnvironment.getWindowEnv()) {
      case WindowEnvironmentKind.Host:
      case WindowEnvironmentKind.OneSignalSubscriptionModal:
        try {
          const rawSubscription = await context.subscriptionManager.subscribe(
            SubscriptionStrategyKind.ResubscribeExisting
          );
          subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
          context.sessionManager.incrementPageViewCount();
          EventHelper.triggerNotificationPermissionChanged();
          EventHelper.checkAndTriggerSubscriptionChanged();
        } catch (e) {
          log.info(e);
        }
        break;
      case WindowEnvironmentKind.OneSignalSubscriptionPopup:
        /*
          This is the code for the HTTP popup.
         */
        const windowCreator = opener || parent;
        let rawSubscription: RawPushSubscription;

        // Update the stored permission first, so we know the real value even if the user closes the
        // popup
        await context.permissionManager.updateStoredPermission();

        try {
          /* If the user doesn't grant permissions, a PushPermissionNotGrantedError will be thrown here. */
          rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.ResubscribeExisting);

          // Update the permission to granted
          await context.permissionManager.updateStoredPermission();
        } catch (e) {
          // Update the permission to denied or default
          await context.permissionManager.updateStoredPermission();

          if (e instanceof PushPermissionNotGrantedError) {
            switch ((e as PushPermissionNotGrantedError).reason) {
              case PushPermissionNotGrantedErrorReason.Blocked:
                await context.permissionManager.updateStoredPermission();
                /* Force update false, because the iframe installs a native
                permission change handler that will be triggered when the user
                clicks out of the popup back to the parent page */
                (OneSignal.subscriptionPopup as any).message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                  permission: NotificationPermission.Denied,
                  forceUpdatePermission: false
                });
                break;
              case PushPermissionNotGrantedErrorReason.Dismissed:
                /* Force update true because default permissions (before
                prompting) -> default permissions (after prompting) isn't a
                change, but we still want to be notified about it */
                (OneSignal.subscriptionPopup as any).message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                  permission: NotificationPermission.Default,
                  forceUpdatePermission: true
                });
                break;
            }
          }
          /*
            Popup native permission request was blocked or dismissed
            Close the window
          */
          if (windowCreator) {
            window.close();
            return null;
          }
        }

        OneSignal.subscriptionPopup.message(
          OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION,
          {
            rawPushSubscription: rawSubscription.serialize()
          },
          message => {
            if (message.data.progress === true) {
              log.debug('Got message from host page that remote reg. is in progress, closing popup.');
              if (windowCreator) {
                window.close();
              }
            } else {
              log.debug('Got message from host page that remote reg. could not be finished.');
            }
          }
        );
        break;
      default:
        if (typeof OneSignal !== "undefined") {
          OneSignal._isRegisteringForPush = false;
        }
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    if (typeof OneSignal !== "undefined") {
      OneSignal._isRegisteringForPush = false;
    }

    return subscription;
  }

  /**
   * Returns true if web push subscription occurs on a subdomain of OneSignal.
   * If true, our main IndexedDB is stored on the subdomain of onesignal.com, and not the user's site.
   * @remarks
   *   This method returns true if:
   *     - The browser is not Safari
   *         - Safari uses a different method of subscription and does not require our workaround
   *     - The init parameters contain a subdomain (even if the protocol is HTTPS)
   *         - HTTPS users using our subdomain workaround still have the main IndexedDB stored on our subdomain
   *        - The protocol of the current webpage is http:
   *   Exceptions are:
   *     - Safe hostnames like localhost and 127.0.0.1
   *          - Because we don't want users to get the wrong idea when testing on localhost that direct permission is supported on HTTP, we'll ignore these exceptions. HTTPS will always be required for direct permission
   *        - We are already in popup or iFrame mode, or this is called from the service worker
   */
  static isUsingSubscriptionWorkaround() {
    if (!OneSignal.config) {
      throw new Error(
        `(${SdkEnvironment.getWindowEnv().toString()}) isUsingSubscriptionWorkaround() cannot be called until OneSignal.config exists.`
      );
    }
    if (Browser.safari) {
      return false;
    }

    if (
      (SubscriptionHelper.isLocalhostAllowedAsSecureOrigin() && location.hostname === 'localhost') ||
      (location.hostname as any) === '127.0.0.1'
    ) {
      return false;
    }

    return (
      (
        SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.Host ||
        SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe
      ) &&
      (
        !!OneSignal.config.subdomain ||
        location.protocol === 'http:'
      )
    );
  }

  /**
   * Returns true if the current frame context is a child iFrame, and the parent
   * is not HTTPS.
   *
   * This is used to check if isPushNotificationsEnabled() should grab the
   * service worker registration. In an HTTPS iframe of an HTTP page, getting
   * the service worker registration would throw an error.
   */
  static async hasInsecureParentOrigin() {
    // If we are the top frame, or service workers aren't available, don't run this check
    if (
      window === window.top ||
      !('serviceWorker' in navigator) ||
      typeof navigator.serviceWorker.getRegistration === 'undefined'
    ) {
      return false;
    }
    try {
      await navigator.serviceWorker.getRegistration();
      return false;
    } catch (e) {
      return true;
    }
  }

  static isInsecureOrigin() {
    return window.location.protocol === "http:";
  }

  static isLocalhostAllowedAsSecureOrigin() {
    return (
      OneSignal.config &&
      OneSignal.config.userConfig &&
      OneSignal.config.userConfig.allowLocalhostAsSecureOrigin === true
    );
  }
}
