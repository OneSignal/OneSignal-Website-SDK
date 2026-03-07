import type { Subscription } from './types';
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

export const getSubscription = async (): Promise<Subscription> => {
  const deviceId = (await db.get('Ids', 'userId'))?.id;
  const token = (await db.get('Ids', 'registrationId'))?.id;

  const dbOptedOut = await getOptionsValue<boolean>('optedOut');
  const dbNotOptedOut = await getOptionsValue<boolean>('subscription');
  const createdAt = await getOptionsValue<number>('subscriptionCreatedAt');
  const expirationTime = await getOptionsValue<number>(
    'subscriptionExpirationTime',
  );

  let optedOut: boolean;
  if (dbOptedOut != null) {
    optedOut = dbOptedOut;
  } else {
    optedOut = dbNotOptedOut == null ? false : !dbNotOptedOut;
  }

  return {
    _deviceId: deviceId,
    _token: token,
    _optedOut: optedOut,
    _createdAt: createdAt ?? null,
    _expirationTime: expirationTime ?? null,
  };
};

export const setSubscription = async (subscription: Subscription) => {
  if (subscription._deviceId) {
    await db.put('Ids', {
      type: 'userId',
      id: subscription._deviceId,
    });
  }

  if (typeof subscription._token !== 'undefined') {
    await db.put('Ids', {
      type: 'registrationId',
      id: subscription._token,
    });
  }

  if (subscription._optedOut != null) {
    // Checks if null or undefined, allows false
    await db.put('Options', {
      key: 'optedOut',
      value: subscription._optedOut,
    });
  }

  if (subscription._createdAt != null) {
    await db.put('Options', {
      key: 'subscriptionCreatedAt',
      value: subscription._createdAt,
    });
  }

  if (subscription._expirationTime != null) {
    await db.put('Options', {
      key: 'subscriptionExpirationTime',
      value: subscription._expirationTime,
    });
  } else {
    await db.delete('Options', 'subscriptionExpirationTime');
  }
};
