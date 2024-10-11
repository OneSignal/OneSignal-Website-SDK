import Emitter from '../libraries/Emitter';
import IndexedDb from './IndexedDb';

import { AppConfig } from '../models/AppConfig';
import { AppState, PendingNotificationClickEvents } from '../models/AppState';
import { UserState } from '../models/UserState';
import { IOSNotification } from '../models/OSNotification';
import {
  OutcomesNotificationClicked,
  OutcomesNotificationReceived,
} from '../models/OutcomesNotificationEvents';
import { Subscription } from '../models/Subscription';
import { Session, ONESIGNAL_SESSION_KEY } from '../models/Session';
import Log from '../libraries/Log';
import { SentUniqueOutcome } from '../models/Outcomes';
import { ModelName } from '../../core/models/SupportedModels';
import {
  NotificationClickForOpenHandlingSchema,
  NotificationClickForOpenHandlingSerializer,
  NotificationClickedForOutcomesSerializer,
  NotificationReceivedForOutcomesSchema,
  NotificationReceivedForOutcomesSerializer,
} from '../helpers/OSNotificationDatabaseSerializer';
import { NotificationClickEventInternal } from '../models/NotificationEvent';

enum DatabaseEventName {
  SET,
}

interface DatabaseResult {
  id: any;
  value: any;
  data: any;
  timestamp: any;
}

/**
 * "NotificationOpened" = Pending Notification Click events that haven't fired yet
 */

export const TABLE_OUTCOMES_NOTIFICATION_CLICKED =
  'Outcomes.NotificationClicked';
export const TABLE_OUTCOMES_NOTIFICATION_RECEIVED =
  'Outcomes.NotificationReceived';

export type OneSignalDbTable =
  | 'Options'
  | 'Ids'
  | 'NotificationOpened'
  | 'Sessions'
  | 'NotificationOpened'
  | typeof TABLE_OUTCOMES_NOTIFICATION_RECEIVED
  | typeof TABLE_OUTCOMES_NOTIFICATION_CLICKED
  | 'SentUniqueOutcome'
  | ModelName;

export default class Database {
  public emitter: Emitter;
  private database: IndexedDb;

  /* Temp Database Proxy */
  public static databaseInstanceName: string;
  private static databaseInstance: Database | null;
  /* End Temp Database Proxy */

  public static EVENTS = DatabaseEventName;

  constructor(private databaseName: string) {
    this.emitter = new Emitter();
    this.database = new IndexedDb(this.databaseName);
  }

  public static resetInstance(): void {
    Database.databaseInstance = null;
  }

  public static get singletonInstance(): Database {
    if (!Database.databaseInstanceName) {
      Database.databaseInstanceName = 'ONE_SIGNAL_SDK_DB';
    }
    if (!Database.databaseInstance) {
      Database.databaseInstance = new Database(Database.databaseInstanceName);
    }

    return Database.databaseInstance;
  }

