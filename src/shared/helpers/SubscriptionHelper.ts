import {
  SubscriptionChannel,
  type SubscriptionChannelValue,
  SubscriptionType,
  type SubscriptionTypeValue,
} from 'src/core/types/subscription';
import Log from '../libraries/Log';
import { Subscription } from '../models/Subscription';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { PermissionUtils } from '../utils/PermissionUtils';
import EventHelper from './EventHelper';

export default class SubscriptionHelper {
  public static async registerForPush(): Promise<Subscription | null> {
    return await SubscriptionHelper.internalRegisterForPush();
  }

  public static async internalRegisterForPush(): Promise<Subscription | null> {
    const context = OneSignal.context;
    let subscription: Subscription | null = null;

    if (!IS_SERVICE_WORKER) {
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
    } else {
      throw new Error('Unsupported environment');
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
      case SubscriptionType.SafariLegacyPush:
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
