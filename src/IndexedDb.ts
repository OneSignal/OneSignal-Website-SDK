import * as log from 'loglevel';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import Event from './Event.ts';
import { getConsoleStyle, contains } from './utils';
import Database from './Database';


export default class IndexedDb {

  static _instance: IndexedDb;

  /**
   * Returns an existing instance or creates a new instances of the database.
   * @returns {Promise} Returns a promise that is fulfilled when the database becomes accessible or rejects when an error occurs.
   */
  static getInstance(): Promise<IDBDatabase> {
    return new Promise(function (resolve, reject) {
      if (IndexedDb._instance) {
        resolve(IndexedDb._instance);
      } else {
        try {
          var request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
        } catch (e) {
          // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
          // for profile schema too high
        }
        request.onsuccess = ({target}) => {
          let db = (<any>target).result;
          if (IndexedDb._instance) {
            db.close();
            resolve(IndexedDb._instance);
          } else {
            IndexedDb._instance = db;
            resolve(db);
          }
        };
        request.onerror = (event) => {
          const error = (<any>event.target).error;
          if (contains(error.message, 'The operation failed for reasons unrelated to the database itself and not covered by any other error code') ||
              contains(error.message, 'A mutation operation was attempted on a database that did not allow mutations')) {
            log.warn("OneSignal: IndexedDb web storage is not available on this origin since this profile's IndexedDb schema has been upgraded in a newer version of Firefox. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1236557#c6");
            // Never reject the Promise
          } else {
            log.error('OneSignal: Unable to open IndexedDB.', error.name + ': ' + error.message);
            reject(event);
          }
        };
        request.onupgradeneeded = (event) => {
          log.info('OneSignal: IndexedDB is being rebuilt or upgraded.', event);
          let db = (<any>event.target).result;
          db.createObjectStore("Ids", {
            keyPath: "type"
          });
          db.createObjectStore("NotificationOpened", {
            keyPath: "url"
          });
          db.createObjectStore("Options", {
            keyPath: "key"
          });
          Event.trigger(Database.EVENTS.REBUILT, null, null);
        };
        (<any>request).onversionchange = (event) => {
          log.debug('The database is about to be deleted.');
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
  static async get(table: string, key?: string): Promise<any> {
    let db = await IndexedDb.getInstance();
    if (key) {
      // Return a table-key value
      return new Promise((resolve, reject) => {
        var request: IDBRequest = db.transaction(table).objectStore(table).get(key);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } else {
      // Return all values in table
      return new Promise((resolve, reject) => {
        let jsonResult = {};
        let cursor = db.transaction(table).objectStore(table).openCursor();
        cursor.onsuccess = (event: any) => {
          var cursorResult: IDBCursorWithValue = event.target.result;
          if (cursorResult) {
            let cursorResultKey: any = cursorResult.key;
            jsonResult[cursorResultKey] = cursorResult.value;
            cursorResult.continue();
          } else {
            resolve(jsonResult);
          }
        };
        cursor.onerror = (event) => {
          reject(cursor.error);
        };
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
  static remove(table: string, key?: string) {
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
