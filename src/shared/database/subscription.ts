import {
  getOptedOut as getStorageOptedOut,
  setOptedOut as setStorageOptedOut,
} from '../helpers/localStorage';
import { Subscription } from '../models/Subscription';
import { IS_SERVICE_WORKER } from '../utils/env';
import { db, getOptionsValue, isReadwriteWedged } from './client';

const getDbOptedOut = async (): Promise<boolean> => {
  // The preferred database key to store our subscription
  const dbOptedOut = await getOptionsValue<boolean>('optedOut');
  if (dbOptedOut != null) return dbOptedOut;
  // For backwards compatibility, we need to read from this if the above is not found
  const dbNotOptedOut = await getOptionsValue<boolean>('subscription');
  return dbNotOptedOut == null ? false : !dbNotOptedOut;
};

const getOptedOut = async (): Promise<boolean | undefined> => {
  if (IS_SERVICE_WORKER) return getDbOptedOut();

  const stored = getStorageOptedOut();
  if (stored !== null) return stored;

  // Migrate an opt-out persisted by older SDK versions that wrote it to IndexedDB.
  // While wedged, the read returns the default, so return undefined: setSubscription
  // skips undefined, and saving the default would hide the real value permanently.
  const legacy = await getDbOptedOut();
  if (isReadwriteWedged()) return undefined;
  setStorageOptedOut(legacy);
  // The page no longer updates these rows, so a later localStorage.clear() must not
  // bring back their old value.
  await db.delete('Options', 'optedOut');
  await db.delete('Options', 'subscription');
  return legacy;
};

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
  const subscription = new Subscription();
  subscription.deviceId = (await db.get('Ids', 'userId'))?.id;
  subscription.subscriptionToken = (await db.get('Ids', 'registrationId'))?.id;

  subscription.optedOut = await getOptedOut();
  const createdAt = await getOptionsValue<number>('subscriptionCreatedAt');
  const expirationTime = await getOptionsValue<number>('subscriptionExpirationTime');

  subscription.createdAt = createdAt ?? null;
  subscription.expirationTime = expirationTime ?? null;

  return subscription;
};

export const setSubscription = async (subscription: Subscription) => {
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
    if (IS_SERVICE_WORKER) {
      await db.put('Options', {
        key: 'optedOut',
        value: subscription.optedOut,
      });
    } else {
      setStorageOptedOut(subscription.optedOut);
    }
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
