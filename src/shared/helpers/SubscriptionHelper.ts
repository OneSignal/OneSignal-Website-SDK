import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import EventHelper from './EventHelper';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import { Subscription } from '../models/Subscription';
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
          Log.error(e);
        }
        break;
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

  static async getRawPushSubscription(
    environmentInfo: EnvironmentInfo,
    safariWebId: string,
  ): Promise<RawPushSubscription | null> {
    if (Environment.useSafariLegacyPush()) {
      return SubscriptionHelper.getRawPushSubscriptionForLegacySafari(
        safariWebId,
      );
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