  static applyDbResultFilter(
    table: OneSignalDbTable,
    key?: string,
    result?: DatabaseResult,
  ) {
    switch (table) {
      case 'Options':
        if (result && key) return result.value;
        else if (result && !key) return result;
        else return null;
      case 'Ids':
        if (result && key) return result.id;
        else if (result && !key) return result;
        else return null;
      default:
        if (result) return result;
        else return null;
    }
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table
   * (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  async get<T>(table: OneSignalDbTable, key?: string): Promise<T> {
    const result = await this.database.get(table, key);
    const cleanResult = Database.applyDbResultFilter(table, key, result);
    return cleanResult;
  }

  public async getAll<T>(table: OneSignalDbTable): Promise<T[]> {
    const result = await this.database.getAll<T>(table);
    return result;
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   * @param table
   * @param keypath
   */
  async put(table: OneSignalDbTable, keypath: any): Promise<void> {
    await new Promise<void>((resolve) => {
      this.database.put(table, keypath).then(() => resolve());
    });
    this.emitter.emit(Database.EVENTS.SET, keypath);
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all
   * keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  remove(table: OneSignalDbTable, keypath?: string) {
    return this.database.remove(table, keypath);
  }

  async getAppConfig(): Promise<AppConfig> {
    const config: any = {};
    const appIdStr: string = await this.get<string>('Ids', 'appId');
    config.appId = appIdStr;
    config.vapidPublicKey = await this.get<string>('Options', 'vapidPublicKey');
    return config;
  }

  async setAppConfig(appConfig: AppConfig): Promise<void> {
    if (appConfig.appId)
      await this.put('Ids', { type: 'appId', id: appConfig.appId });
    if (appConfig.vapidPublicKey)
      await this.put('Options', {
        key: 'vapidPublicKey',
        value: appConfig.vapidPublicKey,
      });
  }

  async getAppState(): Promise<AppState> {
    const state = new AppState();
    state.defaultNotificationUrl = await this.get<string>(
      'Options',
      'defaultUrl',
    );
    state.defaultNotificationTitle = await this.get<string>(
      'Options',
      'defaultTitle',
    );
    state.lastKnownPushEnabled = await this.get<boolean>(
      'Options',
      'isPushEnabled',
    );
    state.pendingNotificationClickEvents =
      await this.getAllPendingNotificationClickEvents();
    // lastKnown<PushId|PushToken|OptedIn> are used to track changes to the user's subscription
    // state. Displayed in the `current` & `previous` fields of the `subscriptionChange` event.
    state.lastKnownPushId = await this.get<string>('Options', 'lastPushId');
    state.lastKnownPushToken = await this.get<string>(
      'Options',
      'lastPushToken',
    );
    state.lastKnownOptedIn = await this.get<boolean>('Options', 'lastOptedIn');
    return state;
  }

  async setIsPushEnabled(enabled: boolean): Promise<void> {
    await this.put('Options', { key: 'isPushEnabled', value: enabled });
  }

  async setAppState(appState: AppState) {
    if (appState.defaultNotificationUrl)
      await this.put('Options', {
        key: 'defaultUrl',
        value: appState.defaultNotificationUrl,
      });
    if (
      appState.defaultNotificationTitle ||
      appState.defaultNotificationTitle === ''
    )
      await this.put('Options', {
        key: 'defaultTitle',
        value: appState.defaultNotificationTitle,
      });
    if (appState.lastKnownPushEnabled != null)
      await this.setIsPushEnabled(appState.lastKnownPushEnabled);
    if (appState.lastKnownPushId != null)
      await this.put('Options', {
        key: 'lastPushId',
        value: appState.lastKnownPushId,
      });
    if (appState.lastKnownPushToken != null)
      await this.put('Options', {
        key: 'lastPushToken',
        value: appState.lastKnownPushToken,
      });
    if (appState.lastKnownOptedIn != null)
      await this.put('Options', {
        key: 'lastOptedIn',
        value: appState.lastKnownOptedIn,
      });
    if (appState.pendingNotificationClickEvents) {
      const clickedNotificationUrls = Object.keys(
        appState.pendingNotificationClickEvents,
      );
      for (const url of clickedNotificationUrls) {
        const notificationDetails =
          appState.pendingNotificationClickEvents[url];
        if (notificationDetails) {
          await this.put('NotificationOpened', {
            url: url,
            data: (notificationDetails as any).data,
            timestamp: (notificationDetails as any).timestamp,
          });
        } else if (notificationDetails === null) {
          // If we get an object like:
          // { "http://site.com/page": null}
          // It means we need to remove that entry
          await this.remove('NotificationOpened', url);
        }
      }
    }
  }

  async getUserState(): Promise<UserState> {
    const userState = new UserState();
    userState.previousOneSignalId = '';
    userState.previousExternalId = '';
    // previous<OneSignalId|ExternalId> are used to track changes to the user's state.
    // Displayed in the `current` & `previous` fields of the `userChange` event.
    userState.previousOneSignalId = await this.get<string>(
      'Options',
      'previousOneSignalId',
    );
    userState.previousExternalId = await this.get<string>(
      'Options',
      'previousExternalId',
    );
    return userState;
  }

  async setUserState(userState: UserState) {
    await this.put('Options', {
      key: 'previousOneSignalId',
      value: userState.previousOneSignalId,
    });
    await this.put('Options', {
      key: 'previousExternalId',
      value: userState.previousExternalId,
    });
  }

  async getSubscription(): Promise<Subscription> {
    const subscription = new Subscription();
    subscription.deviceId = await this.get<string>('Ids', 'userId');
    subscription.subscriptionToken = await this.get<string>(
      'Ids',
      'registrationId',
    );

    // The preferred database key to store our subscription
    const dbOptedOut = await this.get<boolean>('Options', 'optedOut');
    // For backwards compatibility, we need to read from this if the above is not found
    const dbNotOptedOut = await this.get<boolean>('Options', 'subscription');
    const createdAt = await this.get<number>(
      'Options',
      'subscriptionCreatedAt',
    );
    const expirationTime = await this.get<number>(
      'Options',
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
    subscription.createdAt = createdAt;
    subscription.expirationTime = expirationTime;

    return subscription;
  }

  async setDeviceId(deviceId: string | null): Promise<void> {
    await this.put('Ids', { type: 'userId', id: deviceId });
  }

  async setSubscription(subscription: Subscription) {
    if (subscription.deviceId) {
      await this.setDeviceId(subscription.deviceId);
    }
    if (typeof subscription.subscriptionToken !== 'undefined') {
      // Allow null subscriptions to be set
      await this.put('Ids', {
        type: 'registrationId',
        id: subscription.subscriptionToken,
      });
    }
    if (subscription.optedOut != null) {
      // Checks if null or undefined, allows false
      await this.put('Options', {
        key: 'optedOut',
        value: subscription.optedOut,
      });
    }
    if (subscription.createdAt != null) {
      await this.put('Options', {
        key: 'subscriptionCreatedAt',
        value: subscription.createdAt,
      });
    }
    if (subscription.expirationTime != null) {
      await this.put('Options', {
        key: 'subscriptionExpirationTime',
        value: subscription.expirationTime,
      });
    } else {
      await this.remove('Options', 'subscriptionExpirationTime');
    }
  }

  async setProvideUserConsent(consent: boolean): Promise<void> {
    await this.put('Options', { key: 'userConsent', value: consent });
  }

  async getConsentGiven(): Promise<boolean> {
    return await this.get<boolean>('Options', 'userConsent');
  }

  private async getSession(sessionKey: string): Promise<Session | null> {
    return await this.get<Session | null>('Sessions', sessionKey);
  }

  private async setSession(session: Session): Promise<void> {
    await this.put('Sessions', session);
  }

  private async removeSession(sessionKey: string): Promise<void> {
    await this.remove('Sessions', sessionKey);
  }

  async getLastNotificationClickedForOutcomes(
    appId: string,
  ): Promise<OutcomesNotificationClicked | null> {
    let allClickedNotifications: OutcomesNotificationClicked[] = [];
    try {
      allClickedNotifications =
        await this.getAllNotificationClickedForOutcomes();
    } catch (e) {
      Log.error('Database.getLastNotificationClickedForOutcomes', e);
    }
    const predicate = (notification: OutcomesNotificationClicked) =>
      notification.appId === appId;
    return allClickedNotifications.find(predicate) || null;
  }

  async getAllNotificationClickedForOutcomes(): Promise<
    OutcomesNotificationClicked[]
  > {
    const notifications =
      await this.getAll<NotificationReceivedForOutcomesSchema>(
        TABLE_OUTCOMES_NOTIFICATION_CLICKED,
      );
    return notifications.map((notification) =>
      NotificationClickedForOutcomesSerializer.fromDatabase(notification),
    );
  }

  async putNotificationClickedForOutcomes(
    appId: string,
    event: NotificationClickEventInternal,
  ): Promise<void> {
    await this.put(
      TABLE_OUTCOMES_NOTIFICATION_CLICKED,
      NotificationClickedForOutcomesSerializer.toDatabase(appId, event),
    );
  }

  async putNotificationClickedEventPendingUrlOpening(
    event: NotificationClickEventInternal,
  ): Promise<void> {
    await this.put(
      'NotificationOpened',
      NotificationClickForOpenHandlingSerializer.toDatabase(event),
    );
  }

  private async getAllPendingNotificationClickEvents(): Promise<PendingNotificationClickEvents> {
    const clickedNotifications: PendingNotificationClickEvents = {};
    const eventsFromDb =
      await this.getAll<NotificationClickForOpenHandlingSchema>(
        'NotificationOpened',
      );
    for (const eventFromDb of eventsFromDb) {
      const event =
        NotificationClickForOpenHandlingSerializer.fromDatabase(eventFromDb);
      const url = event.result.url;
      if (!url) {
        continue;
      }
      clickedNotifications[url] = event;
    }
    return clickedNotifications;
  }

  async removeAllNotificationClickedForOutcomes(): Promise<void> {
    await this.remove(TABLE_OUTCOMES_NOTIFICATION_CLICKED);
  }

  async getAllNotificationReceivedForOutcomes(): Promise<
    OutcomesNotificationReceived[]
  > {
    const notifications =
      await this.getAll<NotificationReceivedForOutcomesSchema>(
        TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
      );
    return notifications.map((notification) =>
      NotificationReceivedForOutcomesSerializer.fromDatabase(notification),
    );
  }

  async putNotificationReceivedForOutcomes(
    appId: string,
    notification: IOSNotification,
  ): Promise<void> {
    await this.put(
      TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
      NotificationReceivedForOutcomesSerializer.toDatabase(
        appId,
        notification,
        new Date().getTime(),
      ),
    );
  }

  async resetSentUniqueOutcomes(): Promise<void> {
    const outcomes = await this.getAll<SentUniqueOutcome>('SentUniqueOutcome');
    const promises = outcomes.map((o) => {
      o.sentDuringSession = null;
      return Database.put('SentUniqueOutcome', o);
    });
    await Promise.all(promises);
  }

  /**
   * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them
   * with blank values.
   * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
   */
  static async rebuild() {
    return Promise.all([
      Database.singletonInstance.remove('Ids'),
      Database.singletonInstance.remove('NotificationOpened'),
      Database.singletonInstance.remove('Options'),
      Database.singletonInstance.remove(TABLE_OUTCOMES_NOTIFICATION_RECEIVED),
      Database.singletonInstance.remove(TABLE_OUTCOMES_NOTIFICATION_CLICKED),
      Database.singletonInstance.remove('SentUniqueOutcome'),
    ]);
  }

  // START: Static mappings to instance methods
  static async on(...args: any[]) {
    // eslint-disable-next-line prefer-spread
    return Database.singletonInstance.emitter.on.apply(
      Database.singletonInstance.emitter,
      args,
    );
  }

  static async setIsPushEnabled(enabled: boolean): Promise<void> {
    return Database.singletonInstance.setIsPushEnabled(enabled);
  }

  public static async getCurrentSession(): Promise<Session | null> {
    return await Database.singletonInstance.getSession(ONESIGNAL_SESSION_KEY);
  }

  public static async upsertSession(session: Session): Promise<void> {
    await Database.singletonInstance.setSession(session);
  }

  public static async cleanupCurrentSession(): Promise<void> {
    await Database.singletonInstance.removeSession(ONESIGNAL_SESSION_KEY);
  }

  static async setSubscription(subscription: Subscription) {
    return await Database.singletonInstance.setSubscription(subscription);
  }

  static async getSubscription(): Promise<Subscription> {
    return await Database.singletonInstance.getSubscription();
  }

  static async setConsentGiven(consent: boolean): Promise<void> {
    return await Database.singletonInstance.setProvideUserConsent(consent);
  }

  static async getConsentGiven(): Promise<boolean> {
    return await Database.singletonInstance.getConsentGiven();
  }

  static async setAppState(appState: AppState) {
    return await Database.singletonInstance.setAppState(appState);
  }

  static async getAppState(): Promise<AppState> {
    return await Database.singletonInstance.getAppState();
  }

  static async setUserState(userState: UserState) {
    return await Database.singletonInstance.setUserState(userState);
  }

  static async getUserState(): Promise<UserState> {
    return await Database.singletonInstance.getUserState();
  }

  static async setAppConfig(appConfig: AppConfig) {
    return await Database.singletonInstance.setAppConfig(appConfig);
  }

  static async getAppConfig(): Promise<AppConfig> {
    return await Database.singletonInstance.getAppConfig();
  }

  static async getLastNotificationClickedForOutcomes(
    appId: string,
  ): Promise<OutcomesNotificationClicked | null> {
    return await Database.singletonInstance.getLastNotificationClickedForOutcomes(
      appId,
    );
  }

  static async removeAllNotificationClickedForOutcomes(): Promise<void> {
    return await Database.singletonInstance.removeAllNotificationClickedForOutcomes();
  }

  static async getAllNotificationReceivedForOutcomes(): Promise<
    OutcomesNotificationReceived[]
  > {
    return await Database.singletonInstance.getAllNotificationReceivedForOutcomes();
  }

  static async putNotificationReceivedForOutcomes(
    appId: string,
    notification: IOSNotification,
  ): Promise<void> {
    return await Database.singletonInstance.putNotificationReceivedForOutcomes(
      appId,
      notification,
    );
  }

  static async getAllNotificationClickedForOutcomes(): Promise<
    OutcomesNotificationClicked[]
  > {
    return await Database.singletonInstance.getAllNotificationClickedForOutcomes();
  }

  static async putNotificationClickedForOutcomes(
    appId: string,
    event: NotificationClickEventInternal,
  ): Promise<void> {
    return await Database.singletonInstance.putNotificationClickedForOutcomes(
      appId,
      event,
    );
  }

  static async putNotificationClickedEventPendingUrlOpening(
    event: NotificationClickEventInternal,
  ): Promise<void> {
    return await Database.singletonInstance.putNotificationClickedEventPendingUrlOpening(
      event,
    );
  }

  static async resetSentUniqueOutcomes(): Promise<void> {
    return await Database.singletonInstance.resetSentUniqueOutcomes();
  }

  static async setDeviceId(deviceId: string | null): Promise<void> {
    await Database.singletonInstance.setDeviceId(deviceId);
  }

  static async remove(table: OneSignalDbTable, keypath?: string) {
    return await Database.singletonInstance.remove(table, keypath);
  }

  static async put(table: OneSignalDbTable, keypath: any) {
    return await Database.singletonInstance.put(table, keypath);
  }

  static async get<T>(table: OneSignalDbTable, key?: string): Promise<T> {
    return await Database.singletonInstance.get<T>(table, key);
  }

  static async getAll<T>(table: OneSignalDbTable): Promise<Array<T>> {
    return await Database.singletonInstance.getAll<T>(table);
  }
  // END: Static mappings to instance methods
}
