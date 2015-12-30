import log from 'loglevel';
import Event from './events.js';


export default class Database {

  static get EVENTS() {
    return {
      REBUILT: 'onesignal.db.rebuilt',
      RETRIEVED: 'onesignal.db.retrieved',
      SET: 'onesignal.db.set'
    };
  }

  /**
   * Returns an existing instance or creates a new instances of the database.
   * @returns {Promise} Returns a promise that is fulfilled when the database becomes accessible or rejects when an error occurs.
   */
  static getInstance() {
    return new Promise(function (resolve, reject) {
      if (Database._instance) {
        resolve(Database._instance);
      } else {
        let request = indexedDB.open("ONE_SIGNAL_SDK_DB", 1);
        request.onsuccess = (event) => {
          let database = event.target.result;
          Database._instance = database;
          log.debug('Opening IndexedDB instance.');
          resolve(database);
        };
        request.onerror = (event) => {
          log.error('Unable to open IndexedDB.', event);
          reject(event);
        };
        request.onupgradeneeded = (event) => {
          log.info('The OneSignal SDK is rebuilding its IndexedDB schema from a clean slate.');
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
      return new Promise(function (resolve, reject) {
        Database.getInstance().then((database) => {
          var request = database.transaction(table).objectStore(table).get(key);
          request.onsuccess = () => {
            Event.trigger(Database.EVENTS.RETRIEVED, {table: table, key: key, result: request.result});
            resolve(request.result);
          };
          request.onerror = () => {
            reject(request.errorCode);
          };
        }).catch(function (e) {
          log.error(e);
          reject(e);
        });
      });
    } else {
      // Return all values in table
      return new Promise(function (resolve, reject) {
        Database.getInstance().then((database) => {
          let jsonResult = {};
          let cursor = database.transaction(table).objectStore(table).openCursor();
          cursor.onsuccess = (event) => {
            var cursorResult = event.target.result;
            if (cursorResult) {
              Event.trigger(Database.EVENTS.RETRIEVED, cursorResult.value);
              jsonResult[cursorResult.key] = cursorResult.value.value;
              cursorResult.continue();
            } else {
              resolve(jsonResult);
            }
          };
          cursor.onerror = (event) => {
            reject(cursor.errorCode);
          };
        }).catch(function (e) {
          log.error(e);
          reject(e);
        });
      });
    }
  }

  /**
   * Asynchronously puts the specified value in the specified table.
   * @param table
   * @param key
   */
  static put(table, value) {
    return new Promise(function (resolve, reject) {
      Database.getInstance().then((database) => {
        database.transaction([table], 'readwrite').objectStore(table).put(value);
        Event.trigger(Database.EVENTS.SET, value);
        resolve(value);
      }).catch(function (e) {
        log.error(e);
        reject(e);
      });
    });
  }

  /**
   * Asynchronously removes the specified key from the table.
   * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
   */
  static remove(table, key) {
    return new Promise(function (resolve) {
      Database.getInstance().then((database) => {
        database.transaction([table], 'readwrite').objectStore(table).delete(key);
        resolve(key);
      }).catch(function (e) {
        log.error(e);
        reject(e);
      });
    });
  }
}