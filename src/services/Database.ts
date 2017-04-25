import IndexedDb from "./IndexedDb";
import Environment from "../Environment";
import {AppState} from "../models/AppState";
import {Subscription} from "../models/Subscription";
import {AppConfig} from "../models/AppConfig";
import {Uuid} from "../models/Uuid";
import {ServiceWorkerConfig} from "../models/ServiceWorkerConfig";
import {ServiceWorkerState} from "../models/ServiceWorkerState";
import {Notification} from "../models/Notification";
import SubscriptionHelper from "../helpers/SubscriptionHelper";
import {Timestamp} from "../models/Timestamp";
import Emitter from "../libraries/Emitter";

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
        break;
      case 'Ids':
        if (result && key) {
          return result.id;
        } else if (result && !key) {
          return result;
        } else {
          return null;
        }
        break;
      case 'NotificationOpened':
        if (result && key) {
          return {data: result.data, timestamp: result.timestamp};
        } else if (result && !key) {
          return result;
        } else {
          return null;
        }
        break;
      default:
        if (result) {
          return result;
        } else {
          return null;
        }
        break;
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
      if (!Environment.isServiceWorker() &&
          SubscriptionHelper.isUsingSubscriptionWorkaround() &&
          !Environment.isTest()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{
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
      if (!Environment.isServiceWorker() &&
        SubscriptionHelper.isUsingSubscriptionWorkaround() &&
        !Environment.isTest()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{table: table, keypath: keypath}], reply => {
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
  async remove(table: string, keypath?: string) {
    return new Promise(async (resolve, reject) => {
      if (!Environment.isServiceWorker() &&
        SubscriptionHelper.isUsingSubscriptionWorkaround() &&
        !Environment.isTest()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, [{table: table, keypath: keypath}], reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject(`(Database) Attempted remote IndexedDB remove(${table}, ${keypath}), but did not get success response.`);
          }
        });
      } else {
        return await this.database.remove(table, keypath);
      }
    });
  }

  async getAppConfig(): Promise<AppConfig> {
    const config = new AppConfig();
    config.appId = await this.get<Uuid>('Ids', 'appId');
    config.subdomain = await this.get<string>('Options', 'subdomain');
    config.autoRegister = await this.get<boolean>('Options', 'autoRegister');
    config.serviceWorkerConfig = await this.get<ServiceWorkerConfig>('Options', 'serviceWorkerConfig');
    return config;
  }

  async setAppConfig(appConfig: AppConfig) {
    if (appConfig.appId)
      await this.put('Ids', {type: 'appId', id: appConfig.appId})
    if (appConfig.subdomain)
      await this.put('Options', {key: 'subdomain', value: appConfig.subdomain})
    if (appConfig.autoRegister)
      await this.put('Options', {key: 'autoRegister', value: appConfig.autoRegister})
    if (appConfig.serviceWorkerConfig)
      await this.put('Options', {key: 'serviceWorkerConfig', value: appConfig.serviceWorkerConfig})
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

  async getServiceWorkerConfig(): Promise<ServiceWorkerConfig> {
    const config = new ServiceWorkerConfig();
    config.scope = await this.get<string>('Options', 'workerScope');
    config.workerName = await this.get<string>('Options', 'workerName');
    config.updaterWorkerName = await this.get<string>('Options', 'updaterWorkerName');
    config.workerFilePath = await this.get<string>('Options', 'workerFilePath');
    return config;
  }

  async setServiceWorkerConfig(config: ServiceWorkerConfig) {
    if (config.scope)
      await this.put('Options', {key: 'workerScope', value: config.scope});
    if (config.workerName)
      await this.put('Options', {key: 'workerName', value: config.workerName});
    if (config.updaterWorkerName)
      await this.put('Options', {key: 'updaterWorkerName', value: config.updaterWorkerName});
    if (config.workerFilePath)
      await this.put('Options', {key: 'workerFilePath', value: config.workerFilePath});
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
    subscription.deviceId = await this.get<Uuid>('Ids', 'userId');
    subscription.pushEndpoint = await this.get<URL>('Options', 'subscriptionEndpoint');
    subscription.pushToken = await this.get<string>('Ids', 'registrationId');

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
    if (subscription.deviceId)
      await this.put('Ids', {type: 'userId', id: subscription.deviceId});
    if (subscription.pushEndpoint)
      await this.put('Options', {key: 'subscriptionEndpoint', value: subscription.pushEndpoint});
    if (subscription.pushToken)
      await this.put('Ids', {type: 'registrationId', id: subscription.pushToken});
    if (subscription.optedOut != null) // Checks if null or undefined, allows false
      await this.put('Options', {key: 'optedOut', value: subscription.optedOut});
  }

  /**
   * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them with blank values.
   * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
   */
  async rebuild() {
    return Promise.all([
      this.remove('Ids'),
      this.remove('NotificationOpened'),
      this.remove('Options'),
    ]);
  }

  async printIds() {
    return Promise.all([
      this.get('Ids', 'appId'),
      this.get('Ids', 'registrationId'),
      this.get('Ids', 'userId')
    ]).then(function([appId, registrationId, userId]) {
      if (console.table) {
       console.table({'OneSignal Database IDs': {
         'App ID': appId,
         'Registration ID': registrationId,
         'User ID': userId
       }});
      } else {
        log.info('App ID:', appId);
        log.info('Registration ID:', registrationId);
        log.info('User ID:', userId);
      }
    });
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
  static async setSubscription(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setSubscription.apply(Database.databaseInstance, args);
  }
  static async getSubscription(...args: any[]): Promise<Subscription> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getSubscription.apply(Database.databaseInstance, args);
  }
  static async setServiceWorkerState(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setServiceWorkerState.apply(Database.databaseInstance, args);
  }
  static async getServiceWorkerState(...args: any[]): Promise<ServiceWorkerState> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getServiceWorkerState.apply(Database.databaseInstance, args);
  }
  static async setServiceWorkerConfig(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setServiceWorkerConfig.apply(Database.databaseInstance, args);
  }
  static async getServiceWorkerConfig(...args: any[]): Promise<ServiceWorkerConfig> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getServiceWorkerConfig.apply(Database.databaseInstance, args);
  }
  static async setAppState(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setAppState.apply(Database.databaseInstance, args);
  }
  static async getAppState(...args: any[]): Promise<AppState> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getAppState.apply(Database.databaseInstance, args);
  }
  static async setAppConfig(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.setAppConfig.apply(Database.databaseInstance, args);
  }
  static async getAppConfig(...args: any[]): Promise<AppConfig> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.getAppConfig.apply(Database.databaseInstance, args);
  }
  static async remove(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.remove.apply(Database.databaseInstance, args);
  }
  static async put(...args: any[]) {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.put.apply(Database.databaseInstance, args);
  }
  static async get<T>(...args: any[]): Promise<T> {
    Database.ensureSingletonInstance();
    return Database.databaseInstance.get.apply(Database.databaseInstance, args);
  }
}