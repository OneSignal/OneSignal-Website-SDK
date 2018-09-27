import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import EventHelper from './EventHelper';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import { Subscription } from '../models/Subscription';
import { NotificationPermission } from '../models/NotificationPermission';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { SubscriptionStrategyKind } from "../models/SubscriptionStrategyKind";
import Log from '../libraries/Log';
import { ContextSWInterface } from '../models/ContextSW';
import SdkEnvironment from '../managers/SdkEnvironment';
import { PermissionUtils } from "../utils/PermissionUtils";

export default class SubscriptionHelper {
  static async registerForPush(): Promise<Subscription | null> {
    let subscription: Subscription;
    const context: ContextSWInterface = OneSignal.context;

    /*
      Within the same page navigation (the same session), do not register for
      push if the user is already subscribed, otherwise the user will have its
      session count incremented on each page refresh. However, if the user is
      not subscribed, subscribe.
    */
    const isPushEnabled = await OneSignal.privateIsPushNotificationsEnabled();

    if (isPushEnabled && !context.sessionManager.isFirstPageView()) {
      Log.debug('Not registering for push because the user is subscribed and this is not the first page view.');
      return null;
    }

    if (typeof OneSignal !== "undefined") {
      if (OneSignal._isRegisteringForPush)
        return null;
      else
        OneSignal._isRegisteringForPush = true;
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
          await PermissionUtils.triggerNotificationPermissionChanged();
          await EventHelper.checkAndTriggerSubscriptionChanged();
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
          (message: any) => {
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
        if (typeof OneSignal !== "undefined")
          OneSignal._isRegisteringForPush = false;
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    if (typeof OneSignal !== "undefined")
      OneSignal._isRegisteringForPush = false;

    return subscription;
  }
}
