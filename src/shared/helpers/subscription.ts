import { SubscriptionType } from 'src/shared/subscriptions/constants';
import type { SubscriptionTypeValue } from 'src/shared/subscriptions/types';
import Log from '../libraries/Log';
import { checkAndTriggerSubscriptionChanged } from '../listeners';
import { Subscription } from '../models/Subscription';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { IS_SERVICE_WORKER } from '../utils/env';
import { incrementPageViewCount } from './pageview';
import { triggerNotificationPermissionChanged } from './permissions';

export async function registerForPush(): Promise<Subscription | null> {
  const context = OneSignal._context;
  let subscription: Subscription | null = null;

  if (IS_SERVICE_WORKER) throw new Error('Unsupported environment');
  try {
    const rawSubscription = await context._subscriptionManager._subscribe(
      SubscriptionStrategyKind._ResubscribeExisting,
    );
    subscription =
      await context._subscriptionManager._registerSubscription(rawSubscription);

    incrementPageViewCount();

    await triggerNotificationPermissionChanged();
    await checkAndTriggerSubscriptionChanged();
  } catch (e) {
    Log._error(e);
  }
  return subscription;
}

/**
 * Helper that checks if a given SubscriptionType is a push subscription.
 */
export function isPushSubscriptionType(type: SubscriptionTypeValue): boolean {
  switch (type) {
    case SubscriptionType._ChromePush:
    case SubscriptionType._SafariPush:
    case SubscriptionType._SafariLegacyPush:
    case SubscriptionType._FirefoxPush:
      return true;
    default:
      return false;
  }
}
