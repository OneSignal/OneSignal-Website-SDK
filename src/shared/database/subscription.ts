import type { UserSubscription } from '../subscriptions/types';
import { db, getOptionsValue } from './client';

export const getPushId = async () => {
  return await getOptionsValue<string>('lastPushId');
};
export const setPushId = async (pushId: string | undefined) => {
  await db.put('Options', { key: 'lastPushId', value: pushId });
};

export const getPushToken = async () => {
  return await getOptionsValue<string>('lastPushToken');
};
export const setPushToken = async (pushToken: string | undefined) => {
  await db.put('Options', { key: 'lastPushToken', value: pushToken });
};

export const getSubscription = async () => {
  const subscription: UserSubscription = {};
  subscription.deviceId = (await db.get('Ids', 'userId'))?.id;
  subscription.subscriptionToken = (await db.get('Ids', 'registrationId'))?.id;

  // The preferred database key to store our subscription
  const dbOptedOut = await getOptionsValue<boolean>('optedOut');
  // For backwards compatibility, we need to read from this if the above is not found
  const dbNotOptedOut = await getOptionsValue<boolean>('subscription');
  const createdAt = await getOptionsValue<number>('subscriptionCreatedAt');
  const expirationTime = await getOptionsValue<number>(
    'subscriptionExpirationTime',
  );

  if (dbOptedOut != null) {
    subscription.optedOut = dbOptedOut;
  } else {
    if (dbNotOptedOut == null) {
      subscription.optedOut = false;
    } else {
      subscription.optedOut = !dbNotOptedOut;
    }
  }
  subscription.createdAt = createdAt ?? null;
  subscription.expirationTime = expirationTime ?? null;

  return subscription;
};

export const setSubscription = async (subscription: UserSubscription) => {
  if (subscription.deviceId) {
    await db.put('Ids', {
      type: 'userId',
      id: subscription.deviceId,
    });
  }

  if (typeof subscription.subscriptionToken !== 'undefined') {
    // Allow null subscriptions to be set
    await db.put('Ids', {
      type: 'registrationId',
      id: subscription.subscriptionToken,
    });
  }

  if (subscription.optedOut != null) {
    // Checks if null or undefined, allows false
    await db.put('Options', {
      key: 'optedOut',
      value: subscription.optedOut,
    });
  }

  if (subscription.createdAt != null) {
    await db.put('Options', {
      key: 'subscriptionCreatedAt',
      value: subscription.createdAt,
    });
  }

  if (subscription.expirationTime != null) {
    await db.put('Options', {
      key: 'subscriptionExpirationTime',
      value: subscription.expirationTime,
    });
  } else {
    await db.delete('Options', 'subscriptionExpirationTime');
  }
};
