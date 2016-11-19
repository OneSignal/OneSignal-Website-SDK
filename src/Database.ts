import * as log from 'loglevel';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import Event from './events.js';
import { getConsoleStyle } from './utils';
import IndexedDb from './indexedDb.js';
import Environment from './environment.js';


export default class Database {

  static get EVENTS() {
    return {
      REBUILT: 'dbRebuilt',
      RETRIEVED: 'dbRetrieved',
      SET: 'dbSet',
      REMOVED: 'dbRemoved',
    }
  }

  static _getReturnHelper(table, key, result) {
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
  static get(table, key) {
    return new Promise((resolve, reject) => {
      let databaseValue = null;
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
  static put(table, keypath) {
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
  static remove(table, keypath) {
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

  static setDefaultUrl(url: URL) {
    return Database.put("Options", {key: "defaultUrl", value: url});
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
