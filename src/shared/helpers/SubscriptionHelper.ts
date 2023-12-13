import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import EventHelper from './EventHelper';
import {
  InvalidStateError,
  InvalidStateReason,
} from '../errors/InvalidStateError';
import { Subscription } from '../models/Subscription';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import Log from '../libraries/Log';
import { ContextSWInterface } from '../models/ContextSW';
import SdkEnvironment from '../managers/SdkEnvironment';
import { PermissionUtils } from '../utils/PermissionUtils';

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
}
