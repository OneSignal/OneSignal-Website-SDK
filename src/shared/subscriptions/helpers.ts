import { SubscriptionType } from 'src/shared/subscriptions/constants';
import type {
  StoredSubscription,
  SubscriptionTypeValue,
} from 'src/shared/subscriptions/types';
import { incrementPageViewCount } from '../helpers/pageview';
import { triggerNotificationPermissionChanged } from '../helpers/permissions';
import Log from '../libraries/Log';
import { checkAndTriggerSubscriptionChanged } from '../listeners';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';

export async function registerForPush(): Promise<StoredSubscription | null> {
  const context = OneSignal.context;
  let subscription: StoredSubscription | null = null;

  if (IS_SERVICE_WORKER) throw new Error('Unsupported environment');
  try {
    const rawSubscription = await context.subscriptionManager.subscribe(
      SubscriptionStrategyKind.ResubscribeExisting,
    );
    subscription =
      await context.subscriptionManager.registerSubscription(rawSubscription);
    incrementPageViewCount();
    await triggerNotificationPermissionChanged();
    await checkAndTriggerSubscriptionChanged();
  } catch (e) {
    Log.error(e);
  }
  return subscription;
}

/**
 * Helper that checks if a given SubscriptionType is a push subscription.
 */
export function isPushSubscriptionType(type: SubscriptionTypeValue): boolean {
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
