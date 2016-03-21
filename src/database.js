import log from 'loglevel';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import Event from './events.js';
import { getConsoleStyle } from './utils.js';
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

  static _getReturnHelper(table, result, resolve) {
    switch (table) {
      case 'Options':
        if (result) {
          resolve(result.value);
        } else {
          resolve(null);
        }
        break;
      case 'Ids':
        if (result) {
          resolve(result.id);
        } else {
          resolve(null);
        }
        break;
      case 'NotificationOpened':
        if (result) {
          resolve({data: result.data, timestamp: result.timestamp});
        } else {
          resolve(null);
        }
        break;
      default:
        if (result) {
          resolve(result);
        } else {
          resolve(null);
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
    // TODO: Fire event properly when Database.get(table) is called without a key to get all values of the table
    // TODO: Event.trigger(IndexedDb.EVENTS.RETRIEVED, cursorResult.value);
    return new Promise((resolve, reject) => {
      let databaseValue = null;
      if (!Environment.isServiceWorker() && OneSignal.isUsingSubscriptionWorkaround()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_GET, [{table: table, key: key}], reply => {
          let result = reply.data[0];
          let cleanResult = Database._getReturnHelper(table, result, resolve);
          Event.trigger(Database.EVENTS.RETRIEVED, {table: table, key: key, result: cleanResult});
          resolve(cleanResult);
        });
      } else {
        return IndexedDb.get(table, key)
          .then(result => {
            let cleanResult = Database._getReturnHelper(table, result, resolve);
            Event.trigger(Database.EVENTS.RETRIEVED, {table: table, key: key, result: cleanResult});
            resolve(cleanResult);
          })
          .catch(e => reject(e));
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
          })
          .catch(e => reject(e));
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
          })
          .catch(e => reject(e));
      }
    });
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
    Promise.all([
      Database.get('Ids', 'appId'),
      Database.get('Ids', 'registrationId'),
      Database.get('Ids', 'userId')
    ]).then(function(contents) {
      console.info('appId:', contents[0]);
      console.info('registrationId:', contents[1]);
      console.info('userId:', contents[2]);
    });
  }

  static printPushLog() {
    Database.get('Options', 'pushLog')
      .then(pushLogResult => {
        if (pushLogResult) {
          console.info('Push Log:', pushLogResult);
        } else {
          console.info('No push log found.');
        }
      })
  }

  static getPushLog() {
    return new Promise(resolve => {
      Database.get('Options', 'pushLog')
        .then(pushLogResult => {
          if (pushLogResult) {
            if (typeof window !== 'undefined') {
              window.pushlog = pushLogResult;
            } else {
              self.pushlog = pushLogResult;
            }
            console.info(`Push log stored in variable %cpushlog`, getConsoleStyle('code'), ".");
            resolve(pushLogResult);
          } else {
            log.info('No push log found.');
            resolve(null);
          }
        })
    });
  }

  static clearPushLog() {
    Database.put('Options', {key: 'pushLog', value: {}})
      .then(() => console.info('Push log cleared.'));
  }

  static copyPushLog() {
    Database.get('Options', 'pushLog')
      .then(pushLogResult => {
        if (pushLogResult) {
          if (typeof window !== 'undefined') {
            window.pushlog = pushLogResult;
            console.info(`Push log set into variable. Please run this code now to copy the push log to your clipboard: %ccopy(window.pushlog)`, getConsoleStyle('code'), ". You should see 'undefined' but the contents will be copied to your clipboard.");
          } else {
            self.pushlog = pushLogResult;
            console.info(`Push log set into variable. Please run this code now to copy the push log to your clipboard: %ccopy(self.pushlog)`, getConsoleStyle('code'));
          }
        } else {
          console.warn('No push log found.');
        }
      })
  }

  static readPushLog(pushLog) {
    if (!pushLog || pushLog == '') {
      console.warn('Please pass in the entire stringified push log as a parameter. Example usage: %cOneSignal.database.readPushLog(`{ "ff5fb87e-40d9-4232-8df8-9300f3a0feaf": { "retrieved": "2016-02-24T05:43:25.705Z", "displayed": "2016-02-24T05:43:25.709Z" }}`)', getConsoleStyle('code'));
      return;
    }
    var pushLog = JSON.parse(pushLog);
    var pushLogKeys = Object.keys(pushLog);
    var actions = ['retrieved', 'displayed', 'clicked'];
    for (var key of pushLogKeys) {
      for (var action of actions) {
        if (pushLog[key][action]) {
          // Convert string date to Date object
          pushLog[key][action] = new Date(pushLog[key][action]);
        }
      }
    }
    return pushLog;
  }

  static _wipeBetaSettings() {
    Promise.all([
      Database.remove('Options', 'persistNotification'),
      Database.remove('Options', 'webhooks.cors'),
      Database.remove('Options', 'webhooks.notification.displayed'),
      Database.remove('Options', 'webhooks.notification.clicked'),
    ]);
  }
}

heir.merge(Database, new EventEmitter());
