import bowser from 'bowser';


import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import TimeoutError from '../errors/TimeoutError';
import Event from '../Event';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { getConsoleStyle, timeoutPromise, triggerNotificationPermissionChanged } from '../utils';
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
import Log from '../libraries/Log';

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
      Log.debug('Not registering for push because the user is subscribed and this is not the first page view.');
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
          triggerNotificationPermissionChanged();
          EventHelper.checkAndTriggerSubscriptionChanged();
        } catch (e) {
          Log.info(e);
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
          rawSubscription = await context.subscriptionManager.subscribe(SubscriptionStrategyKind.SubscribeNew);

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
              Log.debug('Got message from host page that remote reg. is in progress, closing popup.');
              if (windowCreator) {
                window.close();
              }
            } else {
              Log.debug('Got message from host page that remote reg. could not be finished.');
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
   * From a child frame, returns true if the current frame context is insecure.
   *
   * This is used to check if isPushNotificationsEnabled() should grab the service worker
   * registration. In an HTTPS iframe of an HTTP page, getting the service worker registration would
   * throw an error.
   *
   * This method can trigger console warnings due to using ServiceWorkerContainer.getRegistration in
   * an insecure frame.
   */
  static async isFrameContextInsecure() {
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
}
