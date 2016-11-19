import * as log from 'loglevel';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import Event from './events.js';
import { getConsoleStyle } from './utils';
import Database from './Database';


export default class IndexedDb {

  /**
   * Returns an existing instance or creates a new instances of the database.
   * @returns {Promise} Returns a promise that is fulfilled when the database becomes accessible or rejects when an error occurs.
   */
  static getInstance() {
    return new Promise(function (resolve, reject) {
      if (IndexedDb._instance) {
        resolve(IndexedDb._instance);
      } else {
        let request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
        request.onsuccess = (event) => {
          if (IndexedDb._instance) {
            let redundantDb = event.target.result;
            redundantDb.close();
            resolve(IndexedDb._instance);
          } else {
            let database = event.target.result;
            IndexedDb._instance = database;
            resolve(database);
          }
        };
        request.onerror = (event) => {
          log.error('OneSignal: Unable to open IndexedDB.', event.target.error.name + ': ' + event.target.error.message);
          reject(event);
        };
        request.onupgradeneeded = (event) => {
          log.info('OneSignal: IndexedDB is being rebuilt or upgraded.', event);
          let db = event.target.result;
          db.createObjectStore("Ids", {
            keyPath: "type"
          });
          db.createObjectStore("NotificationOpened", {
            keyPath: "url"
          });
          db.createObjectStore("Options", {
            keyPath: "key"
          });
          Event.trigger(Database.EVENTS.REBUILT);
        };
        request.onversionchange = (event) => {
          log.warn('The database is about to be deleted.');
        };
      }
    });
  }

  /**
   * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
   * @param table The table to retrieve the value from.
   * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
   * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
   */
  static get(table, key) {
    if (key) {
      // Return a table-key value
      return IndexedDb.getInstance().then(database => {
        return new Promise(function (resolve, reject) {
          var request = database.transaction(table).objectStore(table).get(key);
          request.onsuccess = () => {
            resolve(request.result);
          };
          request.onerror = () => {
            reject(request.errorCode);
          };
        });
      });
    } else {
      // Return all values in table
      return IndexedDb.getInstance().then(database => {
        return new Promise(function (resolve, reject) {
          let jsonResult = {};
          let cursor = database.transaction(table).objectStore(table).openCursor();
          cursor.onsuccess = (event) => {
            var cursorResult = event.target.result;
            if (cursorResult) {
              jsonResult[cursorResult.key] = cursorResult.value.value;
              cursorResult.continue();
            } else {
              resolve(jsonResult);
            }
          };
          cursor.onerror = (event) => {
            reject(cursor.errorCode);
          };
        });
      });
    }
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   * @param table
   * @param key
   */
  static put(table, key) {
    return IndexedDb.getInstance().then((database) => {
      return new Promise((resolve, reject) => {
        try {
          let request = database.transaction([table], 'readwrite').objectStore(table).put(key);
          request.onsuccess = (event) => {
            resolve(key);
          };
          request.onerror = (e) => {
            log.error('Database PUT Transaction Error:', e);
            reject(e);
          };
        } catch (e) {
          log.error('Database PUT Error:', e);
          reject(e);
        }
      });
    });
  }

  /**
   * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  static remove(table, key) {
    if (key) {
      // Remove a single key from a table
      var method = "delete";
    } else {
      // Remove all keys from the table (wipe the table)
      var method = "clear";
    }
    return IndexedDb.getInstance().then((database) => {
      return new Promise((resolve, reject) => {
        try {
          let request = database.transaction([table], 'readwrite').objectStore(table)[method](key);
          request.onsuccess = (event) => {
            resolve(key);
          };
          request.onerror = (e) => {
            log.error('Database REMOVE Transaction Error:', e);
            reject(e);
          };
        } catch (e) {
          log.error('Database REMOVE Error:', e);
          reject(e);
        }
      });
    });
  }

  /**
   * Asynchronously removes the Ids, NotificationOpened, and Options tables from the database and recreates them with blank values.
   * @returns {Promise} Returns a promise that is fulfilled when rebuilding is completed, or rejects with an error.
   */
  static rebuild() {
    return Promise.all([
      IndexedDb.remove('Ids'),
      IndexedDb.remove('NotificationOpened'),
      IndexedDb.remove('Options'),
    ]);
  }
}

heir.merge(IndexedDb, new EventEmitter());
