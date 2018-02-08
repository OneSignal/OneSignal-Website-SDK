import SubscriptionHelper from '../helpers/SubscriptionHelper';
import Emitter from '../libraries/Emitter';
import SdkEnvironment from '../managers/SdkEnvironment';
import { AppConfig } from '../models/AppConfig';
import { AppState } from '../models/AppState';
import { Notification } from '../models/Notification';
import { ServiceWorkerState } from '../models/ServiceWorkerState';
import { Subscription } from '../models/Subscription';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { Timestamp } from '../models/Timestamp';
import { Uuid } from '../models/Uuid';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import IndexedDb from './IndexedDb';
import * as Browser from 'bowser';
import { EmailProfile } from '../models/EmailProfile';

enum DatabaseEventName {
  SET
}

export default class Database {

  public emitter: Emitter;
  private database: IndexedDb;

  /* Temp Database Proxy */
  public static databaseInstanceName: string;
  public static databaseInstance: Database;
  /* End Temp Database Proxy */

  public static EVENTS = DatabaseEventName;

  constructor(private databaseName: string) {
    this.emitter = new Emitter();
    this.database = new IndexedDb(this.databaseName);
  }

  static applyDbResultFilter(table: string, key: string, result) {
    switch (table) {
      case 'Options':
        if (result && key) {
          return result.value;
        } else if (result && !key) {
          return result;
        } else {
          return null;
        }
      case 'Ids':
        if (result && key) {
          return result.id;
        } else if (result && !key) {
          return result;
        } else {
          return null;
        }
      case 'NotificationOpened':
        if (result && key) {
          return {data: result.data, timestamp: result.timestamp};
        } else if (result && !key) {
          return result;
        } else {
          return null;
        }
      default:
        if (result) {
          return result;
        } else {
          return null;
        }
    }
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
   * If on an iFrame or popup environment, retrieves from the correct IndexedDB database using cross-domain messaging.
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  async get<T>(table: string, key?: string): Promise<T> {
    return await new Promise<T>(async (resolve) => {
      if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
          SubscriptionHelper.isUsingSubscriptionWorkaround() &&
          SdkEnvironment.getTestEnv() === TestEnvironmentKind.None) {
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{
          table: table,
          key: key
        }], reply => {
          let result = reply.data[0];
          resolve(result);
        });
      } else {
        const result = await this.database.get(table, key);
        let cleanResult = Database.applyDbResultFilter(table, key, result);
        resolve(cleanResult);
      }
    });
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   * @param table
   * @param keypath
   */
  async put(table: string, keypath: any) {
    await new Promise(async (resolve, reject) => {
      if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
        SubscriptionHelper.isUsingSubscriptionWorkaround() &&
        SdkEnvironment.getTestEnv() === TestEnvironmentKind.None) {
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{table: table, keypath: keypath}], reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject(`(Database) Attempted remote IndexedDB put(${table}, ${keypath}), but did not get success response.`);
          }
        });
      } else {
        await this.database.put(table, keypath);
        resolve();
      }
    });
    this.emitter.emit(Database.EVENTS.SET, keypath);
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  remove(table: string, keypath?: string) {
    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
      SubscriptionHelper.isUsingSubscriptionWorkaround() &&
      SdkEnvironment.getTestEnv() === TestEnvironmentKind.None) {
      return new Promise((resolve, reject) => {
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, [{ table: table, keypath: keypath }], reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject(`(Database) Attempted remote IndexedDB remove(${table}, ${keypath}), but did not get success response.`);
          }
        });
      });
    }
    else {
      return this.database.remove(table, keypath);
    }
  }

  async getAppConfig(): Promise<any> {
    const config: any = {};
    const appIdStr: string = await this.get<string>('Ids', 'appId');
    config.appId = new Uuid(appIdStr);
    config.subdomain = await this.get<string>('Options', 'subdomain');
    config.vapidPublicKey = await this.get<string>('Options', 'vapidPublicKey');
    config.emailAuthRequired = await this.get<boolean>('Options', 'emailAuthRequired');
    return config;
  }

  async setAppConfig(appConfig: AppConfig) {
    if (appConfig.appId && appConfig.appId.value)
      await this.put('Ids', {type: 'appId', id: appConfig.appId.value})
    if (appConfig.subdomain)
      await this.put('Options', {key: 'subdomain', value: appConfig.subdomain})
    if (appConfig.httpUseOneSignalCom === true)
      await this.put('Options', { key: 'httpUseOneSignalCom', value: true })
    else if (appConfig.httpUseOneSignalCom === false)
      await this.put('Options', {key: 'httpUseOneSignalCom', value: false })
    if (appConfig.emailAuthRequired === true)
      await this.put('Options', { key: 'emailAuthRequired', value: true })
    else if (appConfig.emailAuthRequired === false)
      await this.put('Options', {key: 'emailAuthRequired', value: false })
    if (appConfig.vapidPublicKey)
      await this.put('Options', {key: 'vapidPublicKey', value: appConfig.vapidPublicKey})
  }

  async getAppState(): Promise<AppState> {
    const state = new AppState();
    state.defaultNotificationUrl = await this.get<string>('Options', 'defaultUrl');
    state.defaultNotificationTitle = await this.get<string>('Options', 'defaultTitle');
    state.lastKnownPushEnabled = await this.get<boolean>('Options', 'isPushEnabled');
    state.clickedNotifications = await this.get<Map<URL, [Notification, Timestamp]>>('NotificationOpened');
    return state;
  }

  async setAppState(appState: AppState) {
    if (appState.defaultNotificationUrl)
      await this.put("Options", {key: "defaultUrl", value: appState.defaultNotificationUrl});
    if (appState.defaultNotificationTitle || appState.defaultNotificationTitle === '')
      await this.put("Options", {key: "defaultTitle", value: appState.defaultNotificationTitle});
    if (appState.lastKnownPushEnabled != null)
      await this.put('Options', {key: 'isPushEnabled', value: appState.lastKnownPushEnabled});
    if (appState.clickedNotifications) {
      const clickedNotificationUrls = Object.keys(appState.clickedNotifications);
      for (let url of clickedNotificationUrls) {
        const notificationDetails = appState.clickedNotifications[url];
        if (notificationDetails) {
          await this.put('NotificationOpened', {
            url: url,
            data: (notificationDetails as any).data,
            timestamp: (notificationDetails as any).timestamp
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

  async getServiceWorkerState(): Promise<ServiceWorkerState> {
    const state = new ServiceWorkerState();
    state.workerVersion = await this.get<number>('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION');
    state.updaterWorkerVersion = await this.get<number>('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION');
    state.backupNotification = await this.get<Notification>('Ids', 'backupNotification');
    return state;
  }

   async setServiceWorkerState(state: ServiceWorkerState) {
    if (state.workerVersion)
      await this.put('Ids', {type: 'WORKER1_ONE_SIGNAL_SW_VERSION', id: state.workerVersion});
    if (state.updaterWorkerVersion)
      await this.put('Ids', {type: 'WORKER2_ONE_SIGNAL_SW_VERSION', id: state.updaterWorkerVersion});
    if (state.backupNotification)
      await this.put('Ids', {type: 'backupNotification', id: state.backupNotification});
  }

  async getSubscription(): Promise<Subscription> {
    const subscription = new Subscription();
    const deviceIdStr: string = await this.get<string>('Ids', 'userId');
    subscription.deviceId = new Uuid(deviceIdStr);
    subscription.subscriptionToken = await this.get<string>('Ids', 'registrationId');

    // The preferred database key to store our subscription
    const dbOptedOut = await this.get<boolean>('Options', 'optedOut');
    // For backwards compatibility, we need to read from this if the above is not found
    const dbNotOptedOut = await this.get<boolean>('Options', 'subscription');

    if (dbOptedOut != null) {
      subscription.optedOut = dbOptedOut;
    } else {
      if (dbNotOptedOut == null) {
        subscription.optedOut = false;
      } else {
        subscription.optedOut = !dbNotOptedOut;
      }
    }

    return subscription;
  }

  async setSubscription(subscription: Subscription) {
    if (subscription.deviceId && subscription.deviceId.value) {
      await this.put('Ids', { type: 'userId', id: subscription.deviceId.value });
    }
    if (subscription.subscriptionToken) {
      await this.put('Ids', { type: 'registrationId', id: subscription.subscriptionToken });
    }
    if (subscription.optedOut != null) { // Checks if null or undefined, allows false
      await this.put('Options', { key: 'optedOut', value: subscription.optedOut });
    }
  }

  async getEmailProfile(): Promise<EmailProfile> {
    const profileJson = await this.get<string>('Ids', 'emailProfile');
    if (profileJson) {
      return EmailProfile.deserialize(profileJson);
    } else {
      return new EmailProfile();
    }
  }

  async setEmailProfile(emailProfile: EmailProfile): Promise<void> {
    if (emailProfile) {
      await this.put('Ids', { type: 'emailProfile', id: emailProfile.serialize() });
    }
  }

  /**
   * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them with blank values.
   * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
   */
  static async rebuild() {
    Database.ensureSingletonInstance();
    return Promise.all([
      Database.databaseInstance.remove('Ids'),
      Database.databaseInstance.remove('NotificationOpened'),
      Database.databaseInstance.remove('Options'),
    ]);
  }

  /* Temp Database Proxy */
  static ensureSingletonInstance() {
    if (!Database.databaseInstanceName) {
      Database.databaseInstanceName = "ONE_SIGNAL_SDK_DB";
    }
    if (!Database.databaseInstance) {
      Database.databaseInstance = new Database(Database.databaseInstanceName);
    }
  }
  /* End Temp Database Proxy */

  static async on(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.emitter.on.apply(Database.databaseInstance.emitter, args);
  }
  static async setEmailProfile(emailProfile: EmailProfile) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setEmailProfile.call(Database.databaseInstance, emailProfile);
  }
  static async getEmailProfile(): Promise<EmailProfile> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getEmailProfile.call(Database.databaseInstance);
  }
  static async setSubscription(subscription: Subscription) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setSubscription.call(Database.databaseInstance, subscription);
  }
  static async getSubscription(): Promise<Subscription> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getSubscription.call(Database.databaseInstance);
  }
  static async setServiceWorkerState(workerState: ServiceWorkerState) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setServiceWorkerState.call(Database.databaseInstance, workerState);
  }
  static async getServiceWorkerState(): Promise<ServiceWorkerState> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getServiceWorkerState.call(Database.databaseInstance);
  }
  static async setAppState(appState: AppState) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setAppState.call(Database.databaseInstance, appState);
  }
  static async getAppState(): Promise<AppState> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getAppState.call(Database.databaseInstance);
  }
  static async setAppConfig(appConfig: AppConfig) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setAppConfig.call(Database.databaseInstance, appConfig);
  }
  static async getAppConfig(): Promise<AppConfig> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getAppConfig.call(Database.databaseInstance);
  }
  static async remove(table: string, keypath?: string) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.remove.call(Database.databaseInstance, table, keypath);
  }
  static async put(table: string, keypath: any) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.put.call(Database.databaseInstance, table, keypath);
  }
  static async get<T>(table: string, key?: string): Promise<T> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.get.call(Database.databaseInstance, table, key);
  }
}
