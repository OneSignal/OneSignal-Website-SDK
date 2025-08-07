import {
  type NotificationClickForOpenHandlingSchema,
  notificationClickFromDatabase,
} from '../helpers/serializer';
import {
  AppState,
  type PendingNotificationClickEvents,
} from '../models/AppState';
import { db } from './client';

export const getDBAppConfig = async () => {
  const config: any = {};
  const appIdStr: string = (await db.get('Ids', 'appId'))?.id as string;
  config.appId = appIdStr;
  config.vapidPublicKey = (await db.get('Options', 'vapidPublicKey'))?.value;
  return config;
};

const getAllPendingNotificationClickEvents =
  async (): Promise<PendingNotificationClickEvents> => {
    const clickedNotifications: PendingNotificationClickEvents = {};
    const eventsFromDb = await db.getAll('NotificationOpened');
    for (const eventFromDb of eventsFromDb) {
      const event = notificationClickFromDatabase(eventFromDb);
      const url = event.result.url;
      if (!url) {
        continue;
      }
      clickedNotifications[url] = event;
    }
    return clickedNotifications;
  };

export const getAppState = async (): Promise<AppState> => {
  const state = new AppState();
  state.defaultNotificationUrl = (await db.get('Options', 'defaultUrl'))
    ?.value as string;
  state.defaultNotificationTitle = (await db.get('Options', 'defaultTitle'))
    ?.value as string;
  state.lastKnownPushEnabled = (await db.get('Options', 'isPushEnabled'))
    ?.value as boolean;
  state.pendingNotificationClickEvents =
    await getAllPendingNotificationClickEvents();

  // lastKnown<PushId|PushToken|OptedIn> are used to track changes to the user's subscription
  // state. Displayed in the `current` & `previous` fields of the `subscriptionChange` event.
  state.lastKnownPushId = (await db.get('Options', 'lastPushId'))
    ?.value as string;
  state.lastKnownPushToken = (await db.get('Options', 'lastPushToken'))
    ?.value as string;
  state.lastKnownOptedIn = (await db.get('Options', 'lastOptedIn'))
    ?.value as boolean;
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

  if (appState.pendingNotificationClickEvents) {
    const clickedNotificationUrls = Object.keys(
      appState.pendingNotificationClickEvents,
    );
    for (const url of clickedNotificationUrls) {
      const notificationDetails =
        appState.pendingNotificationClickEvents[
          url as keyof typeof appState.pendingNotificationClickEvents
        ];

      if (notificationDetails) {
        await db.put('NotificationOpened', {
          url: url,
          data: (notificationDetails as any).data,
          timestamp: (notificationDetails as any).timestamp,
        } as NotificationClickForOpenHandlingSchema);
      } else if (notificationDetails === null) {
        // If we get an object like:
        // { "http://site.com/page": null}
        // It means we need to remove that entry
        await db.delete('NotificationOpened', url);
      }
    }
  }
};

export const getConsentGiven = async () => {
  return (await db.get('Options', 'consentGiven'))?.value as
    | boolean
    | undefined;
};
