import {
  SubscriptionChannel,
  SubscriptionChannelValue,
  SubscriptionType,
  SubscriptionTypeValue,
} from 'src/core/types/subscription';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import Log from '../libraries/Log';
import SdkEnvironment from '../managers/SdkEnvironment';
import { Subscription } from '../models/Subscription';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { PermissionUtils } from '../utils/PermissionUtils';
import EventHelper from './EventHelper';

export default class SubscriptionHelper {
  public static async registerForPush(): Promise<Subscription | null> {
    return await SubscriptionHelper.internalRegisterForPush();
  }

  public static async internalRegisterForPush(): Promise<Subscription | null> {
    const context = OneSignal.context;
    let subscription: Subscription | null = null;

    switch (SdkEnvironment.getWindowEnv()) {
      case WindowEnvironmentKind.Host:
        try {
          const rawSubscription = await context.subscriptionManager.subscribe(
            SubscriptionStrategyKind.ResubscribeExisting,
          );
          console.warn('rawSubscription', rawSubscription);
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

  /**
   * Helper that checks if a given SubscriptionType is a push subscription.
   */
  public static isPushSubscriptionType(type: SubscriptionTypeValue): boolean {
    switch (type) {
      case SubscriptionType.ChromePush:
      case SubscriptionType.SafariPush:
      case SubscriptionType.FirefoxPush:
        return true;
      default:
        return false;
    }
  }

  public static toSubscriptionChannel(
    type: SubscriptionTypeValue,
  ): SubscriptionChannelValue | undefined {
    switch (type) {
      case SubscriptionType.Email:
        return SubscriptionChannel.Email;
      case SubscriptionType.SMS:
        return SubscriptionChannel.SMS;
      default:
        if (this.isPushSubscriptionType(type)) {
          return SubscriptionChannel.Push;
        }
        return undefined;
    }
  }
}
