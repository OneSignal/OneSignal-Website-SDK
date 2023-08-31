import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import EventHelper from './EventHelper';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import { Subscription } from '../models/Subscription';
import { NotificationPermission } from '../models/NotificationPermission';
import { RawPushSubscription } from '../models/RawPushSubscription';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import Log from '../libraries/Log';
import { ContextSWInterface } from '../models/ContextSW';
import SdkEnvironment from '../managers/SdkEnvironment';
import { EnvironmentInfo } from '../../page/models/EnvironmentInfo';
import { PermissionUtils } from '../utils/PermissionUtils';
import Environment from './Environment';

export default class SubscriptionHelper {
  public static async registerForPush(): Promise<Subscription | null> {
    return await SubscriptionHelper.internalRegisterForPush();
  }

  public static async internalRegisterForPush(): Promise<Subscription | null> {
    const context: ContextSWInterface = OneSignal.context;
    let subscription: Subscription | null = null;

    switch (SdkEnvironment.getWindowEnv()) {
      case WindowEnvironmentKind.Host:
      case WindowEnvironmentKind.OneSignalSubscriptionModal:
        try {
          const rawSubscription = await context.subscriptionManager.subscribe(
            SubscriptionStrategyKind.ResubscribeExisting,
          );
          subscription =
            await context.subscriptionManager.registerSubscription(
              rawSubscription,
            );
          context.pageViewManager.incrementPageViewCount();
          await PermissionUtils.triggerNotificationPermissionChanged();
          await EventHelper.checkAndTriggerSubscriptionChanged();
        } catch (e) {
          Log.info(e);
        }
        break;
      case WindowEnvironmentKind.OneSignalSubscriptionPopup: {
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
          rawSubscription = await context.subscriptionManager.subscribe(
            SubscriptionStrategyKind.SubscribeNew,
          );

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
                (OneSignal.subscriptionPopup as any).message(
                  OneSignal.POSTMAM_COMMANDS
                    .REMOTE_NOTIFICATION_PERMISSION_CHANGED,
                  {
                    permission: NotificationPermission.Denied,
                    forceUpdatePermission: false,
                  },
                );
                break;
              case PushPermissionNotGrantedErrorReason.Dismissed:
                /* Force update true because default permissions (before
                prompting) -> default permissions (after prompting) isn't a
                change, but we still want to be notified about it */
                (OneSignal.subscriptionPopup as any).message(
                  OneSignal.POSTMAM_COMMANDS
                    .REMOTE_NOTIFICATION_PERMISSION_CHANGED,
                  {
                    permission: NotificationPermission.Default,
                    forceUpdatePermission: true,
                  },
                );
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
            rawPushSubscription: rawSubscription.serialize(),
          },
          (message: any) => {
            if (message.data.progress === true) {
              Log.debug(
                'Got message from host page that remote reg. is in progress, closing popup.',
              );
              if (windowCreator) {
                window.close();
              }
            } else {
              Log.debug(
                'Got message from host page that remote reg. could not be finished.',
              );
            }
          },
        );
        break;
      }
      default:
        throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    return subscription;
  }

  static getRawPushSubscriptionForLegacySafari(
    safariWebId: string,
  ): RawPushSubscription {
    const subscription = new RawPushSubscription();

    const { deviceToken } =
      window.safari.pushNotification.permission(safariWebId);
    subscription.setFromSafariSubscription(deviceToken);

    return subscription;
  }

  static async getRawPushSubscriptionFromServiceWorkerRegistration(
    registration?: ServiceWorkerRegistration,
  ): Promise<RawPushSubscription | null> {
    if (!registration) {
      return null;
    }
    const swSubscription = await registration.pushManager.getSubscription();
    if (!swSubscription) {
      return null;
    }
    return RawPushSubscription.setFromW3cSubscription(swSubscription);
  }

  static async getRawPushSubscriptionWhenUsingSubscriptionWorkaround(): Promise<RawPushSubscription | null> {
    // we would need to message service worker to get it. we'll get it from inside if necessary
    return null;
  }

  static async getRawPushSubscription(
    environmentInfo: EnvironmentInfo,
    safariWebId: string,
  ): Promise<RawPushSubscription | null> {
    if (Environment.useSafariLegacyPush()) {
      return SubscriptionHelper.getRawPushSubscriptionForLegacySafari(
        safariWebId,
      );
    }

    if (environmentInfo.isUsingSubscriptionWorkaround) {
      return SubscriptionHelper.getRawPushSubscriptionWhenUsingSubscriptionWorkaround();
    }

    if (environmentInfo.isBrowserAndSupportsServiceWorkers) {
      const registration =
        await OneSignal.context.serviceWorkerManager.getRegistration();
      return await SubscriptionHelper.getRawPushSubscriptionFromServiceWorkerRegistration(
        registration,
      );
    }

    return null;
  }
}
