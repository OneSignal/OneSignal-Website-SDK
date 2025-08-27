import { getConsentRequired } from '../helpers/localStorage';
import { AppState } from '../models/AppState';
import { db, getIdsValue, getOptionsValue } from './client';

export const getDBAppConfig = async () => {
  const config: any = {};
  const appIdStr = await getIdsValue<string>('appId');
  config.appId = appIdStr;
  config.vapidPublicKey = await getOptionsValue<string>('vapidPublicKey');
  return config;
};

export const getAppState = async (): Promise<AppState> => {
  const state = new AppState();
  state.defaultNotificationUrl = await getOptionsValue<string>('defaultUrl');
  state.defaultNotificationTitle =
    await getOptionsValue<string>('defaultTitle');
  state.lastKnownPushEnabled = await getOptionsValue<boolean>('isPushEnabled');
  state.lastKnownOptedIn = await getOptionsValue<boolean>('lastOptedIn');

  // lastKnown<PushId|PushToken|OptedIn> are used to track changes to the user's subscription
  // state. Displayed in the `current` & `previous` fields of the `subscriptionChange` event.
  // want undefined instead of null since its used to check for subscription changes
  state.lastKnownPushId =
    (await getOptionsValue<string>('lastPushId')) ?? undefined;
  state.lastKnownPushToken =
    (await getOptionsValue<string>('lastPushToken')) ?? undefined;
  return state;
};

export const setAppState = async (appState: AppState) => {
  if (appState.defaultNotificationUrl)
    await db.put('Options', {
      key: 'defaultUrl',
      value: appState.defaultNotificationUrl,
    });
  if (
    appState.defaultNotificationTitle ||
    appState.defaultNotificationTitle === ''
  )
    await db.put('Options', {
      key: 'defaultTitle',
      value: appState.defaultNotificationTitle,
    });

  if (appState.lastKnownPushEnabled != null)
    await db.put('Options', {
      key: 'isPushEnabled',
      value: appState.lastKnownPushEnabled,
    });

  if (appState.lastKnownPushId != null)
    await db.put('Options', {
      key: 'lastPushId',
      value: appState.lastKnownPushId,
    });

  if (appState.lastKnownPushToken != null)
    await db.put('Options', {
      key: 'lastPushToken',
      value: appState.lastKnownPushToken,
    });

  if (appState.lastKnownOptedIn != null)
    await db.put('Options', {
      key: 'lastOptedIn',
      value: appState.lastKnownOptedIn,
    });
};

// make sure to also set OneSignal._consentGiven when updating 'userConsent'
export const getConsentGiven = async () => {
  return (await getOptionsValue<boolean>('userConsent')) ?? false;
};

export const isConsentRequired = () => {
  const consentRequired = getConsentRequired();
  const consentGiven = OneSignal._consentGiven;
  return consentRequired && !consentGiven;
};
