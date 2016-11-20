import * as log from 'loglevel';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import Event from './events.js';
import { getConsoleStyle } from './utils';
import IndexedDb from './indexedDb.js';
import Environment from './environment.js';
import {AppState} from "./models/AppState";
import {Subscription} from "./models/Subscription";
import {AppConfig} from "./models/AppConfig";
import {UV_UDP_REUSEADDR} from "constants";
import {Uuid} from "./models/Uuid";
import {ServiceWorkerConfig} from "./models/ServiceWorkerConfig";
import {ServiceWorkerState} from "./models/ServiceWorkerState";
import {Notification} from "./models/Notification";

export default class Database {

  static get EVENTS() {
    return {
      REBUILT: 'dbRebuilt',
      RETRIEVED: 'dbRetrieved',
      SET: 'dbSet',
      REMOVED: 'dbRemoved',
    }
  }

  static _getReturnHelper(table: string, key: string, result) {
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
  static get<T>(table: string, key: string): Promise<T> {
    return new Promise((resolve) => {
      if (!Environment.isServiceWorker() && OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{table: table, key: key}], reply => {
          let result = reply.data[0];
          Event.trigger(Database.EVENTS.RETRIEVED, {table: table, key: key, result: result});
          resolve(result);
        });
      } else {
        return IndexedDb.get(table, key)
          .then(result => {
            let cleanResult = Database._getReturnHelper(table, key, result);
            Event.trigger(Database.EVENTS.RETRIEVED, {table: table, key: key, result: cleanResult});
            resolve(cleanResult);
          });
      }
    });
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   * @param table
   * @param keypath
   */
  static put(table: string, keypath: any) {
    return new Promise((resolve, reject) => {
      if (!Environment.isServiceWorker() && OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{table: table, keypath: keypath}], reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            Event.trigger(Database.EVENTS.SET, keypath);
            resolve();
          } else {
            reject(`(Database) Attempted remote IndexedDB put(${table}, ${keypath}), but did not get success response.`);
          }
        });
      } else {
        return IndexedDb.put(table, keypath)
          .then(() => {
            Event.trigger(Database.EVENTS.SET, keypath);
            resolve();
          });
      }
    });
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  static remove(table: string, keypath?: string) {
    return new Promise((resolve, reject) => {
      if (!Environment.isServiceWorker() && OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, [{table: table, keypath: keypath}], reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            Event.trigger(Database.EVENTS.REMOVED, [table, keypath]);
            resolve();
          } else {
            reject(`(Database) Attempted remote IndexedDB remove(${table}, ${keypath}), but did not get success response.`);
          }
        });
      } else {
        return IndexedDb.remove(table, keypath)
          .then(() => {
            Event.trigger(Database.EVENTS.REMOVED, [table, keypath]);
            resolve();
          });
      }
    });
  }

  static async getAppConfig(): Promise<AppConfig> {
    const config = new AppConfig();
    config.appId = await Database.get<Uuid>('Ids', 'appId');
    config.subdomain = await Database.get<string>('Options', 'subdomain');
    config.autoRegister = await Database.get<boolean>('Options', 'autoRegister');
    config.serviceWorkerConfig = await Database.get<ServiceWorkerConfig>('Options', 'serviceWorkerConfig');
    return config;
  }

  static async setAppConfig(appConfig: AppConfig) {
    if (appConfig.appId)
      await Database.put('Ids', {type: 'appId', id: appConfig.appId})
    if (appConfig.subdomain)
      await Database.put('Options', {key: 'subdomain', value: appConfig.subdomain})
    if (appConfig.autoRegister)
      await Database.put('Options', {key: 'autoRegister', value: appConfig.autoRegister})
    if (appConfig.serviceWorkerConfig)
      await Database.put('Options', {key: 'serviceWorkerConfig', value: appConfig.serviceWorkerConfig})
  }

  static async getAppState(): Promise<AppState> {
    const state = new AppState();
    state.defaultNotificationUrl = await Database.get<URL>('Options', 'defaultUrl');
    state.defaultNotificationTitle = await Database.get<string>('Options', 'defaultTitle');
    return state;
  }

  static async setAppState(appState: AppState) {
    if (appState.defaultNotificationUrl)
      await Database.put("Options", {key: "defaultUrl", value: appState.defaultNotificationUrl});
    if (appState.defaultNotificationTitle)
      await Database.put("Options", {key: "defaultTitle", value: appState.defaultNotificationTitle});
  }

  static async getServiceWorkerConfig(): Promise<ServiceWorkerConfig> {
    const config = new ServiceWorkerConfig();
    config.scope = await Database.get<string>('Options', 'workerScope');
    config.workerName = await Database.get<string>('Options', 'workerName');
    config.updaterWorkerName = await Database.get<string>('Options', 'updaterWorkerName');
    config.workerFilePath = await Database.get<string>('Options', 'workerFilePath');
    return config;
  }

  static async setServiceWorkerConfig(config: ServiceWorkerConfig) {
    if (config.scope)
      await Database.put('Options', {key: 'workerScope', value: config.scope});
    if (config.workerName)
      await Database.put('Options', {key: 'workerName', value: config.workerName});
    if (config.updaterWorkerName)
      await Database.put('Options', {key: 'updaterWorkerName', value: config.updaterWorkerName});
    if (config.workerFilePath)
      await Database.put('Options', {key: 'workerFilePath', value: config.workerFilePath});
  }

  static async getServiceWorkerState(): Promise<ServiceWorkerState> {
    const state = new ServiceWorkerState();
    state.workerVersion = await Database.get<number>('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION');
    state.updaterWorkerVersion = await Database.get<number>('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION');
    state.backupNotification = await Database.get<Notification>('Ids', 'backupNotification');
    return state;
  }

  static async setServiceWorkerState(state: ServiceWorkerState) {
    if (state.workerVersion)
      await Database.put('Ids', {type: 'WORKER1_ONE_SIGNAL_SW_VERSION', id: state.workerVersion});
    if (state.updaterWorkerVersion)
      await Database.put('Ids', {type: 'WORKER2_ONE_SIGNAL_SW_VERSION', id: state.updaterWorkerVersion});
    if (state.backupNotification)
      await Database.put('Ids', {type: 'backupNotification', id: state.backupNotification});
  }

  static async getSubscription(): Promise<Subscription> {
    const subscription = new Subscription();
    subscription.deviceId = await Database.get<Uuid>('Ids', 'userId');
    subscription.endpoint = await Database.get<URL>('Options', 'subscriptionEndpoint');
    subscription.token = await Database.get<string>('Ids', 'registrationId');
    return subscription;
  }

  static async setSubscription(subscription: Subscription) {
    if (subscription.deviceId)
      await Database.put('Ids', {type: 'userId', id: subscription.deviceId});
    if (subscription.endpoint)
      await Database.put('Options', {key: 'subscriptionEndpoint', value: subscription.endpoint});
    if (subscription.token)
      await Database.put('Ids', {key: 'registrationId', value: subscription.token});
  }

  /**
   * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them with blank values.
   * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
   */
  static rebuild() {
    return Promise.all([
      Database.remove('Ids'),
      Database.remove('NotificationOpened'),
      Database.remove('Options'),
    ]);
  }

  static printIds() {
    return Promise.all([
      Database.get('Ids', 'appId'),
      Database.get('Ids', 'registrationId'),
      Database.get('Ids', 'userId')
    ]).then(function([appId, registrationId, userId]) {
      if (console.table) {
       console.table({'OneSignal Database IDs': {
         'App ID': appId,
         'Registration ID': registrationId,
         'User ID': userId
       }});
      } else {
        console.info('App ID:', appId);
        console.info('Registration ID:', registrationId);
        console.info('User ID:', userId);
      }
    });
  }
}

heir.merge(Database, new EventEmitter());
