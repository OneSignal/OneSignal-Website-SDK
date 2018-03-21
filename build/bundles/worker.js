(function (ExtendableError,bowser,JSONP) {
    'use strict';

    ExtendableError = ExtendableError && ExtendableError.hasOwnProperty('default') ? ExtendableError['default'] : ExtendableError;
    bowser = bowser && bowser.hasOwnProperty('default') ? bowser['default'] : bowser;
    JSONP = JSONP && JSONP.hasOwnProperty('default') ? JSONP['default'] : JSONP;

    var BuildEnvironmentKind;
    (function (BuildEnvironmentKind) {
        BuildEnvironmentKind["Development"] = "Development";
        BuildEnvironmentKind["Staging"] = "Staging";
        BuildEnvironmentKind["Production"] = "Production";
    })(BuildEnvironmentKind || (BuildEnvironmentKind = {}));

    var TestEnvironmentKind;
    (function (TestEnvironmentKind) {
        TestEnvironmentKind["None"] = "None";
        TestEnvironmentKind["UnitTesting"] = "Unit Testing";
    })(TestEnvironmentKind || (TestEnvironmentKind = {}));

    var WindowEnvironmentKind;
    (function (WindowEnvironmentKind) {
        /**
         * A service worker environment.
         */
        WindowEnvironmentKind["ServiceWorker"] = "ServiceWorker";
        /**
         * The top-level frame to the "main" client's site.
         */
        WindowEnvironmentKind["Host"] = "Host";
        /**
         * Our subscription popup for alt-origin sites.
         */
        WindowEnvironmentKind["OneSignalSubscriptionPopup"] = "Popup";
        /**
         * Our subscription modal for HTTPS sites, which loads in an iFrame.
         */
        WindowEnvironmentKind["OneSignalSubscriptionModal"] = "Modal";
        /**
         * Our subscription helper iFrame.
         */
        WindowEnvironmentKind["OneSignalProxyFrame"] = "ProxyFrame";
        /**
         * A custom iFrame on the site.
         */
        WindowEnvironmentKind["CustomIframe"] = "CustomFrame";
        /**
         * An unknown window context type not matching any of the above.
         */
        WindowEnvironmentKind["Unknown"] = "Unknown";
    })(WindowEnvironmentKind || (WindowEnvironmentKind = {}));

    class OneSignalError extends ExtendableError {
        constructor(message) {
            super(message);
        }
    }

    var InvalidArgumentReason;
    (function (InvalidArgumentReason) {
        InvalidArgumentReason[InvalidArgumentReason["Empty"] = 0] = "Empty";
        InvalidArgumentReason[InvalidArgumentReason["Malformed"] = 1] = "Malformed";
        InvalidArgumentReason[InvalidArgumentReason["EnumOutOfRange"] = 2] = "EnumOutOfRange";
    })(InvalidArgumentReason || (InvalidArgumentReason = {}));
    class InvalidArgumentError extends OneSignalError {
        constructor(argName, reason) {
            switch (reason) {
                case InvalidArgumentReason.Empty:
                    super(`Supply a non-empty value to '${argName}'.`);
                    break;
                case InvalidArgumentReason.Malformed:
                    super(`The value for '${argName}' was malformed.`);
                    break;
                case InvalidArgumentReason.EnumOutOfRange:
                    super(`The value for '${argName}' was out of range of the expected input enum.`);
                    break;
            }
            this.argument = argName;
            this.reason = InvalidArgumentReason[reason];
        }
    }

    var PushPermissionNotGrantedErrorReason;
    (function (PushPermissionNotGrantedErrorReason) {
        PushPermissionNotGrantedErrorReason[PushPermissionNotGrantedErrorReason["Blocked"] = 0] = "Blocked";
        PushPermissionNotGrantedErrorReason[PushPermissionNotGrantedErrorReason["Dismissed"] = 1] = "Dismissed";
        PushPermissionNotGrantedErrorReason[PushPermissionNotGrantedErrorReason["Default"] = 2] = "Default";
    })(PushPermissionNotGrantedErrorReason || (PushPermissionNotGrantedErrorReason = {}));
    class PushPermissionNotGrantedError extends OneSignalError {
        constructor(reason) {
            switch (reason) {
                case PushPermissionNotGrantedErrorReason.Dismissed:
                    super('The user dismissed the permission prompt.');
                    break;
                case PushPermissionNotGrantedErrorReason.Blocked:
                    super('Notification permissions are blocked.');
                    break;
                case PushPermissionNotGrantedErrorReason.Default:
                    super('Notification permissions have not been granted yet.');
                    break;
            }
            this.reason = reason;
        }
    }

    class TimeoutError extends OneSignalError {
        constructor(message = "The asynchronous operation has timed out.") {
            super(message);
            this.message = message;
        }
    }

    /**
     * Source: https://github.com/pazguille/emitter-es6
     */
    /**
     * Creates a new instance of Emitter.
     * @class
     * @returns {Object} emitter - An instance of Emitter.
     * @example
     * var emitter = new Emitter();
     */
    class Emitter {
        constructor() {
            this._events = {};
        }
        ;
        /**
         * Adds a listener to the collection for a specified event.
         */
        on(event, listener) {
            this._events[event] = this._events[event] || [];
            this._events[event].push(listener);
            return this;
        }
        ;
        /**
         * Adds a one time listener to the collection for a specified event. It will
         * execute only once.
         */
        once(event, listener) {
            let that = this;
            function fn() {
                that.off(event, fn);
                listener.apply(this, arguments);
            }
            fn.listener = listener;
            this.on(event, fn);
            return this;
        }
        ;
        /**
         * Removes a listener from the collection for a specified event.
         */
        off(event, listener) {
            let listeners = this._events[event];
            if (listeners !== undefined) {
                for (let j = 0; j < listeners.length; j += 1) {
                    if (listeners[j] === listener || listeners[j].listener === listener) {
                        listeners.splice(j, 1);
                        break;
                    }
                }
                if (listeners.length === 0) {
                    this.removeAllListeners(event);
                }
            }
            return this;
        }
        ;
        /**
         * Removes all listeners from the collection for a specified event.
         */
        removeAllListeners(event) {
            try {
                delete this._events[event];
            }
            catch (e) { }
            return this;
        }
        ;
        /**
         * Returns all listeners from the collection for a specified event.
         * @public
         * @function
         * @name Emitter#listeners
         * @param {String} event - Event name.
         * @returns {Array}
         * @example
         * me.listeners('ready');
         */
        listeners(event) {
            try {
                return this._events[event];
            }
            catch (e) {
                return undefined;
            }
        }
        ;
        /**
         * Execute each item in the listener collection in order with the specified
         * data.
         */
        emit(..._) {
            let args = [].slice.call(arguments, 0); // converted to array
            let event = args.shift();
            let listeners = this._events[event];
            if (listeners !== undefined) {
                listeners = listeners.slice(0);
                let len = listeners.length;
                for (let i = 0; i < len; i += 1) {
                    listeners[i].apply(this, args);
                }
            }
            return this;
        }
        ;
    }

    class AppState {
    }

    class ServiceWorkerState {
    }

    class Subscription {
        serialize() {
            return {
                deviceId: this.deviceId,
                subscriptionToken: this.subscriptionToken,
                optedOut: this.optedOut,
                createdAt: this.createdAt,
                expirationTime: this.expirationTime,
            };
        }
        static deserialize(bundle) {
            const subscription = new Subscription();
            subscription.deviceId = bundle.deviceId;
            subscription.subscriptionToken = bundle.subscriptionToken;
            subscription.optedOut = bundle.optedOut;
            subscription.createdAt = bundle.createdAt;
            subscription.expirationTime = bundle.expirationTime;
            return subscription;
        }
    }

    class Log {
        static createProxyMethods() {
            if (typeof this.proxyMethodsCreated !== "undefined") {
                return;
            }
            else {
                this.proxyMethodsCreated = true;
            }
            const methods = {
                "log": "debug",
                "trace": "trace",
                "info": "info",
                "warn": "warn",
                "error": "error"
            };
            for (const nativeMethod of Object.keys(methods)) {
                const nativeMethodExists = typeof console[nativeMethod] !== "undefined";
                if (nativeMethodExists) {
                    this[nativeMethod] = console[nativeMethod].bind(console);
                }
                else {
                    this[nativeMethod] = function () { };
                }
            }
        }
    }
    Log.createProxyMethods();

    class IndexedDb {
        constructor(databaseName) {
            this.databaseName = databaseName;
            this.emitter = new Emitter();
        }
        open(databaseName) {
            return new Promise(resolve => {
                try {
                    // Open algorithm: https://www.w3.org/TR/IndexedDB/#h-opening
                    var request = indexedDB.open(databaseName, 1);
                }
                catch (e) {
                    // Errors should be thrown on the request.onerror event, but just in case Firefox throws additional errors
                    // for profile schema too high
                }
                if (!request) {
                    return null;
                }
                request.onerror = this.onDatabaseOpenError;
                request.onblocked = this.onDatabaseOpenBlocked;
                request.onupgradeneeded = this.onDatabaseUpgradeNeeded;
                request.onsuccess = () => {
                    this.database = request.result;
                    this.database.onerror = this.onDatabaseError;
                    this.database.onversionchange = this.onDatabaseVersionChange;
                    resolve(this.database);
                };
            });
        }
        async ensureDatabaseOpen() {
            if (!this.openLock) {
                this.openLock = this.open(this.databaseName);
            }
            await this.openLock;
            return this.database;
        }
        onDatabaseOpenError(event) {
            // Prevent the error from bubbling: https://bugzilla.mozilla.org/show_bug.cgi?id=1331103#c3
            /**
             * To prevent error reporting tools like Sentry.io from picking up errors that
             * the site owner can't do anything about and use up their quota, hide database open
             * errors.
             */
            event.preventDefault();
            const error = event.target.error;
            if (contains(error.message, 'The operation failed for reasons unrelated to the database itself and not covered by any other error code') ||
                contains(error.message, 'A mutation operation was attempted on a database that did not allow mutations')) {
                Log.warn("OneSignal: IndexedDb web storage is not available on this origin since this profile's IndexedDb schema has been upgraded in a newer version of Firefox. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1236557#c6");
            }
            else {
                Log.warn('OneSignal: Fatal error opening IndexedDb database:', error);
            }
        }
        /**
         * Error events bubble. Error events are targeted at the request that generated the error, then the event bubbles to
         * the transaction, and then finally to the database object. If you want to avoid adding error handlers to every
         * request, you can instead add a single error handler on the database object.
         */
        onDatabaseError(event) {
            Log.debug('IndexedDb: Generic database error', event.target.errorCode);
        }
        /**
         * Occurs when the upgradeneeded should be triggered because of a version change but the database is still in use
         * (that is, not closed) somewhere, even after the versionchange event was sent.
         */
        onDatabaseOpenBlocked() {
            Log.debug('IndexedDb: Blocked event');
        }
        /**
         * Occurs when a database structure change (IDBOpenDBRequest.onupgradeneeded event or IDBFactory.deleteDatabase) was
         * requested elsewhere (most probably in another window/tab on the same computer).
         *
         * versionchange Algorithm: https://www.w3.org/TR/IndexedDB/#h-versionchange-transaction-steps
         *
         * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/onversionchange
         */
        onDatabaseVersionChange(_) {
            Log.debug('IndexedDb: versionchange event');
        }
        /**
         * Occurs when a new version of the database needs to be created, or has not been created before, or a new version
         * of the database was requested to be opened when calling window.indexedDB.open.
         *
         * Ref: https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/onupgradeneeded
         */
        onDatabaseUpgradeNeeded(event) {
            Log.debug('IndexedDb: Database is being rebuilt or upgraded (upgradeneeded event).');
            const db = event.target.result;
            db.createObjectStore("Ids", {
                keyPath: "type"
            });
            db.createObjectStore("NotificationOpened", {
                keyPath: "url"
            });
            db.createObjectStore("Options", {
                keyPath: "key"
            });
            // Wrap in conditional for tests
            if (typeof OneSignal !== "undefined") {
                OneSignal._isNewVisitor = true;
            }
        }
        /**
         * Asynchronously retrieves the value of the key at the table (if key is specified), or the entire table (if key is not specified).
         * @param table The table to retrieve the value from.
         * @param key The key in the table to retrieve the value of. Leave blank to get the entire table.
         * @returns {Promise} Returns a promise that fulfills when the value(s) are available.
         */
        async get(table, key) {
            await this.ensureDatabaseOpen();
            if (key) {
                // Return a table-key value
                return await new Promise((resolve, reject) => {
                    var request = this.database.transaction(table).objectStore(table).get(key);
                    request.onsuccess = () => {
                        resolve(request.result);
                    };
                    request.onerror = () => {
                        reject(request.error);
                    };
                });
            }
            else {
                // Return all values in table
                return await new Promise((resolve, reject) => {
                    let jsonResult = {};
                    let cursor = this.database.transaction(table).objectStore(table).openCursor();
                    cursor.onsuccess = (event) => {
                        var cursorResult = event.target.result;
                        if (cursorResult) {
                            let cursorResultKey = cursorResult.key;
                            jsonResult[cursorResultKey] = cursorResult.value;
                            cursorResult.continue();
                        }
                        else {
                            resolve(jsonResult);
                        }
                    };
                    cursor.onerror = () => {
                        reject(cursor.error);
                    };
                });
            }
        }
        /**
         * Asynchronously puts the specified value in the specified table.
         */
        async put(table, key) {
            await this.ensureDatabaseOpen();
            return await new Promise((resolve, reject) => {
                try {
                    let request = this.database.transaction([table], 'readwrite').objectStore(table).put(key);
                    request.onsuccess = () => {
                        resolve(key);
                    };
                    request.onerror = (e) => {
                        Log.error('Database PUT Transaction Error:', e);
                        reject(e);
                    };
                }
                catch (e) {
                    Log.error('Database PUT Error:', e);
                    reject(e);
                }
            });
        }
        /**
         * Asynchronously removes the specified key from the table, or if the key is not specified, removes all keys in the table.
         * @returns {Promise} Returns a promise containing a key that is fulfilled when deletion is completed.
         */
        remove(table, key) {
            if (key) {
                // Remove a single key from a table
                var method = "delete";
            }
            else {
                // Remove all keys from the table (wipe the table)
                var method = "clear";
            }
            return new Promise((resolve, reject) => {
                try {
                    let request = this.database.transaction([table], 'readwrite').objectStore(table)[method](key);
                    request.onsuccess = () => {
                        resolve(key);
                    };
                    request.onerror = (e) => {
                        Log.error('Database REMOVE Transaction Error:', e);
                        reject(e);
                    };
                }
                catch (e) {
                    Log.error('Database REMOVE Error:', e);
                    reject(e);
                }
            });
        }
    }

    class EmailProfile {
        serialize() {
            return {
                emailAddress: this.emailAddress,
                emailAuthHash: this.emailAuthHash,
                emailId: this.emailId,
            };
        }
        static deserialize(bundle) {
            const emailProfile = new EmailProfile();
            emailProfile.emailId = bundle.emailId;
            emailProfile.emailAddress = bundle.emailAddress;
            emailProfile.emailAuthHash = bundle.emailAuthHash;
            return emailProfile;
        }
    }

    var DatabaseEventName;
    (function (DatabaseEventName) {
        DatabaseEventName[DatabaseEventName["SET"] = 0] = "SET";
    })(DatabaseEventName || (DatabaseEventName = {}));
    class Database {
        constructor(databaseName) {
            this.databaseName = databaseName;
            this.emitter = new Emitter();
            this.database = new IndexedDb(this.databaseName);
        }
        static applyDbResultFilter(table, key, result) {
            switch (table) {
                case 'Options':
                    if (result && key) {
                        return result.value;
                    }
                    else if (result && !key) {
                        return result;
                    }
                    else {
                        return null;
                    }
                case 'Ids':
                    if (result && key) {
                        return result.id;
                    }
                    else if (result && !key) {
                        return result;
                    }
                    else {
                        return null;
                    }
                case 'NotificationOpened':
                    if (result && key) {
                        return { data: result.data, timestamp: result.timestamp };
                    }
                    else if (result && !key) {
                        return result;
                    }
                    else {
                        return null;
                    }
                default:
                    if (result) {
                        return result;
                    }
                    else {
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
        async get(table, key) {
            return await new Promise(async (resolve) => {
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
                }
                else {
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
        async put(table, keypath) {
            await new Promise(async (resolve, reject) => {
                if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
                    SubscriptionHelper.isUsingSubscriptionWorkaround() &&
                    SdkEnvironment.getTestEnv() === TestEnvironmentKind.None) {
                    OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_PUT, [{ table: table, keypath: keypath }], reply => {
                        if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                            resolve();
                        }
                        else {
                            reject(`(Database) Attempted remote IndexedDB put(${table}, ${keypath}), but did not get success response.`);
                        }
                    });
                }
                else {
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
        remove(table, keypath) {
            if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
                SubscriptionHelper.isUsingSubscriptionWorkaround() &&
                SdkEnvironment.getTestEnv() === TestEnvironmentKind.None) {
                return new Promise((resolve, reject) => {
                    OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_DATABASE_REMOVE, [{ table: table, keypath: keypath }], reply => {
                        if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
                            resolve();
                        }
                        else {
                            reject(`(Database) Attempted remote IndexedDB remove(${table}, ${keypath}), but did not get success response.`);
                        }
                    });
                });
            }
            else {
                return this.database.remove(table, keypath);
            }
        }
        async getAppConfig() {
            const config = {};
            const appIdStr = await this.get('Ids', 'appId');
            config.appId = appIdStr;
            config.subdomain = await this.get('Options', 'subdomain');
            config.vapidPublicKey = await this.get('Options', 'vapidPublicKey');
            config.emailAuthRequired = await this.get('Options', 'emailAuthRequired');
            return config;
        }
        async setAppConfig(appConfig) {
            if (appConfig.appId && appConfig.appId)
                await this.put('Ids', { type: 'appId', id: appConfig.appId });
            if (appConfig.subdomain)
                await this.put('Options', { key: 'subdomain', value: appConfig.subdomain });
            if (appConfig.httpUseOneSignalCom === true)
                await this.put('Options', { key: 'httpUseOneSignalCom', value: true });
            else if (appConfig.httpUseOneSignalCom === false)
                await this.put('Options', { key: 'httpUseOneSignalCom', value: false });
            if (appConfig.emailAuthRequired === true)
                await this.put('Options', { key: 'emailAuthRequired', value: true });
            else if (appConfig.emailAuthRequired === false)
                await this.put('Options', { key: 'emailAuthRequired', value: false });
            if (appConfig.vapidPublicKey)
                await this.put('Options', { key: 'vapidPublicKey', value: appConfig.vapidPublicKey });
        }
        async getAppState() {
            const state = new AppState();
            state.defaultNotificationUrl = await this.get('Options', 'defaultUrl');
            state.defaultNotificationTitle = await this.get('Options', 'defaultTitle');
            state.lastKnownPushEnabled = await this.get('Options', 'isPushEnabled');
            state.clickedNotifications = await this.get('NotificationOpened');
            return state;
        }
        async setAppState(appState) {
            if (appState.defaultNotificationUrl)
                await this.put("Options", { key: "defaultUrl", value: appState.defaultNotificationUrl });
            if (appState.defaultNotificationTitle || appState.defaultNotificationTitle === '')
                await this.put("Options", { key: "defaultTitle", value: appState.defaultNotificationTitle });
            if (appState.lastKnownPushEnabled != null)
                await this.put('Options', { key: 'isPushEnabled', value: appState.lastKnownPushEnabled });
            if (appState.clickedNotifications) {
                const clickedNotificationUrls = Object.keys(appState.clickedNotifications);
                for (let url of clickedNotificationUrls) {
                    const notificationDetails = appState.clickedNotifications[url];
                    if (notificationDetails) {
                        await this.put('NotificationOpened', {
                            url: url,
                            data: notificationDetails.data,
                            timestamp: notificationDetails.timestamp
                        });
                    }
                    else if (notificationDetails === null) {
                        // If we get an object like:
                        // { "http://site.com/page": null}
                        // It means we need to remove that entry
                        await this.remove('NotificationOpened', url);
                    }
                }
            }
        }
        async getServiceWorkerState() {
            const state = new ServiceWorkerState();
            state.workerVersion = await this.get('Ids', 'WORKER1_ONE_SIGNAL_SW_VERSION');
            state.updaterWorkerVersion = await this.get('Ids', 'WORKER2_ONE_SIGNAL_SW_VERSION');
            state.backupNotification = await this.get('Ids', 'backupNotification');
            return state;
        }
        async setServiceWorkerState(state) {
            if (state.workerVersion)
                await this.put('Ids', { type: 'WORKER1_ONE_SIGNAL_SW_VERSION', id: state.workerVersion });
            if (state.updaterWorkerVersion)
                await this.put('Ids', { type: 'WORKER2_ONE_SIGNAL_SW_VERSION', id: state.updaterWorkerVersion });
            if (state.backupNotification)
                await this.put('Ids', { type: 'backupNotification', id: state.backupNotification });
        }
        async getSubscription() {
            const subscription = new Subscription();
            subscription.deviceId = await this.get('Ids', 'userId');
            subscription.subscriptionToken = await this.get('Ids', 'registrationId');
            // The preferred database key to store our subscription
            const dbOptedOut = await this.get('Options', 'optedOut');
            // For backwards compatibility, we need to read from this if the above is not found
            const dbNotOptedOut = await this.get('Options', 'subscription');
            const createdAt = await this.get('Options', 'subscriptionCreatedAt');
            const expirationTime = await this.get('Options', 'subscriptionExpirationTime');
            if (dbOptedOut != null) {
                subscription.optedOut = dbOptedOut;
            }
            else {
                if (dbNotOptedOut == null) {
                    subscription.optedOut = false;
                }
                else {
                    subscription.optedOut = !dbNotOptedOut;
                }
            }
            subscription.createdAt = createdAt;
            subscription.expirationTime = expirationTime;
            return subscription;
        }
        async setSubscription(subscription) {
            if (subscription.deviceId && subscription.deviceId) {
                await this.put('Ids', { type: 'userId', id: subscription.deviceId });
            }
            if (typeof subscription.subscriptionToken !== "undefined") {
                // Allow null subscriptions to be set
                await this.put('Ids', { type: 'registrationId', id: subscription.subscriptionToken });
            }
            if (subscription.optedOut != null) {
                await this.put('Options', { key: 'optedOut', value: subscription.optedOut });
            }
            if (subscription.createdAt != null) {
                await this.put('Options', { key: 'subscriptionCreatedAt', value: subscription.createdAt });
            }
            if (subscription.expirationTime != null) {
                await this.put('Options', { key: 'subscriptionExpirationTime', value: subscription.expirationTime });
            }
            else {
                await this.remove('Options', 'subscriptionExpirationTime');
            }
        }
        async getEmailProfile() {
            const profileJson = await this.get('Ids', 'emailProfile');
            if (profileJson) {
                return EmailProfile.deserialize(profileJson);
            }
            else {
                return new EmailProfile();
            }
        }
        async setEmailProfile(emailProfile) {
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
        static async on(...args) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.emitter.on.apply(Database.databaseInstance.emitter, args);
        }
        static async setEmailProfile(emailProfile) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.setEmailProfile.call(Database.databaseInstance, emailProfile);
        }
        static async getEmailProfile() {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.getEmailProfile.call(Database.databaseInstance);
        }
        static async setSubscription(subscription) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.setSubscription.call(Database.databaseInstance, subscription);
        }
        static async getSubscription() {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.getSubscription.call(Database.databaseInstance);
        }
        static async setServiceWorkerState(workerState) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.setServiceWorkerState.call(Database.databaseInstance, workerState);
        }
        static async getServiceWorkerState() {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.getServiceWorkerState.call(Database.databaseInstance);
        }
        static async setAppState(appState) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.setAppState.call(Database.databaseInstance, appState);
        }
        static async getAppState() {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.getAppState.call(Database.databaseInstance);
        }
        static async setAppConfig(appConfig) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.setAppConfig.call(Database.databaseInstance, appConfig);
        }
        static async getAppConfig() {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.getAppConfig.call(Database.databaseInstance);
        }
        static async remove(table, keypath) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.remove.call(Database.databaseInstance, table, keypath);
        }
        static async put(table, keypath) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.put.call(Database.databaseInstance, table, keypath);
        }
        static async get(table, key) {
            Database.ensureSingletonInstance();
            return Database.databaseInstance.get.call(Database.databaseInstance, table, key);
        }
    }
    /* End Temp Database Proxy */
    Database.EVENTS = DatabaseEventName;

    function isArray(variable) {
        return Object.prototype.toString.call(variable) === '[object Array]';
    }
    var decodeTextArea = null;
    function decodeHtmlEntities(text) {
        if (Environment.isBrowser()) {
            if (!decodeTextArea) {
                decodeTextArea = document.createElement("textarea");
            }
        }
        if (decodeTextArea) {
            decodeTextArea.innerHTML = text;
            return decodeTextArea.value;
        }
        else {
            // Not running in a browser environment, text cannot be decoded
            return text;
        }
    }
    function redetectBrowserUserAgent() {
        /*
       TODO: Make this a little neater
       During testing, the browser object may be initialized before the userAgent is injected
      */
        if (bowser.name === '' && bowser.version === '') {
            var browser = bowser._detect(navigator.userAgent);
        }
        else {
            var browser = bowser;
        }
        return browser;
    }
    function isChromeLikeBrowser() {
        return bowser.chrome ||
            bowser.chromium ||
            bowser.opera ||
            bowser.yandexbrowser;
    }
    function removeDomElement(selector) {
        var els = document.querySelectorAll(selector);
        if (els.length > 0) {
            for (let i = 0; i < els.length; i++)
                els[i].parentNode.removeChild(els[i]);
        }
    }
    /**
     * Helper method for public APIs that waits until OneSignal is initialized, rejects if push notifications are
     * not supported, and wraps these tasks in a Promise.
     */
    function awaitOneSignalInitAndSupported() {
        return new Promise(resolve => {
            if (!OneSignal.initialized) {
                OneSignal.once(OneSignal.EVENTS.SDK_INITIALIZED, resolve);
            }
            else {
                resolve();
            }
        });
    }
    /**
     * JSON.stringify() but converts functions to "[Function]" so they aren't lost.
     * Helps when logging method calls.
     */
    function stringify(obj) {
        return JSON.stringify(obj, (_, value) => {
            if (typeof value === 'function') {
                return "[Function]";
            }
            else {
                return value;
            }
        }, 4);
    }
    function logMethodCall(methodName, ...args) {
        return Log.debug(`Called %c${methodName}(${args.map(stringify).join(', ')})`, getConsoleStyle('code'), '.');
    }
    function addDomElement(targetSelectorOrElement, addOrder, elementHtml) {
        if (typeof targetSelectorOrElement === 'string')
            document.querySelector(targetSelectorOrElement).insertAdjacentHTML(addOrder, elementHtml);
        else if (typeof targetSelectorOrElement === 'object')
            targetSelectorOrElement.insertAdjacentHTML(addOrder, elementHtml);
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function clearDomElementChildren(targetSelectorOrElement) {
        if (typeof targetSelectorOrElement === 'string') {
            var element = document.querySelector(targetSelectorOrElement);
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
        else if (typeof targetSelectorOrElement === 'object') {
            while (targetSelectorOrElement.firstChild) {
                targetSelectorOrElement.removeChild(targetSelectorOrElement.firstChild);
            }
        }
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function addCssClass(targetSelectorOrElement, cssClass) {
        if (typeof targetSelectorOrElement === 'string')
            document.querySelector(targetSelectorOrElement).classList.add(cssClass);
        else if (typeof targetSelectorOrElement === 'object')
            targetSelectorOrElement.classList.add(cssClass);
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function removeCssClass(targetSelectorOrElement, cssClass) {
        if (typeof targetSelectorOrElement === 'string')
            document.querySelector(targetSelectorOrElement).classList.remove(cssClass);
        else if (typeof targetSelectorOrElement === 'object')
            targetSelectorOrElement.classList.remove(cssClass);
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function hasCssClass(targetSelectorOrElement, cssClass) {
        if (typeof targetSelectorOrElement === 'string')
            return document.querySelector(targetSelectorOrElement).classList.contains(cssClass);
        else if (typeof targetSelectorOrElement === 'object')
            return targetSelectorOrElement.classList.contains(cssClass);
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function getConsoleStyle(style) {
        if (style == 'code') {
            return `padding: 0 1px 1px 5px;border: 1px solid #ddd;border-radius: 3px;font-family: Monaco,"DejaVu Sans Mono","Courier New",monospace;color: #444;`;
        }
        else if (style == 'bold') {
            return `font-weight: 600;color: rgb(51, 51, 51);`;
        }
        else if (style == 'alert') {
            return `font-weight: 600;color: red;`;
        }
        else if (style == 'event') {
            return `color: green;`;
        }
        else if (style == 'postmessage') {
            return `color: orange;`;
        }
        else if (style == 'serviceworkermessage') {
            return `color: purple;`;
        }
        else {
            return '';
        }
    }
    /**
     * Returns a promise for the setTimeout() method.
     * @param durationMs
     * @returns {Promise} Returns a promise that resolves when the timeout is complete.
     */
    function delay(durationMs) {
        return new Promise((resolve) => {
            setTimeout(resolve, durationMs);
        });
    }
    function nothing() {
        return Promise.resolve();
    }
    function timeoutPromise(promise, milliseconds) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new TimeoutError());
            }, milliseconds);
        });
        return Promise.race([promise, timeoutPromise]);
    }
    /**
     * Returns true if match is in string; otherwise, returns false.
     */
    function contains(indexOfAble, match) {
        if (!indexOfAble)
            return false;
        return indexOfAble.indexOf(match) !== -1;
    }
    /**
     * Returns the current object without keys that have undefined values.
     * Regardless of whether the return result is used, the passed-in object is destructively modified.
     * Only affects keys that the object directly contains (i.e. not those inherited via the object's prototype).
     * @param object
     */
    function trimUndefined(object) {
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                if (object[property] === undefined) {
                    delete object[property];
                }
            }
        }
        return object;
    }
    /**
     * Returns true if the UUID is a string of 36 characters;
     * @param uuid
     * @returns {*|boolean}
     */
    function isValidUuid(uuid) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid);
    }
    /**
     * Capitalizes the first letter of the string.
     * @returns {string} The string with the first letter capitalized.
     */
    function capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    function once(targetSelectorOrElement, event, task, manualDestroy = false) {
        if (!event) {
            Log.error('Cannot call on() with no event: ', event);
        }
        if (!task) {
            Log.error('Cannot call on() with no task: ', task);
        }
        if (typeof targetSelectorOrElement === 'string') {
            let els = document.querySelectorAll(targetSelectorOrElement);
            if (els.length > 0) {
                for (let i = 0; i < els.length; i++)
                    once(els[i], event, task);
            }
        }
        else if (isArray(targetSelectorOrElement)) {
            for (let i = 0; i < targetSelectorOrElement.length; i++)
                once(targetSelectorOrElement[i], event, task);
        }
        else if (typeof targetSelectorOrElement === 'object') {
            var taskWrapper = (function () {
                var internalTaskFunction = function (e) {
                    var destroyEventListener = function () {
                        targetSelectorOrElement.removeEventListener(e.type, taskWrapper);
                    };
                    if (!manualDestroy) {
                        destroyEventListener();
                    }
                    task(e, destroyEventListener);
                };
                return internalTaskFunction;
            })();
            targetSelectorOrElement.addEventListener(event, taskWrapper);
        }
        else
            throw new Error(`${targetSelectorOrElement} must be a CSS selector string or DOM Element object.`);
    }
    function encodeHashAsUriComponent(hash) {
        let uriComponent = '';
        const keys = Object.keys(hash);
        for (var key of keys) {
            const value = hash[key];
            uriComponent += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
        return uriComponent;
    }

    const SILENT_EVENTS = [
        'notifyButtonHovering',
        'notifyButtonHover',
        'notifyButtonButtonClick',
        'notifyButtonLauncherClick',
        'animatedElementHiding',
        'animatedElementHidden',
        'animatedElementShowing',
        'animatedElementShown',
        'activeAnimatedElementActivating',
        'activeAnimatedElementActive',
        'activeAnimatedElementInactivating',
        'activeAnimatedElementInactive',
        'dbRetrieved',
        'dbSet',
        'testEvent'
    ];
    const RETRIGGER_REMOTE_EVENTS = [
        'onesignal.prompt.custom.clicked',
        'onesignal.prompt.native.permissionchanged',
        'onesignal.subscription.changed',
        'onesignal.internal.subscriptionset',
        'dbRebuilt',
        'initialize',
        'subscriptionSet',
        'sendWelcomeNotification',
        'subscriptionChange',
        'notificationPermissionChange',
        'dbSet',
        'register',
        'notificationDisplay',
        'notificationDismiss',
        'notificationClick',
        'permissionPromptDisplay',
        'testWouldDisplay',
        'testInitOptionDisabled',
        'popupWindowTimeout'
    ];
    const LEGACY_EVENT_MAP = {
        'notificationPermissionChange': 'onesignal.prompt.native.permissionchanged',
        'subscriptionChange': 'onesignal.subscription.changed',
        'customPromptClick': 'onesignal.prompt.custom.clicked',
    };
    class Event {
        /**
         * Triggers the specified event with optional custom data.
         * @param eventName The string event name to be emitted.
         * @param data Any JavaScript variable to be passed with the event.
         * @param remoteTriggerEnv If this method is being called in a different environment (e.g. was triggered in iFrame but now retriggered on main host), this is the string of the original environment for logging purposes.
         */
        static trigger(eventName, data, remoteTriggerEnv = null) {
            if (!contains(SILENT_EVENTS, eventName)) {
                let displayData = data;
                if (remoteTriggerEnv) {
                    var env = `${capitalize(SdkEnvironment.getWindowEnv().toString())} ⬸ ${capitalize(remoteTriggerEnv)}`;
                }
                else {
                    var env = capitalize(SdkEnvironment.getWindowEnv().toString());
                }
                if (displayData || displayData === false) {
                    Log.debug(`(${env}) » %c${eventName}:`, getConsoleStyle('event'), displayData);
                }
                else {
                    Log.debug(`(${env}) » %c${eventName}`, getConsoleStyle('event'));
                }
            }
            // Actually fire the event that can be listened to via OneSignal.on()
            if (Environment.isBrowser()) {
                if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
                    if (OneSignal.initialized)
                        return;
                    else
                        OneSignal.initialized = true;
                }
                OneSignal.emit(eventName, data);
            }
            if (LEGACY_EVENT_MAP.hasOwnProperty(eventName)) {
                let legacyEventName = LEGACY_EVENT_MAP[eventName];
                Event._triggerLegacy(legacyEventName, data);
            }
            // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
            if (Environment.isBrowser() &&
                (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalSubscriptionPopup ||
                    SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame)) {
                var creator = opener || parent;
                if (!creator) {
                    Log.error(`Could not send event '${eventName}' back to host page because no creator (opener or parent) found!`);
                }
                else {
                    // But only if the event matches certain events
                    if (contains(RETRIGGER_REMOTE_EVENTS, eventName)) {
                        if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalSubscriptionPopup) {
                            OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, { eventName: eventName, eventData: data });
                        }
                        else {
                            OneSignal.proxyFrame.retriggerRemoteEvent(eventName, data);
                        }
                    }
                }
            }
        }
        /**
         * Fires the event to be listened to via window.addEventListener().
         * @param eventName The string event name.
         * @param data Any JavaScript variable to be passed with the event.
         * @private
         */
        static _triggerLegacy(eventName, data) {
            var event = new CustomEvent(eventName, {
                bubbles: true, cancelable: true, detail: data
            });
            // Fire the event that listeners can listen to via 'window.addEventListener()'
            window.dispatchEvent(event);
        }
    }

    /*
     LimitStore.put('colorado', 'rocky');
     ["rocky"]
     LimitStore.put('colorado', 'mountain');
     ["rocky", "mountain"]
     LimitStore.put('colorado', 'national');
     ["mountain", "national"]
     LimitStore.put('colorado', 'park');
     ["national", "park"]
     */
    class LimitStore {
        static put(key, value) {
            if (LimitStore.store[key] === undefined) {
                LimitStore.store[key] = [null, null];
            }
            LimitStore.store[key].push(value);
            if (LimitStore.store[key].length == LimitStore.LIMIT + 1) {
                LimitStore.store[key].shift();
            }
            return LimitStore.store[key];
        }
        static get(key) {
            if (LimitStore.store[key] === undefined) {
                LimitStore.store[key] = [null, null];
            }
            return LimitStore.store[key];
        }
        static getFirst(key) {
            return LimitStore.get(key)[0];
        }
        static getLast(key) {
            return LimitStore.get(key)[1];
        }
        static remove(key) {
            delete LimitStore.store[key];
        }
        static isEmpty(key) {
            let values = LimitStore.get(key);
            return values[0] === null && values[1] === null;
        }
    }
    LimitStore.store = {};
    LimitStore.LIMIT = 2;

    var OneSignalApiErrorKind;
    (function (OneSignalApiErrorKind) {
        OneSignalApiErrorKind[OneSignalApiErrorKind["MissingAppId"] = 0] = "MissingAppId";
    })(OneSignalApiErrorKind || (OneSignalApiErrorKind = {}));
    class OneSignalApiError extends OneSignalError {
        constructor(reason) {
            switch (reason) {
                case OneSignalApiErrorKind.MissingAppId:
                    super('The API call is missing an app ID.');
                    break;
            }
        }
    }

    var SubscriptionStateKind;
    (function (SubscriptionStateKind) {
        SubscriptionStateKind[SubscriptionStateKind["Subscribed"] = 1] = "Subscribed";
        SubscriptionStateKind[SubscriptionStateKind["MutedByApi"] = -2] = "MutedByApi";
        SubscriptionStateKind[SubscriptionStateKind["NotSubscribed"] = -10] = "NotSubscribed";
        SubscriptionStateKind[SubscriptionStateKind["TemporaryWebRecord"] = -20] = "TemporaryWebRecord";
        SubscriptionStateKind[SubscriptionStateKind["PermissionRevoked"] = -21] = "PermissionRevoked";
        SubscriptionStateKind[SubscriptionStateKind["PushSubscriptionRevoked"] = -22] = "PushSubscriptionRevoked";
    })(SubscriptionStateKind || (SubscriptionStateKind = {}));

    class OneSignalApi {
        static get(action, data, headers) {
            return OneSignalApi.call('GET', action, data, headers);
        }
        static post(action, data, headers) {
            return OneSignalApi.call('POST', action, data, headers);
        }
        static put(action, data, headers) {
            return OneSignalApi.call('PUT', action, data, headers);
        }
        static delete(action, data, headers) {
            return OneSignalApi.call('DELETE', action, data, headers);
        }
        static call(method, action, data, headers) {
            let callHeaders = new Headers();
            callHeaders.append('SDK-Version', `onesignal/web/${Environment.version()}`);
            callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
            if (headers) {
                for (let key of Object.keys(headers)) {
                    callHeaders.append(key, headers[key]);
                }
            }
            let contents = {
                method: method || 'NO_METHOD_SPECIFIED',
                headers: callHeaders,
                cache: 'no-cache'
            };
            if (data)
                contents.body = JSON.stringify(data);
            var status;
            return fetch(SdkEnvironment.getOneSignalApiUrl().toString() + '/' + action, contents)
                .then(response => {
                status = response.status;
                return response.json();
            })
                .then(json => {
                if (status >= 200 && status < 300)
                    return json;
                else {
                    let error = OneSignalApi.identifyError(json);
                    if (error === 'no-user-id-error') {
                        // TODO: This returns undefined
                    }
                    else {
                        return Promise.reject(json);
                    }
                }
            });
        }
        static identifyError(error) {
            if (!error || !error.errors) {
                return 'no-error';
            }
            let errors = error.errors;
            if (contains(errors, 'No user with this id found') ||
                contains(errors, 'Could not find app_id for given player id.')) {
                return 'no-user-id-error';
            }
            return 'unknown-error';
        }
        /**
         * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
         * Used if the user clears his or her IndexedDB database and we need the user ID again.
         */
        static getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier) {
            // Calling POST /players with an existing identifier returns us that player ID
            return OneSignalApi.post('players', {
                app_id: appId,
                device_type: deviceType,
                identifier: identifier,
                notification_types: SubscriptionStateKind.TemporaryWebRecord,
            }).then(response => {
                if (response && response.id) {
                    return response.id;
                }
                else {
                    return null;
                }
            }).catch(e => {
                Log.debug('Error getting user ID from subscription identifier:', e);
                return null;
            });
        }
        static getPlayer(appId, playerId) {
            return OneSignalApi.get(`players/${playerId}?app_id=${appId}`);
        }
        static updatePlayer(appId, playerId, options) {
            return OneSignalApi.put(`players/${playerId}`, { app_id: appId, ...options });
        }
        static sendNotification(appId, playerIds, titles, contents, url, icon, data, buttons) {
            var params = {
                app_id: appId,
                contents: contents,
                include_player_ids: playerIds,
                isAnyWeb: true,
                data: data,
                web_buttons: buttons
            };
            if (titles) {
                params.headings = titles;
            }
            if (url) {
                params.url = url;
            }
            if (icon) {
                params.chrome_web_icon = icon;
                params.firefox_icon = icon;
            }
            trimUndefined(params);
            return OneSignalApi.post('notifications', params);
        }
        static async downloadServerAppConfig(appId) {
            try {
                const serverConfig = await new Promise((resolve, reject) => {
                    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
                        /**
                         * Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
                         */
                        JSONP(`${SdkEnvironment.getOneSignalApiUrl().toString()}/sync/${appId}/web`, null, (err, data) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                if (data.success) {
                                    resolve(data);
                                }
                                else {
                                    // For JSONP, we return a 200 even for errors, there's a success: false param
                                    reject(data);
                                }
                            }
                        });
                    }
                    else {
                        resolve(OneSignalApi.get(`sync/${appId}/web`, null));
                    }
                });
                return serverConfig;
            }
            catch (e) {
                throw e;
            }
        }
        static async createUser(deviceRecord) {
            const response = await OneSignalApi.post(`players`, deviceRecord.serialize());
            if (response && response.success) {
                return response.id;
            }
            else {
                return null;
            }
        }
        static async createEmailRecord(appConfig, emailProfile, pushId) {
            const response = await OneSignalApi.post(`players`, {
                app_id: appConfig.appId,
                device_type: 11,
                identifier: emailProfile.emailAddress,
                device_player_id: (pushId && pushId) ? pushId : undefined,
                email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
            });
            if (response && response.success) {
                return response.id;
            }
            else {
                return null;
            }
        }
        static async updateEmailRecord(appConfig, emailProfile, deviceId) {
            const response = await OneSignalApi.put(`players/${emailProfile.emailId}`, {
                app_id: appConfig.appId,
                identifier: emailProfile.emailAddress,
                device_player_id: (deviceId && deviceId) ? deviceId : undefined,
                email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
            });
            if (response && response.success) {
                return response.id;
            }
            else {
                return null;
            }
        }
        static async logoutEmail(appConfig, emailProfile, deviceId) {
            const response = await OneSignalApi.post(`players/${deviceId}/email_logout`, {
                app_id: appConfig.appId,
                parent_player_id: emailProfile.emailId,
                email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
            });
            if (response && response.success) {
                return true;
            }
            else {
                return false;
            }
        }
        static async updateUserSession(userId, deviceRecord) {
            try {
                const response = await OneSignalApi.post(`players/${userId}/on_session`, deviceRecord.serialize());
                if (response.id) {
                    // A new user ID can be returned
                    return response.id;
                }
                else {
                    return userId;
                }
            }
            catch (e) {
                if (e && Array.isArray(e.errors) && e.errors.length > 0 && contains(e.errors[0], 'app_id not found')) {
                    throw new OneSignalApiError(OneSignalApiErrorKind.MissingAppId);
                }
                else
                    throw e;
            }
        }
    }

    class AnimatedElement {
        /**
         * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
         * @param selector {string} The CSS selector of the element.
         * @param showClass {string} The CSS class name to add to show the element.
         * @param hideClass {string} The CSS class name to remove to hide the element.
         * @param state {string} The current state of the element, defaults to 'shown'.
         * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
         * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
         */
        constructor(selector, showClass, hideClass, state = 'shown', targetTransitionEvents = ['opacity', 'transform'], nestedContentSelector, transitionCheckTimeout = 500) {
            this.selector = selector;
            this.showClass = showClass;
            this.hideClass = hideClass;
            this.state = state;
            this.targetTransitionEvents = targetTransitionEvents;
            this.nestedContentSelector = nestedContentSelector;
            this.transitionCheckTimeout = transitionCheckTimeout;
        }
        /**
         * Asynchronously shows an element by applying its {showClass} CSS class.
         *
         * Returns a promise that is resolved with this element when it has completed its transition.
         */
        show() {
            if (!this.hidden) {
                return Promise.resolve(this);
            }
            else
                return new Promise((resolve) => {
                    this.state = 'showing';
                    Event.trigger(AnimatedElement.EVENTS.SHOWING, this);
                    if (this.hideClass)
                        removeCssClass(this.element, this.hideClass);
                    if (this.showClass)
                        addCssClass(this.element, this.showClass);
                    if (this.targetTransitionEvents.length == 0) {
                        return resolve(this);
                    }
                    else {
                        var timerId = setTimeout(() => {
                            Log.debug(`Element did not completely show (state: ${this.state}).`);
                        }, this.transitionCheckTimeout);
                        once(this.element, 'transitionend', (event, destroyListenerFn) => {
                            if (event.target === this.element &&
                                contains(this.targetTransitionEvents, event.propertyName)) {
                                clearTimeout(timerId);
                                // Uninstall the event listener for transitionend
                                destroyListenerFn();
                                this.state = 'shown';
                                Event.trigger(AnimatedElement.EVENTS.SHOWN, this);
                                return resolve(this);
                            }
                        }, true);
                    }
                });
        }
        /**
         * Asynchronously hides an element by applying its {hideClass} CSS class.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        hide() {
            if (!this.shown) {
                return Promise.resolve(this);
            }
            else
                return new Promise((resolve) => {
                    this.state = 'hiding';
                    Event.trigger(AnimatedElement.EVENTS.HIDING, this);
                    if (this.showClass)
                        removeCssClass(this.element, this.showClass);
                    if (this.hideClass)
                        addCssClass(this.element, this.hideClass);
                    if (this.targetTransitionEvents.length == 0) {
                        return resolve(this);
                    }
                    else {
                        once(this.element, 'transitionend', (event, destroyListenerFn) => {
                            var timerId = setTimeout(() => {
                                Log.debug(`Element did not completely hide (state: ${this.state}).`);
                            }, this.transitionCheckTimeout);
                            if (event.target === this.element &&
                                contains(this.targetTransitionEvents, event.propertyName)) {
                                clearTimeout(timerId);
                                // Uninstall the event listener for transitionend
                                destroyListenerFn();
                                this.state = 'hidden';
                                Event.trigger(AnimatedElement.EVENTS.HIDDEN, this);
                                return resolve(this);
                            }
                        }, true);
                    }
                });
        }
        /**
         * Asynchronously waits for an element to finish transitioning to being shown.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        waitUntilShown() {
            if (this.state === 'shown')
                return Promise.resolve(this);
            else
                return new Promise((resolve) => {
                    OneSignal.once(AnimatedElement.EVENTS.SHOWN, (event) => {
                        if (event === this) {
                            return resolve(this);
                        }
                    }, true);
                });
        }
        /**
         * Asynchronously waits for an element to finish transitioning to being hidden.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        waitUntilHidden() {
            if (this.state === 'hidden')
                return Promise.resolve(this);
            else
                return new Promise((resolve) => {
                    OneSignal.once(AnimatedElement.EVENTS.HIDDEN, (event) => {
                        if (event === this) {
                            return resolve(this);
                        }
                    }, true);
                });
        }
        static get EVENTS() {
            return {
                SHOWING: 'animatedElementShowing',
                SHOWN: 'animatedElementShown',
                HIDING: 'animatedElementHiding',
                HIDDEN: 'animatedElementHidden',
            };
        }
        /**
         * Returns the native element's innerHTML property.
         * @returns {string} Returns the native element's innerHTML property.
         */
        get content() {
            if (this.nestedContentSelector)
                return this.element.querySelector(this.nestedContentSelector).innerHTML;
            else
                return this.element.innerHTML;
        }
        /**
         * Sets the native element's innerHTML property.
         * @param value {string} The HTML to set to the element.
         */
        set content(value) {
            if (this.nestedContentSelector) {
                this.element.querySelector(this.nestedContentSelector).innerHTML = value;
            }
            else {
                this.element.innerHTML = value;
            }
        }
        /**
         * Returns the native {Element} via document.querySelector().
         * @returns {Element} Returns the native {Element} via document.querySelector().
         */
        get element() {
            return document.querySelector(this.selector);
        }
        /* States an element can be in */
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be transitioning to being shown.
         */
        get showing() {
            return this.state === 'showing';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be already shown.
         */
        get shown() {
            return this.state === 'shown';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be transitioning to hiding.
         */
        get hiding() {
            return this.state === 'hiding';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be already hidden.
         */
        get hidden() {
            return this.state === 'hidden';
        }
    }

    class ActiveAnimatedElement extends AnimatedElement {
        /**
         * Abstracts common DOM operations like hiding and showing transitionable elements into chainable promises.
         * @param selector {string} The CSS selector of the element.
         * @param showClass {string} The CSS class name to add to show the element.
         * @param hideClass {string} The CSS class name to remove to hide the element.
         * @param activeClass {string} The CSS class name to add to activate the element.
         * @param inactiveClass {string} The CSS class name to remove to inactivate the element.
         * @param state {string} The current state of the element, defaults to 'shown'.
         * @param activeState {string} The current state of the element, defaults to 'active'.
         * @param targetTransitionEvents {string} An array of properties (e.g. ['transform', 'opacity']) to look for on transitionend of show() and hide() to know the transition is complete. As long as one matches, the transition is considered complete.
         * @param nestedContentSelector {string} The CSS selector targeting the nested element within the current element. This nested element will be used for content getters and setters.
         */
        constructor(selector, showClass, hideClass, activeClass, inactiveClass, state = 'shown', activeState = 'active', targetTransitionEvents = ['opacity', 'transform'], nestedContentSelector) {
            super(selector, showClass, hideClass, state, targetTransitionEvents);
            this.selector = selector;
            this.showClass = showClass;
            this.hideClass = hideClass;
            this.activeClass = activeClass;
            this.inactiveClass = inactiveClass;
            this.state = state;
            this.activeState = activeState;
            this.targetTransitionEvents = targetTransitionEvents;
            this.nestedContentSelector = nestedContentSelector;
        }
        /**
         * Asynchronously activates an element by applying its {activeClass} CSS class.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        activate() {
            if (!this.inactive || !this.shown) {
                return Promise.resolve(this);
            }
            else
                return new Promise((resolve) => {
                    this.activeState = 'activating';
                    Event.trigger(ActiveAnimatedElement.EVENTS.ACTIVATING, this);
                    if (this.inactiveClass)
                        removeCssClass(this.element, this.inactiveClass);
                    if (this.activeClass)
                        addCssClass(this.element, this.activeClass);
                    if (this.shown) {
                        if (this.targetTransitionEvents.length == 0) {
                            return resolve(this);
                        }
                        else {
                            var timerId = setTimeout(() => {
                                Log.debug(`Element did not completely activate (state: ${this.state}, activeState: ${this.activeState}).`);
                            }, this.transitionCheckTimeout);
                            once(this.element, 'transitionend', (event, destroyListenerFn) => {
                                if (event.target === this.element &&
                                    contains(this.targetTransitionEvents, event.propertyName)) {
                                    clearTimeout(timerId);
                                    // Uninstall the event listener for transitionend
                                    destroyListenerFn();
                                    this.activeState = 'active';
                                    Event.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
                                    return resolve(this);
                                }
                            }, true);
                        }
                    }
                    else {
                        Log.debug(`Ending activate() transition (alternative).`);
                        this.activeState = 'active';
                        Event.trigger(ActiveAnimatedElement.EVENTS.ACTIVE, this);
                        return resolve(this);
                    }
                });
        }
        /**
         * Asynchronously activates an element by applying its {activeClass} CSS class.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        inactivate() {
            if (!this.active) {
                return Promise.resolve(this);
            }
            else
                return new Promise((resolve) => {
                    this.activeState = 'inactivating';
                    Event.trigger(ActiveAnimatedElement.EVENTS.INACTIVATING, this);
                    if (this.activeClass)
                        removeCssClass(this.element, this.activeClass);
                    if (this.inactiveClass)
                        addCssClass(this.element, this.inactiveClass);
                    if (this.shown) {
                        if (this.targetTransitionEvents.length == 0) {
                            return resolve(this);
                        }
                        else {
                            var timerId = setTimeout(() => {
                                Log.debug(`Element did not completely inactivate (state: ${this.state}, activeState: ${this.activeState}).`);
                            }, this.transitionCheckTimeout);
                            once(this.element, 'transitionend', (event, destroyListenerFn) => {
                                if (event.target === this.element &&
                                    contains(this.targetTransitionEvents, event.propertyName)) {
                                    clearTimeout(timerId);
                                    // Uninstall the event listener for transitionend
                                    destroyListenerFn();
                                    this.activeState = 'inactive';
                                    Event.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
                                    return resolve(this);
                                }
                            }, true);
                        }
                    }
                    else {
                        this.activeState = 'inactive';
                        Event.trigger(ActiveAnimatedElement.EVENTS.INACTIVE, this);
                        return resolve(this);
                    }
                });
        }
        /**
         * Asynchronously waits for an element to finish transitioning to being active.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        waitUntilActive() {
            if (this.active)
                return Promise.resolve(this);
            else
                return new Promise((resolve) => {
                    OneSignal.once(ActiveAnimatedElement.EVENTS.ACTIVE, (event) => {
                        if (event === this) {
                            return resolve(this);
                        }
                    }, true);
                });
        }
        /**
         * Asynchronously waits for an element to finish transitioning to being inactive.
         * @returns {Promise} Returns a promise that is resolved with this element when it has completed its transition.
         */
        waitUntilInactive() {
            if (this.inactive)
                return Promise.resolve(this);
            else
                return new Promise((resolve) => {
                    OneSignal.once(ActiveAnimatedElement.EVENTS.INACTIVE, (event) => {
                        if (event === this) {
                            return resolve(this);
                        }
                    }, true);
                });
        }
        static get EVENTS() {
            return {
                ...AnimatedElement.EVENTS,
                ...{
                    ACTIVATING: 'activeAnimatedElementActivating',
                    ACTIVE: 'activeAnimatedElementActive',
                    INACTIVATING: 'activeAnimatedElementInactivating',
                    INACTIVE: 'activeAnimatedElementInactive',
                }
            };
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be transitioning to being activated.
         */
        get activating() {
            return this.activeState === 'activating';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be already active.
         */
        get active() {
            return this.activeState === 'active';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be transitioning to inactive.
         */
        get inactivating() {
            return this.activeState === 'inactivating';
        }
        /**
         * Synchronously returns the last known state of the element.
         * @returns {boolean} Returns true if the element was last known to be already inactive.
         */
        get inactive() {
            return this.activeState === 'inactive';
        }
    }

    class Badge extends ActiveAnimatedElement {
        constructor() {
            super('.onesignal-bell-launcher-badge', 'onesignal-bell-launcher-badge-opened', null, 'onesignal-bell-launcher-badge-active', null, 'hidden');
        }
        increment() {
            // If it IS a number (is not not a number)
            if (!isNaN(this.content)) {
                let badgeNumber = +this.content; // Coerce to int
                badgeNumber += 1;
                this.content = badgeNumber.toString();
            }
        }
        show() {
            const promise = super.show();
            OneSignal.notifyButton.setCustomColorsIfSpecified();
            return promise;
        }
        decrement() {
            // If it IS a number (is not not a number)
            if (!isNaN(this.content)) {
                let badgeNumber = +this.content; // Coerce to int
                badgeNumber -= 1;
                if (badgeNumber > 0)
                    this.content = badgeNumber.toString();
                else
                    this.content = '';
            }
        }
    }

    class Message extends AnimatedElement {
        constructor(bell) {
            super('.onesignal-bell-launcher-message', 'onesignal-bell-launcher-message-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-message-body');
            this.bell = bell;
            this.contentType = '';
            this.queued = [];
        }
        static get TIMEOUT() {
            return 2500;
        }
        static get TYPES() {
            return {
                TIP: 'tip',
                MESSAGE: 'message',
                QUEUED: 'queued' // This message was a user-queued message
            };
        }
        display(type, content, duration = 0) {
            Log.debug(`Calling %cdisplay(${type}, ${content}, ${duration}).`, getConsoleStyle('code'));
            return (this.shown ? this.hide() : nothing())
                .then(() => {
                this.content = decodeHtmlEntities(content);
                this.contentType = type;
            })
                .then(() => {
                return this.show();
            })
                .then(() => delay(duration))
                .then(() => {
                return this.hide();
            })
                .then(() => {
                // Reset back to normal content type so stuff can show a gain
                this.content = this.getTipForState();
                this.contentType = 'tip';
            });
        }
        getTipForState() {
            if (this.bell.state === Bell.STATES.UNSUBSCRIBED)
                return this.bell.text['tip.state.unsubscribed'];
            else if (this.bell.state === Bell.STATES.SUBSCRIBED)
                return this.bell.text['tip.state.subscribed'];
            else if (this.bell.state === Bell.STATES.BLOCKED)
                return this.bell.text['tip.state.blocked'];
        }
        enqueue(message) {
            this.queued.push(decodeHtmlEntities(message));
            return new Promise((resolve) => {
                if (this.bell.badge.shown) {
                    this.bell.badge.hide()
                        .then(() => this.bell.badge.increment())
                        .then(() => this.bell.badge.show())
                        .then(resolve);
                }
                else {
                    this.bell.badge.increment();
                    if (this.bell.initialized)
                        this.bell.badge.show().then(resolve);
                    else
                        resolve();
                }
            });
        }
        dequeue(message) {
            let dequeuedMessage = this.queued.pop(message);
            return new Promise((resolve) => {
                if (this.bell.badge.shown) {
                    this.bell.badge.hide()
                        .then(() => this.bell.badge.decrement())
                        .then((numMessagesLeft) => {
                        if (numMessagesLeft > 0) {
                            return this.bell.badge.show();
                        }
                        else {
                            return Promise.resolve(this);
                        }
                    })
                        .then(resolve(dequeuedMessage));
                }
                else {
                    this.bell.badge.decrement();
                    resolve(dequeuedMessage);
                }
            });
        }
    }

    class Button extends ActiveAnimatedElement {
        constructor(bell) {
            super('.onesignal-bell-launcher-button', null, null, 'onesignal-bell-launcher-button-active', null, 'shown', '');
            this.bell = bell;
            this.events = {
                mouse: 'bell.launcher.button.mouse'
            };
            this.element.addEventListener('touchstart', () => {
                this.onHovering();
                this.onTap();
            }, { passive: true });
            this.element.addEventListener('mouseenter', () => {
                this.onHovering();
            });
            this.element.addEventListener('mouseleave', () => {
                this.onHovered();
            });
            this.element.addEventListener('touchmove', () => {
                this.onHovered();
            }, { passive: true });
            this.element.addEventListener('mousedown', () => {
                this.onTap();
            });
            this.element.addEventListener('mouseup', () => {
                this.onEndTap();
            });
            this.element.addEventListener('click', () => {
                this.onHovered();
                this.onClick();
            });
        }
        onHovering() {
            if (LimitStore.isEmpty(this.events.mouse) || LimitStore.getLast(this.events.mouse) === 'out') {
                Event.trigger(Bell.EVENTS.HOVERING);
            }
            LimitStore.put(this.events.mouse, 'over');
        }
        onHovered() {
            LimitStore.put(this.events.mouse, 'out');
            Event.trigger(Bell.EVENTS.HOVERED);
        }
        onTap() {
            this.pulse();
            this.activate();
            this.bell.badge.activate();
        }
        onEndTap() {
            this.inactivate();
            this.bell.badge.inactivate();
        }
        onClick() {
            Event.trigger(Bell.EVENTS.BELL_CLICK);
            Event.trigger(Bell.EVENTS.LAUNCHER_CLICK);
            if (this.bell.message.shown && this.bell.message.contentType == Message.TYPES.MESSAGE) {
                // A message is being shown, it'll disappear soon
                return;
            }
            var optedOut = LimitStore.getLast('subscription.optedOut');
            if (this.bell.unsubscribed) {
                if (optedOut) {
                    // The user is manually opted out, but still "really" subscribed
                    this.bell.launcher.activateIfInactive().then(() => {
                        this.bell.showDialogProcedure();
                    });
                }
                else {
                    // The user is actually subscribed, register him for notifications
                    OneSignal.registerForPushNotifications();
                    this.bell._ignoreSubscriptionState = true;
                    OneSignal.once(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, () => {
                        this.bell.message.display(Message.TYPES.MESSAGE, this.bell.text['message.action.subscribed'], Message.TIMEOUT)
                            .then(() => {
                            this.bell._ignoreSubscriptionState = false;
                            this.bell.launcher.inactivate();
                        });
                    });
                }
            }
            else if (this.bell.subscribed) {
                this.bell.launcher.activateIfInactive().then(() => {
                    this.bell.showDialogProcedure();
                });
            }
            else if (this.bell.blocked) {
                if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
                    // Show the HTTP popup so users can re-allow notifications
                    OneSignal.registerForPushNotifications();
                }
                else {
                    this.bell.launcher.activateIfInactive().then(() => {
                        this.bell.showDialogProcedure();
                    });
                }
            }
            return this.bell.message.hide();
        }
        pulse() {
            removeDomElement('.pulse-ring');
            addDomElement(this.element, 'beforeend', '<div class="pulse-ring"></div>');
            this.bell.setCustomColorsIfSpecified();
        }
    }

    class Dialog extends AnimatedElement {
        constructor(bell) {
            super('.onesignal-bell-launcher-dialog', 'onesignal-bell-launcher-dialog-opened', null, 'hidden', ['opacity', 'transform'], '.onesignal-bell-launcher-dialog-body');
            this.bell = bell;
            this.subscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #subscribe-button';
            this.unsubscribeButtonId = '#onesignal-bell-container .onesignal-bell-launcher #unsubscribe-button';
            this.notificationIcons = null;
        }
        getPlatformNotificationIcon() {
            if (this.notificationIcons) {
                if (isChromeLikeBrowser() || bowser.firefox || bowser.msedge) {
                    return this.notificationIcons.chrome || this.notificationIcons.safari;
                }
                else if (bowser.safari) {
                    return this.notificationIcons.safari || this.notificationIcons.chrome;
                }
            }
            else
                return null;
        }
        show() {
            return this.updateBellLauncherDialogBody()
                .then(() => super.show());
        }
        get subscribeButtonSelectorId() {
            return 'subscribe-button';
        }
        get unsubscribeButtonSelectorId() {
            return 'unsubscribe-button';
        }
        get subscribeButton() {
            return this.element.querySelector('#' + this.subscribeButtonSelectorId);
        }
        get unsubscribeButton() {
            return this.element.querySelector('#' + this.unsubscribeButtonSelectorId);
        }
        updateBellLauncherDialogBody() {
            return OneSignal.getSubscription().then((currentSetSubscription) => {
                clearDomElementChildren(document.querySelector(this.nestedContentSelector));
                let contents = 'Nothing to show.';
                var footer = '';
                if (this.bell.options.showCredit) {
                    footer = `<div class="divider"></div><div class="kickback">Powered by <a href="https://onesignal.com" class="kickback" target="_blank">OneSignal</a></div>`;
                }
                if (this.bell.state === Bell.STATES.SUBSCRIBED && currentSetSubscription === true ||
                    this.bell.state === Bell.STATES.UNSUBSCRIBED && currentSetSubscription === false) {
                    let notificationIconHtml = '';
                    let imageUrl = this.getPlatformNotificationIcon();
                    if (imageUrl) {
                        notificationIconHtml = `<div class="push-notification-icon"><img src="${imageUrl}"></div>`;
                    }
                    else {
                        notificationIconHtml = `<div class="push-notification-icon push-notification-icon-default"></div>`;
                    }
                    let buttonHtml = '';
                    if (this.bell.state !== Bell.STATES.SUBSCRIBED)
                        buttonHtml = `<button type="button" class="action" id="${this.subscribeButtonSelectorId}">${this.bell.text['dialog.main.button.subscribe']}</button>`;
                    else
                        buttonHtml = `<button type="button" class="action" id="${this.unsubscribeButtonSelectorId}">${this.bell.text['dialog.main.button.unsubscribe']}</button>`;
                    contents = `<h1>${this.bell.text['dialog.main.title']}</h1><div class="divider"></div><div class="push-notification">${notificationIconHtml}<div class="push-notification-text-container"><div class="push-notification-text push-notification-text-short"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div><div class="push-notification-text"></div><div class="push-notification-text push-notification-text-medium"></div></div></div><div class="action-container">${buttonHtml}</div>${footer}`;
                }
                else if (this.bell.state === Bell.STATES.BLOCKED) {
                    let imageUrl = null;
                    if (bowser.chrome) {
                        if (!bowser.mobile && !bowser.tablet) {
                            imageUrl = SdkEnvironment.getOneSignalApiUrl().origin + '/bell/chrome-unblock.jpg';
                        }
                    }
                    else if (bowser.firefox)
                        imageUrl = SdkEnvironment.getOneSignalApiUrl().origin + '/bell/firefox-unblock.jpg';
                    else if (bowser.safari)
                        imageUrl = SdkEnvironment.getOneSignalApiUrl().origin + '/bell/safari-unblock.jpg';
                    let instructionsHtml = '';
                    if (imageUrl) {
                        instructionsHtml = `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}"></a></div>`;
                    }
                    if ((bowser.mobile || bowser.tablet) && bowser.chrome) {
                        instructionsHtml = `<ol><li>Access <strong>Settings</strong> by tapping the three menu dots <strong>⋮</strong></li><li>Click <strong>Site settings</strong> under Advanced.</li><li>Click <strong>Notifications</strong>.</li><li>Find and click this entry for this website.</li><li>Click <strong>Notifications</strong> and set it to <strong>Allow</strong>.</li></ol>`;
                    }
                    contents = `<h1>${this.bell.text['dialog.blocked.title']}</h1><div class="divider"></div><div class="instructions"><p>${this.bell.text['dialog.blocked.message']}</p>${instructionsHtml}</div>${footer}`;
                }
                addDomElement(document.querySelector(this.nestedContentSelector), 'beforeend', contents);
                if (this.subscribeButton) {
                    this.subscribeButton.addEventListener('click', () => {
                        /*
                          The welcome notification should only be shown if the user is
                          subscribing for the first time and resubscribing via the notify
                          button.
              
                          If permission is already granted, __doNotShowWelcomeNotification is
                          set to true to prevent showing a notification, but we actually want
                          a notification shown in this resubscription case.
                         */
                        OneSignal.__doNotShowWelcomeNotification = false;
                        Event.trigger(Bell.EVENTS.SUBSCRIBE_CLICK);
                    });
                }
                if (this.unsubscribeButton) {
                    this.unsubscribeButton.addEventListener('click', () => Event.trigger(Bell.EVENTS.UNSUBSCRIBE_CLICK));
                }
                this.bell.setCustomColorsIfSpecified();
            });
        }
    }

    var PermissionPromptType;
    (function (PermissionPromptType) {
        /**
         * The "main" browser native permission request dialog when prompting for local or push notification permissions.
         */
        PermissionPromptType[PermissionPromptType["HttpsPermissionRequest"] = 'HTTPS permission request'] = "HttpsPermissionRequest";
        /**
         * The "popup" to subdomain.onesignal.com.
         */
        PermissionPromptType[PermissionPromptType["FullscreenHttpPermissionMessage"] = 'fullscreen HTTP permission message'] = "FullscreenHttpPermissionMessage";
        /**
         * The full-screen HTTPS modal with a dimmed backdrop.
         */
        PermissionPromptType[PermissionPromptType["FullscreenHttpsPermissionMessage"] = 'fullscreen HTTPS permission message'] = "FullscreenHttpsPermissionMessage";
        /**
         * The "sliding down" prompt.
         */
        PermissionPromptType[PermissionPromptType["SlidedownPermissionMessage"] = 'slidedown permission message'] = "SlidedownPermissionMessage";
        /**
         * The "notify button".
         */
        PermissionPromptType[PermissionPromptType["SubscriptionBell"] = 'subscription bell'] = "SubscriptionBell";
    })(PermissionPromptType || (PermissionPromptType = {}));

    var InvalidStateReason;
    (function (InvalidStateReason) {
        InvalidStateReason[InvalidStateReason["MissingAppId"] = 0] = "MissingAppId";
        InvalidStateReason[InvalidStateReason["RedundantPermissionMessage"] = 1] = "RedundantPermissionMessage";
        InvalidStateReason[InvalidStateReason["PushPermissionAlreadyGranted"] = 2] = "PushPermissionAlreadyGranted";
        InvalidStateReason[InvalidStateReason["UnsupportedEnvironment"] = 3] = "UnsupportedEnvironment";
        InvalidStateReason[InvalidStateReason["MissingDomElement"] = 4] = "MissingDomElement";
        InvalidStateReason[InvalidStateReason["ServiceWorkerNotActivated"] = 5] = "ServiceWorkerNotActivated";
        InvalidStateReason[InvalidStateReason["NoProxyFrame"] = 6] = "NoProxyFrame";
    })(InvalidStateReason || (InvalidStateReason = {}));
    class InvalidStateError extends OneSignalError {
        constructor(reason, extra) {
            switch (reason) {
                case InvalidStateReason.MissingAppId:
                    super(`Missing required app ID.`);
                    break;
                case InvalidStateReason.RedundantPermissionMessage:
                    let extraInfo = '';
                    if (extra.permissionPromptType)
                        extraInfo = `(${PermissionPromptType[extra.permissionPromptType]})`;
                    super(`Another permission message ${extraInfo} is being displayed.`);
                    break;
                case InvalidStateReason.PushPermissionAlreadyGranted:
                    super(`Push permission has already been granted.`);
                    break;
                case InvalidStateReason.UnsupportedEnvironment:
                    super(`The current environment does not support this operation.`);
                    break;
                case InvalidStateReason.ServiceWorkerNotActivated:
                    super(`The service worker must be activated first.`);
                    break;
                case InvalidStateReason.NoProxyFrame:
                    super(`No proxy frame.`);
                    break;
            }
            this.description = InvalidStateReason[reason];
            this.reason = reason;
        }
    }

    class Launcher extends ActiveAnimatedElement {
        constructor(bell) {
            super('.onesignal-bell-launcher', 'onesignal-bell-launcher-active', null, null, 'onesignal-bell-launcher-inactive', 'hidden', 'active');
            this.bell = bell;
            this.wasInactive = false;
        }
        async resize(size) {
            if (!this.element) {
                // Notify button doesn't exist
                throw new InvalidStateError(InvalidStateReason.MissingDomElement);
            }
            // If the size is the same, do nothing and resolve an empty promise
            if ((size === 'small' && hasCssClass(this.element, 'onesignal-bell-launcher-sm')) ||
                (size === 'medium' && hasCssClass(this.element, 'onesignal-bell-launcher-md')) ||
                (size === 'large' && hasCssClass(this.element, 'onesignal-bell-launcher-lg'))) {
                return Promise.resolve(this);
            }
            removeCssClass(this.element, 'onesignal-bell-launcher-sm');
            removeCssClass(this.element, 'onesignal-bell-launcher-md');
            removeCssClass(this.element, 'onesignal-bell-launcher-lg');
            if (size === 'small') {
                addCssClass(this.element, 'onesignal-bell-launcher-sm');
            }
            else if (size === 'medium') {
                addCssClass(this.element, 'onesignal-bell-launcher-md');
            }
            else if (size === 'large') {
                addCssClass(this.element, 'onesignal-bell-launcher-lg');
            }
            else {
                throw new Error('Invalid OneSignal bell size ' + size);
            }
            if (!this.shown) {
                return this;
            }
            else {
                return await new Promise((resolve) => {
                    // Once the launcher has finished shrinking down
                    if (this.targetTransitionEvents.length == 0) {
                        return resolve(this);
                    }
                    else {
                        var timerId = setTimeout(() => {
                            Log.debug(`Launcher did not completely resize (state: ${this.state}, activeState: ${this.activeState}).`);
                        }, this.transitionCheckTimeout);
                        once(this.element, 'transitionend', (event, destroyListenerFn) => {
                            if (event.target === this.element &&
                                contains(this.targetTransitionEvents, event.propertyName)) {
                                clearTimeout(timerId);
                                // Uninstall the event listener for transitionend
                                destroyListenerFn();
                                return resolve(this);
                            }
                        }, true);
                    }
                });
            }
        }
        activateIfInactive() {
            if (this.inactive) {
                this.wasInactive = true;
                return this.activate();
            }
            else
                return nothing();
        }
        inactivateIfWasInactive() {
            if (this.wasInactive) {
                this.wasInactive = false;
                return this.inactivate();
            }
            else
                return nothing();
        }
        clearIfWasInactive() {
            this.wasInactive = false;
        }
        inactivate() {
            return this.bell.message.hide()
                .then(() => {
                if (this.bell.badge.content.length > 0) {
                    return this.bell.badge.hide()
                        .then(() => Promise.all([super.inactivate(), this.resize('small')]))
                        .then(() => this.bell.badge.show());
                }
                else {
                    return Promise.all([super.inactivate(), this.resize('small')]);
                }
            });
        }
        activate() {
            if (this.bell.badge.content.length > 0) {
                return this.bell.badge.hide()
                    .then(() => Promise.all([super.activate(), this.resize(this.bell.options.size)]));
            }
            else {
                return Promise.all([super.activate(), this.resize(this.bell.options.size)]);
            }
        }
    }

    var logoSvg = `<svg class="onesignal-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7"><circle class="background" cx="49.9" cy="49.9" r="49.9"/><path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z"/><ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"/></svg>`;
    class Bell {
        static get EVENTS() {
            return {
                STATE_CHANGED: 'notifyButtonStateChange',
                LAUNCHER_CLICK: 'notifyButtonLauncherClick',
                BELL_CLICK: 'notifyButtonButtonClick',
                SUBSCRIBE_CLICK: 'notifyButtonSubscribeClick',
                UNSUBSCRIBE_CLICK: 'notifyButtonUnsubscribeClick',
                HOVERING: 'notifyButtonHovering',
                HOVERED: 'notifyButtonHover'
            };
        }
        static get STATES() {
            return {
                UNINITIALIZED: 'uninitialized',
                SUBSCRIBED: 'subscribed',
                UNSUBSCRIBED: 'unsubscribed',
                BLOCKED: 'blocked'
            };
        }
        static get TEXT_SUBS() {
            return {
                'prompt.native.grant': {
                    default: 'Allow',
                    chrome: 'Allow',
                    firefox: 'Always Receive Notifications',
                    safari: 'Allow'
                }
            };
        }
        constructor({ enable = false, size = 'medium', position = 'bottom-right', theme = 'default', showLauncherAfter = 10, showBadgeAfter = 300, text = {
            'tip.state.unsubscribed': 'Subscribe to notifications',
            'tip.state.subscribed': "You're subscribed to notifications",
            'tip.state.blocked': "You've blocked notifications",
            'message.prenotify': 'Click to subscribe to notifications',
            'message.action.subscribing': "Click <strong>{{prompt.native.grant}}</strong> to receive notifications",
            'message.action.subscribed': "Thanks for subscribing!",
            'message.action.resubscribed': "You're subscribed to notifications",
            'message.action.unsubscribed': "You won't receive notifications again",
            'dialog.main.title': 'Manage Site Notifications',
            'dialog.main.button.subscribe': 'SUBSCRIBE',
            'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            'dialog.blocked.title': 'Unblock Notifications',
            'dialog.blocked.message': "Follow these instructions to allow notifications:"
        }, prenotify = true, showCredit = true, colors = null, offset = null, launcher = null } = {}) {
            this.options = {
                enable: enable,
                size: size,
                position: position,
                theme: theme,
                showLauncherAfter: showLauncherAfter,
                showBadgeAfter: showBadgeAfter,
                text: text,
                prenotify: prenotify,
                showCredit: showCredit,
                colors: colors,
                offset: offset
            };
            if (!this.options.enable)
                return;
            if (!contains(['small', 'medium', 'large'], this.options.size))
                throw new Error(`Invalid size ${this.options.size} for notify button. Choose among 'small', 'medium', or 'large'.`);
            if (!contains(['bottom-left', 'bottom-right'], this.options.position))
                throw new Error(`Invalid position ${this.options.position} for notify button. Choose either 'bottom-left', or 'bottom-right'.`);
            if (!contains(['default', 'inverse'], this.options.theme))
                throw new Error(`Invalid theme ${this.options.theme} for notify button. Choose either 'default', or 'inverse'.`);
            if (this.options.showLauncherAfter < 0)
                throw new Error(`Invalid delay duration of ${this.options.showLauncherAfter} for showing the notify button. Choose a value above 0.`);
            if (this.options.showBadgeAfter < 0)
                throw new Error(`Invalid delay duration of ${this.options.showBadgeAfter} for showing the notify button's badge. Choose a value above 0.`);
            this.size = this.options.size;
            this.position = this.options.position;
            this.text = this.options.text;
            if (!this.text['tip.state.unsubscribed'])
                this.text['tip.state.unsubscribed'] = 'Subscribe to notifications';
            if (!this.text['tip.state.subscribed'])
                this.text['tip.state.subscribed'] = "You're subscribed to notifications";
            if (!this.text['tip.state.blocked'])
                this.text['tip.state.blocked'] = "You've blocked notifications";
            if (!this.text['message.prenotify'])
                this.text['message.prenotify'] = "Click to subscribe to notifications";
            if (!this.text['message.action.subscribed'])
                this.text['message.action.subscribed'] = "Thanks for subscribing!";
            if (!this.text['message.action.resubscribed'])
                this.text['message.action.resubscribed'] = "You're subscribed to notifications";
            if (!this.text['message.action.subscribing'])
                this.text['message.action.subscribing'] = "Click <strong>{{prompt.native.grant}}</strong> to receive notifications";
            if (!this.text['message.action.unsubscribed'])
                this.text['message.action.unsubscribed'] = "You won't receive notifications again";
            if (!this.text['dialog.main.title'])
                this.text['dialog.main.title'] = 'Manage Site Notifications';
            if (!this.text['dialog.main.button.subscribe'])
                this.text['dialog.main.button.subscribe'] = 'SUBSCRIBE';
            if (!this.text['dialog.main.button.unsubscribe'])
                this.text['dialog.main.button.unsubscribe'] = 'UNSUBSCRIBE';
            if (!this.text['dialog.blocked.title'])
                this.text['dialog.blocked.title'] = 'Unblock Notifications';
            if (!this.text['dialog.blocked.message'])
                this.text['dialog.blocked.message'] = 'Follow these instructions to allow notifications:';
            this._launcher = launcher;
            this.state = Bell.STATES.UNINITIALIZED;
            this._ignoreSubscriptionState = false;
            // Install event hooks
            OneSignal.on(Bell.EVENTS.SUBSCRIBE_CLICK, () => {
                this.dialog.subscribeButton.disabled = true;
                this._ignoreSubscriptionState = true;
                OneSignal.setSubscription(true)
                    .then(() => {
                    this.dialog.subscribeButton.disabled = false;
                    return this.dialog.hide();
                })
                    .then(() => {
                    return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.resubscribed'], Message.TIMEOUT);
                })
                    .then(() => {
                    this._ignoreSubscriptionState = false;
                    this.launcher.clearIfWasInactive();
                    return this.launcher.inactivate();
                })
                    .then(() => {
                    return this.updateState();
                });
            });
            OneSignal.on(Bell.EVENTS.UNSUBSCRIBE_CLICK, () => {
                this.dialog.unsubscribeButton.disabled = true;
                OneSignal.setSubscription(false)
                    .then(() => {
                    this.dialog.unsubscribeButton.disabled = false;
                    return this.dialog.hide();
                })
                    .then(() => {
                    this.launcher.clearIfWasInactive();
                    return this.launcher.activate();
                })
                    .then(() => {
                    return this.message.display(Message.TYPES.MESSAGE, this.text['message.action.unsubscribed'], Message.TIMEOUT);
                })
                    .then(() => {
                    return this.updateState();
                });
            });
            OneSignal.on(Bell.EVENTS.HOVERING, () => {
                this.hovering = true;
                this.launcher.activateIfInactive();
                // If there's already a message being force shown, do not override
                if (this.message.shown || this.dialog.shown) {
                    this.hovering = false;
                    return;
                }
                // If the message is a message and not a tip, don't show it (only show tips)
                // Messages will go away on their own
                if (this.message.contentType === Message.TYPES.MESSAGE) {
                    this.hovering = false;
                    return;
                }
                new Promise(resolve => {
                    // If a message is being shown
                    if (this.message.queued.length > 0) {
                        return this.message.dequeue().then((msg) => {
                            this.message.content = msg;
                            this.message.contentType = Message.TYPES.QUEUED;
                            resolve();
                        });
                    }
                    else {
                        this.message.content = decodeHtmlEntities(this.message.getTipForState());
                        this.message.contentType = Message.TYPES.TIP;
                        resolve();
                    }
                }).then(() => {
                    return this.message.show();
                })
                    .then(() => {
                    this.hovering = false;
                });
            });
            OneSignal.on(Bell.EVENTS.HOVERED, () => {
                // If a message is displayed (and not a tip), don't control it. Visitors have no control over messages
                if (this.message.contentType === Message.TYPES.MESSAGE) {
                    return;
                }
                if (!this.dialog.hidden) {
                    // If the dialog is being brought up when clicking button, don't shrink
                    return;
                }
                if (this.hovering) {
                    this.hovering = false;
                    // Hovering still being true here happens on mobile where the message could still be showing (i.e. animating) when a HOVERED event fires
                    // In other words, you tap on mobile, HOVERING fires, and then HOVERED fires immediately after because of the way mobile click events work
                    // Basically only happens if HOVERING and HOVERED fire within a few milliseconds of each other
                    this.message.waitUntilShown()
                        .then(() => delay(Message.TIMEOUT))
                        .then(() => this.message.hide())
                        .then(() => {
                        if (this.launcher.wasInactive && this.dialog.hidden) {
                            this.launcher.inactivate();
                            this.launcher.wasInactive = null;
                        }
                    });
                }
                if (this.message.shown) {
                    this.message.hide()
                        .then(() => {
                        if (this.launcher.wasInactive && this.dialog.hidden) {
                            this.launcher.inactivate();
                            this.launcher.wasInactive = null;
                        }
                    });
                }
            });
            OneSignal.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, async (isSubscribed) => {
                if (isSubscribed == true) {
                    if (this.badge.shown && this.options.prenotify) {
                        this.badge.hide();
                    }
                    if (this.dialog.notificationIcons === null) {
                        const icons = await MainHelper.getNotificationIcons();
                        this.dialog.notificationIcons = icons;
                    }
                }
                OneSignal.getNotificationPermission(permission => {
                    this.setState((isSubscribed ?
                        Bell.STATES.SUBSCRIBED :
                        ((permission === 'denied') ? Bell.STATES.BLOCKED : Bell.STATES.UNSUBSCRIBED)), this._ignoreSubscriptionState);
                });
            });
            OneSignal.on(Bell.EVENTS.STATE_CHANGED, (state) => {
                if (!this.launcher.element) {
                    // Notify button doesn't exist
                    return;
                }
                if (state.to === Bell.STATES.SUBSCRIBED) {
                    this.launcher.inactivate();
                }
                else if (state.to === Bell.STATES.UNSUBSCRIBED ||
                    Bell.STATES.BLOCKED) {
                    this.launcher.activate();
                }
            });
            OneSignal.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, () => {
                this.updateState();
            });
            this.updateState();
        }
        showDialogProcedure() {
            if (!this.dialog.shown) {
                this.dialog.show()
                    .then(() => {
                    once(document, 'click', (e, destroyEventListener) => {
                        let wasDialogClicked = this.dialog.element.contains(e.target);
                        if (wasDialogClicked) {
                        }
                        else {
                            destroyEventListener();
                            if (this.dialog.shown) {
                                this.dialog.hide()
                                    .then(() => {
                                    this.launcher.inactivateIfWasInactive();
                                });
                            }
                        }
                    }, true);
                });
            }
        }
        async create() {
            if (!this.options.enable)
                return;
            const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
            if (sdkStylesLoadResult !== 0 /* Loaded */) {
                Log.debug('Not showing notify button because styles failed to load.');
                return;
            }
            // Remove any existing bell
            if (this.container) {
                removeDomElement('#onesignal-bell-container');
            }
            // Insert the bell container
            addDomElement('body', 'beforeend', '<div id="onesignal-bell-container" class="onesignal-bell-container onesignal-reset"></div>');
            // Insert the bell launcher
            addDomElement(this.container, 'beforeend', '<div id="onesignal-bell-launcher" class="onesignal-bell-launcher"></div>');
            // Insert the bell launcher button
            addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-button"></div>');
            // Insert the bell launcher badge
            addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-badge"></div>');
            // Insert the bell launcher message
            addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-message"></div>');
            addDomElement(this.message.selector, 'beforeend', '<div class="onesignal-bell-launcher-message-body"></div>');
            // Insert the bell launcher dialog
            addDomElement(this.launcher.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog"></div>');
            addDomElement(this.dialog.selector, 'beforeend', '<div class="onesignal-bell-launcher-dialog-body"></div>');
            // Install events
            // Add visual elements
            addDomElement(this.button.selector, 'beforeEnd', logoSvg);
            const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
            const notOptedOut = await OneSignal.getSubscription();
            const doNotPrompt = await MainHelper.wasHttpsNativePromptDismissed();
            // Resize to small instead of specified size if enabled, otherwise there's a jerking motion where the bell, at a different size than small, jerks sideways to go from large -> small or medium -> small
            let resizeTo = (isPushEnabled ? 'small' : this.options.size);
            // Add default classes
            await this.launcher.resize(resizeTo);
            if (this.options.position === 'bottom-left') {
                addCssClass(this.container, 'onesignal-bell-container-bottom-left');
                addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-left');
            }
            else if (this.options.position === 'bottom-right') {
                addCssClass(this.container, 'onesignal-bell-container-bottom-right');
                addCssClass(this.launcher.selector, 'onesignal-bell-launcher-bottom-right');
            }
            else {
                throw new Error('Invalid OneSignal notify button position ' + this.options.position);
            }
            if (this.options.theme === 'default') {
                addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-default');
            }
            else if (this.options.theme === 'inverse') {
                addCssClass(this.launcher.selector, 'onesignal-bell-launcher-theme-inverse');
            }
            else {
                throw new Error('Invalid OneSignal notify button theme ' + this.options.theme);
            }
            this.applyOffsetIfSpecified();
            this.setCustomColorsIfSpecified();
            this.patchSafariSvgFilterBug();
            Log.info('Showing the notify button.');
            await (isPushEnabled ? this.launcher.inactivate() : nothing())
                .then(() => OneSignal.getSubscription())
                .then(isNotOptedOut => {
                if ((isPushEnabled || !isNotOptedOut) && this.dialog.notificationIcons === null) {
                    return MainHelper.getNotificationIcons().then((icons) => {
                        this.dialog.notificationIcons = icons;
                    });
                }
                else
                    return nothing();
            })
                .then(() => delay(this.options.showLauncherAfter))
                .then(() => {
                if (SubscriptionHelper.isUsingSubscriptionWorkaround() &&
                    notOptedOut &&
                    doNotPrompt !== true && !isPushEnabled &&
                    (OneSignal.config.userConfig.autoRegister === true) && !MainHelper.isHttpPromptAlreadyShown()) {
                    Log.debug('Not showing notify button because popover will be shown.');
                    return nothing();
                }
                else {
                    return this.launcher.show();
                }
            })
                .then(() => {
                return delay(this.options.showBadgeAfter);
            })
                .then(() => {
                if (this.options.prenotify && !isPushEnabled && OneSignal._isNewVisitor) {
                    return this.message.enqueue(this.text['message.prenotify'])
                        .then(() => this.badge.show());
                }
                else
                    return nothing();
            })
                .then(() => this.initialized = true);
        }
        patchSafariSvgFilterBug() {
            if (!(bowser.safari && Number(bowser.version) >= 9.1)) {
                let bellShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0.35));`;
                let badgeShadow = `drop-shadow(0 2px 4px rgba(34,36,38,0));`;
                let dialogShadow = `drop-shadow(0px 2px 2px rgba(34,36,38,.15));`;
                this.graphic.setAttribute('style', `filter: ${bellShadow}; -webkit-filter: ${bellShadow};`);
                this.badge.element.setAttribute('style', `filter: ${badgeShadow}; -webkit-filter: ${badgeShadow};`);
                this.dialog.element.setAttribute('style', `filter: ${dialogShadow}; -webkit-filter: ${dialogShadow};`);
            }
            if (bowser.safari) {
                this.badge.element.setAttribute('style', `display: none;`);
            }
        }
        applyOffsetIfSpecified() {
            let offset = this.options.offset;
            if (offset) {
                // Reset styles first
                this.launcher.element.style.cssText = '';
                if (offset.bottom) {
                    this.launcher.element.style.cssText += `bottom: ${offset.bottom};`;
                }
                if (this.options.position === 'bottom-right') {
                    if (offset.right) {
                        this.launcher.element.style.cssText += `right: ${offset.right};`;
                    }
                }
                else if (this.options.position === 'bottom-left') {
                    if (offset.left) {
                        this.launcher.element.style.cssText += `left: ${offset.left};`;
                    }
                }
            }
        }
        setCustomColorsIfSpecified() {
            // Some common vars first
            let dialogButton = this.dialog.element.querySelector('button.action');
            let pulseRing = this.button.element.querySelector('.pulse-ring');
            // Reset added styles first
            this.graphic.querySelector('.background').style.cssText = '';
            let foregroundElements = this.graphic.querySelectorAll('.foreground');
            for (let i = 0; i < foregroundElements.length; i++) {
                let element = foregroundElements[i];
                element.style.cssText = '';
            }
            this.graphic.querySelector('.stroke').style.cssText = '';
            this.badge.element.style.cssText = '';
            if (dialogButton) {
                dialogButton.style.cssText = '';
                dialogButton.style.cssText = '';
            }
            if (pulseRing) {
                pulseRing.style.cssText = '';
            }
            // Set new styles
            if (this.options.colors) {
                let colors = this.options.colors;
                if (colors['circle.background']) {
                    this.graphic.querySelector('.background').style.cssText += `fill: ${colors['circle.background']}`;
                }
                if (colors['circle.foreground']) {
                    let foregroundElements = this.graphic.querySelectorAll('.foreground');
                    for (let i = 0; i < foregroundElements.length; i++) {
                        let element = foregroundElements[i];
                        element.style.cssText += `fill: ${colors['circle.foreground']}`;
                    }
                    this.graphic.querySelector('.stroke').style.cssText += `stroke: ${colors['circle.foreground']}`;
                }
                if (colors['badge.background']) {
                    this.badge.element.style.cssText += `background: ${colors['badge.background']}`;
                }
                if (colors['badge.bordercolor']) {
                    this.badge.element.style.cssText += `border-color: ${colors['badge.bordercolor']}`;
                }
                if (colors['badge.foreground']) {
                    this.badge.element.style.cssText += `color: ${colors['badge.foreground']}`;
                }
                if (dialogButton) {
                    if (colors['dialog.button.background']) {
                        this.dialog.element.querySelector('button.action').style.cssText += `background: ${colors['dialog.button.background']}`;
                    }
                    if (colors['dialog.button.foreground']) {
                        this.dialog.element.querySelector('button.action').style.cssText += `color: ${colors['dialog.button.foreground']}`;
                    }
                    if (colors['dialog.button.background.hovering']) {
                        this.addCssToHead('onesignal-background-hover-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:hover { background: ${colors['dialog.button.background.hovering']} !important; }`);
                    }
                    if (colors['dialog.button.background.active']) {
                        this.addCssToHead('onesignal-background-active-style', `#onesignal-bell-container.onesignal-reset .onesignal-bell-launcher .onesignal-bell-launcher-dialog button.action:active { background: ${colors['dialog.button.background.active']} !important; }`);
                    }
                }
                if (pulseRing) {
                    if (colors['pulse.color']) {
                        this.button.element.querySelector('.pulse-ring').style.cssText = `border-color: ${colors['pulse.color']}`;
                    }
                }
            }
        }
        addCssToHead(id, css) {
            let existingStyleDom = document.getElementById(id);
            if (existingStyleDom)
                return;
            let styleDom = document.createElement('style');
            styleDom.id = id;
            styleDom.type = 'text/css';
            styleDom.appendChild(document.createTextNode(css));
            document.head.appendChild(styleDom);
        }
        /**
         * Updates the current state to the correct new current state. Returns a promise.
         */
        updateState() {
            Promise.all([
                OneSignal.isPushNotificationsEnabled(),
                OneSignal.getNotificationPermission()
            ])
                .then(([isEnabled, permission]) => {
                this.setState(isEnabled ? Bell.STATES.SUBSCRIBED : Bell.STATES.UNSUBSCRIBED);
                if (permission === 'denied') {
                    this.setState(Bell.STATES.BLOCKED);
                }
            });
        }
        /**
         * Updates the current state to the specified new state.
         * @param newState One of ['subscribed', 'unsubscribed'].
         */
        setState(newState, silent = false) {
            let lastState = this.state;
            this.state = newState;
            if (lastState !== newState && !silent) {
                Event.trigger(Bell.EVENTS.STATE_CHANGED, { from: lastState, to: newState });
                // Update anything that should be changed here in the new state
            }
            // Update anything that should be reset to the same state
        }
        get container() {
            return document.querySelector('#onesignal-bell-container');
        }
        get graphic() {
            return this.button.element.querySelector('svg');
        }
        get launcher() {
            if (!this._launcher)
                this._launcher = new Launcher(this);
            return this._launcher;
        }
        get button() {
            if (!this._button)
                this._button = new Button(this);
            return this._button;
        }
        get badge() {
            if (!this._badge)
                this._badge = new Badge();
            return this._badge;
        }
        get message() {
            if (!this._message)
                this._message = new Message(this);
            return this._message;
        }
        get dialog() {
            if (!this._dialog)
                this._dialog = new Dialog(this);
            return this._dialog;
        }
        get subscribed() {
            return this.state === Bell.STATES.SUBSCRIBED;
        }
        get unsubscribed() {
            return this.state === Bell.STATES.UNSUBSCRIBED;
        }
        get blocked() {
            return this.state === Bell.STATES.BLOCKED;
        }
    }

    /**
     * Represents a normalized path.
     *
     * Paths spaces are trimmed.
     * Paths without file names will never contain trailing slashes, except for empty paths.
     */
    class Path {
        constructor(path) {
            if (!path) {
                throw new InvalidArgumentError('path', InvalidArgumentReason.Empty);
            }
            this.path = path.trim();
        }
        getQueryString() {
            // If there are no ? characters, return null
            // If there are multiple ?, return the substring starting after the first ? all the way to the end
            const indexOfDelimiter = this.path.indexOf('?');
            if (indexOfDelimiter === -1) {
                return null;
            }
            if (this.path.length > indexOfDelimiter) {
                // Return the substring *after the first ? to the end
                return this.path.substring(indexOfDelimiter + 1);
            }
            else {
                // The last character is ?
                return null;
            }
        }
        getWithoutQueryString() {
            return this.path.split(Path.QUERY_STRING)[0];
        }
        getFileName() {
            return this.getWithoutQueryString().split('\\').pop().split('/').pop();
        }
        getFileNameWithQuery() {
            return this.path.split('\\').pop().split('/').pop();
        }
        getFullPath() {
            return this.path;
        }
        getPathWithoutFileName() {
            const newPath = this.getWithoutQueryString();
            const fileNameIndex = newPath.lastIndexOf(this.getFileName());
            let pathWithoutFileName = newPath.substring(0, fileNameIndex);
            pathWithoutFileName = pathWithoutFileName.replace(/[\\\/]$/, '');
            return pathWithoutFileName;
        }
    }
    Path.QUERY_STRING = '?';

    var IntegrationKind;
    (function (IntegrationKind) {
        /**
         * An secure HTTPS site using its own origin for subscribing.
         */
        IntegrationKind["Secure"] = "Secure";
        /**
         * A secure HTTPS site using a proxy subscription origin (e.g. subdomain.os.tc or
         * subdomain.onesignal.com).
         */
        IntegrationKind["SecureProxy"] = "Secure Proxy";
        /**
         * An insecure HTTP site using a proxy subscription origin (e.g. subdomain.os.tc or
         * subdomain.onesignal.com).
         */
        IntegrationKind["InsecureProxy"] = "Insecure Proxy";
    })(IntegrationKind || (IntegrationKind = {}));

    class NotImplementedError extends OneSignalError {
        constructor() {
            super('This code is not implemented yet.');
        }
    }

    var ServiceWorkerActiveState;
    (function (ServiceWorkerActiveState) {
        /**
         * OneSignalSDKWorker.js, or the equivalent custom file name, is active.
         */
        ServiceWorkerActiveState["WorkerA"] = "Worker A (Main)";
        /**
         * OneSignalSDKUpdaterWorker.js, or the equivalent custom file name, is
         * active.
         *
         * We no longer need to use this filename. We can update Worker A by appending
         * a random query parameter to A.
         */
        ServiceWorkerActiveState["WorkerB"] = "Worker B (Updater)";
        /**
         * A service worker is active, but it is neither OneSignalSDKWorker.js nor
         * OneSignalSDKUpdaterWorker.js (or the equivalent custom file names as
         * provided by user config).
         */
        ServiceWorkerActiveState["ThirdParty"] = "3rd Party";
        /**
         * A service worker is currently installing and we can't determine its final state yet. Wait until
         * the service worker is finished installing by checking for a controllerchange property..
         */
        ServiceWorkerActiveState["Installing"] = "Installing";
        /**
         * No service worker is installed.
         */
        ServiceWorkerActiveState["None"] = "None";
        /**
         * A service worker is active but not controlling the page. This can occur if
         * the page is hard-refreshed bypassing the cache, which also bypasses service
         * workers.
         */
        ServiceWorkerActiveState["Bypassed"] = "Bypassed";
        /**
         * Service workers are not supported in this environment. This status is used
         * on HTTP pages where it isn't possible to know whether a service worker is
         * installed or not or in any of the other states.
         */
        ServiceWorkerActiveState["Indeterminate"] = "Indeterminate";
    })(ServiceWorkerActiveState || (ServiceWorkerActiveState = {}));
    class ServiceWorkerManager {
        constructor(context, config) {
            this.context = context;
            this.config = config;
        }
        async getActiveState() {
            /*
              Note: This method can only be called on a secure origin. On an insecure
              origin, it'll throw on getRegistration().
            */
            /*
              We want to find out if the *current* page is currently controlled by an
              active service worker.
        
              There are three ways (sort of) to do this:
                - getRegistration()
                - getRegistrations()
                - navigator.serviceWorker.ready
        
              We want to use getRegistration(), since it will not return a value if the
              page is not currently controlled by an active service worker.
        
              getRegistrations() returns all service worker registrations under the
              origin (i.e. registrations in nested folders).
        
              navigator.serviceWorker.ready will hang indefinitely and never resolve if
              no registration is active.
            */
            const integration = await SdkEnvironment.getIntegration();
            if (integration === IntegrationKind.InsecureProxy) {
                /* Service workers are not accessible on insecure origins */
                return ServiceWorkerActiveState.Indeterminate;
            }
            else if (integration === IntegrationKind.SecureProxy) {
                /* If the site setup is secure proxy, we're either on the top frame without access to the
                registration, or the child proxy frame that does have access to the registration. */
                const env = SdkEnvironment.getWindowEnv();
                switch (env) {
                    case WindowEnvironmentKind.Host:
                    case WindowEnvironmentKind.CustomIframe:
                        /* Both these top-ish frames will need to ask the proxy frame to access the service worker
                        registration */
                        const proxyFrameHost = OneSignal.proxyFrameHost;
                        if (!proxyFrameHost) {
                            /* On init, this function may be called. Return a null state for now */
                            return ServiceWorkerActiveState.Indeterminate;
                        }
                        else {
                            return await proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SERVICE_WORKER_STATE);
                        }
                    case WindowEnvironmentKind.OneSignalSubscriptionPopup:
                        /* This is a top-level frame, so it can access the service worker registration */
                        break;
                    case WindowEnvironmentKind.OneSignalSubscriptionModal:
                        throw new NotImplementedError();
                }
            }
            let workerRegistration = null;
            try {
                workerRegistration = await navigator.serviceWorker.getRegistration();
            }
            catch (e) {
                /* This could be null in an HTTP context or error if the user doesn't accept cookies */
            }
            if (!workerRegistration) {
                /*
                  A site may have a service worker nested at /folder1/folder2/folder3, while the user is
                  currently on /folder1. The nested service worker does not control /folder1 though. Although
                  the nested service worker can receive push notifications without issue, it cannot perform
                  other SDK operations like checking whether existing tabs are optn eo the site on /folder1
                  (used to prevent opening unnecessary new tabs on notification click.)
          
                  Because we rely on being able to communicate with the service worker for SDK operations, we
                  only say we're active if the service worker directly controls this page.
                 */
                return ServiceWorkerActiveState.None;
            }
            else if (workerRegistration.installing) {
                /*
                  Workers that are installing block for a while, since we can't use them until they're done
                  installing.
                 */
                return ServiceWorkerActiveState.Installing;
            }
            else if (!workerRegistration.active) {
                /*
                  Workers that are waiting won't be our service workers, since we use clients.claim() and
                  skipWaiting() to bypass the install and waiting stages.
                 */
                return ServiceWorkerActiveState.ThirdParty;
            }
            const workerScriptPath = new URL(workerRegistration.active.scriptURL).pathname;
            let workerState;
            /*
              At this point, there is an active service worker registration controlling this page.
        
              Check the filename to see if it belongs to our A / B worker.
            */
            if (new Path(workerScriptPath).getFileName() == this.config.workerAPath.getFileName()) {
                workerState = ServiceWorkerActiveState.WorkerA;
            }
            else if (new Path(workerScriptPath).getFileName() == this.config.workerBPath.getFileName()) {
                workerState = ServiceWorkerActiveState.WorkerB;
            }
            else {
                workerState = ServiceWorkerActiveState.ThirdParty;
            }
            /*
              Our service worker registration can be both active and in the controlling scope of the current
              page, but if the page was hard refreshed to bypass the cache (e.g. Ctrl + Shift + R), a
              service worker will not control the page.
        
              For a third-party service worker, if it does not call clients.claim(), even if its
              registration is both active and in the controlling scope of the current page,
              navigator.serviceWorker.controller will still be null on the first page visit. So we only
              check if the controller is null for our worker, which we know uses clients.claim().
             */
            if (!navigator.serviceWorker.controller && (workerState === ServiceWorkerActiveState.WorkerA ||
                workerState === ServiceWorkerActiveState.WorkerB)) {
                return ServiceWorkerActiveState.Bypassed;
            }
            else {
                return workerState;
            }
        }
        async getWorkerVersion() {
            return new Promise(async (resolve) => {
                if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
                    const proxyFrameHost = OneSignal.proxyFrameHost;
                    if (!proxyFrameHost) {
                        /* On init, this function may be called. Return a null state for now */
                        resolve(NaN);
                    }
                    else {
                        const proxyWorkerVersion = await proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.GET_WORKER_VERSION);
                        resolve(proxyWorkerVersion);
                    }
                }
                else {
                    this.context.workerMessenger.once(WorkerMessengerCommand.WorkerVersion, workerVersion => {
                        resolve(workerVersion);
                    });
                    this.context.workerMessenger.unicast(WorkerMessengerCommand.WorkerVersion);
                }
            });
        }
        async shouldInstallWorker() {
            const workerState = await this.getActiveState();
            if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
                return true;
            }
            return false;
        }
        async subscribeForPushNotifications() {
            const workerState = await this.getActiveState();
            if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
                throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
            }
            return new Promise(resolve => {
                this.context.workerMessenger.once(WorkerMessengerCommand.Subscribe, subscription => {
                    resolve(Subscription.deserialize(subscription));
                });
                this.context.workerMessenger.unicast(WorkerMessengerCommand.Subscribe, this.context.appConfig);
            });
        }
        /**
         * Performs a service worker update by swapping out the current service worker
         * with a content-identical but differently named alternate service worker
         * file.
         */
        async updateWorker() {
            if (!Environment.supportsServiceWorkers()) {
                return;
            }
            const workerState = await this.getActiveState();
            Log.info(`[Service Worker Update] Checking service worker version...`);
            let workerVersion;
            try {
                workerVersion = await timeoutPromise(this.getWorkerVersion(), 2000);
            }
            catch (e) {
                Log.info(`[Service Worker Update] Worker did not reply to version query; assuming older version.`);
                workerVersion = 1;
            }
            if (workerState !== ServiceWorkerActiveState.WorkerA && workerState !== ServiceWorkerActiveState.WorkerB) {
                // Do not update 3rd party workers
                Log.debug(`[Service Worker Update] Not updating service worker, current active worker state is ${workerState}.`);
                return;
            }
            if (workerVersion !== Environment.version()) {
                Log.info(`[Service Worker Update] Updating service worker from v${workerVersion} --> v${Environment.version()}.`);
                this.installWorker();
            }
            else {
                Log.info(`[Service Worker Update] Service worker version is current at v${workerVersion} (no update required).`);
            }
        }
        /**
         * Installs a newer version of the OneSignal service worker.
         *
         * We have a couple different models of installing service workers:
         *
         * a) Originally, we provided users with two worker files:
         * OneSignalSDKWorker.js and OneSignalSDKUpdaterWorker.js. Two workers were
         * provided so each could be swapped with the other when the worker needed to
         * update. The contents of both workers were identical; only the filenames
         * were different, which is enough to update the worker.
         *
         * b) With AMP web push, users are to specify only the first worker file
         * OneSignalSDKWorker.js, with an app ID parameter ?appId=12345. AMP web push
         * is vendor agnostic and doesn't know about OneSignal, so all relevant
         * information has to be passed to the service worker, which is the only
         * vendor-specific file. So the service worker being installed is always
         * OneSignalSDKWorker.js?appId=12345 and never OneSignalSDKUpdaterWorker.js.
         * If AMP web push sees another worker like OneSignalSDKUpdaterWorker.js, or
         * even the same OneSignalSDKWorker.js without the app ID query parameter, the
         * user is considered unsubscribed.
         *
         * c) Due to b's restriction, we must always install
         * OneSignalSDKWorker.js?appId=xxx. We also have to appropriately handle
         * legacy cases:
         *
         *    c-1) Where developers have OneSignalSDKWorker.js or
         *    OneSignalSDKUpdaterWorker.js alternatingly installed
         *
         *    c-2) Where developers running progressive web apps force-register
         *    OneSignalSDKWorker.js
         *
         * Actually, users can customize the file names of Worker A / Worker B, but
         * it's up to them to be consistent with their naming. For AMP web push, users
         * can specify the full string to expect for the service worker. They can add
         * additional query parameters, but this must then stay consistent.
         *
         * Installation Procedure
         * ----------------------
         *
         * Worker A is always installed. If Worker A is already installed, Worker B is
         * installed first, and then Worker A is installed again. This is necessary
         * because AMP web push requires Worker A to be installed for the user to be
         * considered subscribed.
         */
        async installWorker() {
            if (!Environment.supportsServiceWorkers()) {
                return;
            }
            const preInstallWorkerState = await this.getActiveState();
            await this.installAlternatingWorker();
            await new Promise(async (resolve) => {
                const postInstallWorkerState = await this.getActiveState();
                if (preInstallWorkerState !== postInstallWorkerState &&
                    postInstallWorkerState !== ServiceWorkerActiveState.Installing) {
                    resolve();
                }
                else {
                    navigator.serviceWorker.addEventListener('controllerchange', async (e) => {
                        const postInstallWorkerState = await this.getActiveState();
                        if (postInstallWorkerState !== preInstallWorkerState &&
                            postInstallWorkerState !== ServiceWorkerActiveState.Installing) {
                            resolve();
                        }
                    });
                }
            });
            if ((await this.getActiveState()) === ServiceWorkerActiveState.WorkerB) {
                // If the worker is Worker B, reinstall Worker A
                await this.installAlternatingWorker();
            }
            MainHelper.establishServiceWorkerChannel();
        }
        /**
         * Installs the OneSignal service worker.
         *
         * Depending on the existing worker, the alternate swap worker may be
         * installed or, for 3rd party workers, the existing worker may be uninstalled
         * before installing ours.
         */
        async installAlternatingWorker() {
            const workerState = await this.getActiveState();
            if (workerState === ServiceWorkerActiveState.ThirdParty) {
                /*
                   Always unregister 3rd party service workers.
          
                   Unregistering unsubscribes the existing push subscription and allows us
                   to register a new push subscription. This takes care of possible previous mismatched sender IDs
                 */
                const workerRegistration = await navigator.serviceWorker.getRegistration();
                await workerRegistration.unregister();
            }
            let workerDirectory, workerFileName, fullWorkerPath;
            // Determine which worker to install
            if (workerState === ServiceWorkerActiveState.WorkerA) {
                workerDirectory = this.config.workerBPath.getPathWithoutFileName();
                workerFileName = this.config.workerBPath.getFileName();
            }
            else if (workerState === ServiceWorkerActiveState.WorkerB ||
                workerState === ServiceWorkerActiveState.ThirdParty ||
                workerState === ServiceWorkerActiveState.None) {
                workerDirectory = this.config.workerAPath.getPathWithoutFileName();
                workerFileName = this.config.workerAPath.getFileName();
            }
            else if (workerState === ServiceWorkerActiveState.Bypassed) {
                /*
                  If the page is hard refreshed bypassing the cache, no service worker
                  will control the page.
          
                  It doesn't matter if we try to reinstall an existing worker; still no
                  service worker will control the page after installation.
                 */
                throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
            }
            const installUrlQueryParams = {
                appId: this.context.appConfig.appId
            };
            fullWorkerPath = `${workerDirectory}/${workerFileName}?${encodeHashAsUriComponent(installUrlQueryParams)}`;
            Log.info(`[Service Worker Installation] Installing service worker ${fullWorkerPath}.`);
            await navigator.serviceWorker.register(fullWorkerPath, this.config.registrationOptions);
            Log.debug(`[Service Worker Installation] Service worker installed.`);
        }
    }

    var WorkerMessengerCommand;
    (function (WorkerMessengerCommand) {
        WorkerMessengerCommand["WorkerVersion"] = "GetWorkerVersion";
        WorkerMessengerCommand["Subscribe"] = "Subscribe";
        WorkerMessengerCommand["SubscribeNew"] = "SubscribeNew";
        WorkerMessengerCommand["AmpSubscriptionState"] = "amp-web-push-subscription-state";
        WorkerMessengerCommand["AmpSubscribe"] = "amp-web-push-subscribe";
        WorkerMessengerCommand["AmpUnsubscribe"] = "amp-web-push-unsubscribe";
        WorkerMessengerCommand["NotificationDisplayed"] = "notification.displayed";
        WorkerMessengerCommand["NotificationClicked"] = "notification.clicked";
        WorkerMessengerCommand["NotificationDismissed"] = "notification.dismissed";
        WorkerMessengerCommand["RedirectPage"] = "command.redirect";
    })(WorkerMessengerCommand || (WorkerMessengerCommand = {}));
    class WorkerMessengerReplyBuffer {
        constructor() {
            this.replies = {};
        }
        addListener(command, callback, onceListenerOnly) {
            const record = {
                callback: callback,
                onceListenerOnly: onceListenerOnly
            };
            if (this.findListenersForMessage(command).length > 0) {
                this.replies[command.toString()].push(record);
            }
            else {
                this.replies[command.toString()] = [record];
            }
        }
        findListenersForMessage(command) {
            return this.replies[command.toString()] || [];
        }
        deleteListenerRecords(command) {
            this.replies[command.toString()] = null;
        }
        deleteAllListenerRecords() {
            this.replies = {};
        }
        deleteListenerRecord(command, targetRecord) {
            const listenersForCommand = this.replies[command.toString()];
            for (let listenerRecordIndex = listenersForCommand.length - 1; listenerRecordIndex >= 0; listenerRecordIndex--) {
                const listenerRecord = listenersForCommand[listenerRecordIndex];
                if (listenerRecord === targetRecord) {
                    listenersForCommand.splice(listenerRecordIndex, 1);
                }
            }
        }
    }
    /**
    * A Promise-based PostMessage helper to ease back-and-forth replies between
    * service workers and window frames.
    */
    class WorkerMessenger {
        constructor(context) {
            this.context = context;
            this.replies = new WorkerMessengerReplyBuffer();
            this.debug = true;
        }
        /**
         * Broadcasts a message from a service worker to all clients, including uncontrolled clients.
         */
        async broadcast(command, payload) {
            const env = SdkEnvironment.getWindowEnv();
            if (env !== WindowEnvironmentKind.ServiceWorker) {
                return;
            }
            else {
                const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                for (let client of clients) {
                    Log.debug(`[Worker Messenger] [SW -> Page] Broadcasting '${command.toString()}' to window client ${client.url}.`);
                    client.postMessage({
                        command: command,
                        payload: payload
                    });
                }
            }
        }
        /*
          For pages:
      
            Sends a postMessage() to the service worker controlling the page.
      
            Waits until the service worker is controlling the page before sending the
            message.
         */
        async unicast(command, payload, windowClient) {
            const env = SdkEnvironment.getWindowEnv();
            if (env === WindowEnvironmentKind.ServiceWorker) {
                if (!windowClient) {
                    throw new InvalidArgumentError('windowClient', InvalidArgumentReason.Empty);
                }
                else {
                    Log.debug(`[Worker Messenger] [SW -> Page] Unicasting '${command.toString()}' to window client ${windowClient.url}.`);
                    windowClient.postMessage({
                        command: command,
                        payload: payload
                    });
                }
            }
            else {
                if (!(await this.isWorkerControllingPage())) {
                    Log.debug("[Worker Messenger] The page is not controlled by the service worker yet. Waiting...", self.registration);
                }
                await this.waitUntilWorkerControlsPage();
                Log.debug(`[Worker Messenger] [Page -> SW] Unicasting '${command.toString()}' to service worker.`);
                navigator.serviceWorker.controller.postMessage({
                    command: command,
                    payload: payload
                });
            }
        }
        /**
         * Due to https://github.com/w3c/ServiceWorker/issues/1156, listen() must
         * synchronously add self.addEventListener('message') if we are running in the
         * service worker.
         *
         * @param listenIfPageUncontrolled If true, begins listening for service
         * worker messages even if the service worker does not control this page. This
         * parameter is set to true on HTTPS iframes expecting service worker messages
         * that live under an HTTP page.
         */
        listen(listenIfPageUncontrolled) {
            if (!Environment.supportsServiceWorkers()) {
                return;
            }
            const env = SdkEnvironment.getWindowEnv();
            if (env === WindowEnvironmentKind.ServiceWorker) {
                self.addEventListener('message', this.onWorkerMessageReceivedFromPage.bind(this));
                Log.debug('[Worker Messenger] Service worker is now listening for messages.');
            }
            else {
                this.listenForPage(listenIfPageUncontrolled);
            }
        }
        /**
         * Listens for messages for the service worker.
         *
         * Waits until the service worker is controlling the page before listening for
         * messages.
         */
        async listenForPage(listenIfPageUncontrolled) {
            if (!listenIfPageUncontrolled) {
                if (!(await this.isWorkerControllingPage())) {
                    Log.debug(`(${location.origin}) [Worker Messenger] The page is not controlled by the service worker yet. Waiting...`, self.registration);
                }
                await this.waitUntilWorkerControlsPage();
                Log.debug(`(${location.origin}) [Worker Messenger] The page is now controlled by the service worker.`);
            }
            navigator.serviceWorker.addEventListener('message', this.onPageMessageReceivedFromServiceWorker.bind(this));
            Log.debug(`(${location.origin}) [Worker Messenger] Page is now listening for messages.`);
        }
        onWorkerMessageReceivedFromPage(event) {
            const data = event.data;
            /* If this message doesn't contain our expected fields, discard the message */
            /* The payload may be null. AMP web push sends commands to our service worker in the format:
        
               { command: "amp-web-push-subscription-state", payload: null }
               { command: "amp-web-push-unsubscribe", payload: null }
               { command: "amp-web-push-subscribe", payload: null }
        
            */
            if (!data || !data.command) {
                return;
            }
            const listenerRecords = this.replies.findListenersForMessage(data.command);
            const listenersToRemove = [];
            const listenersToCall = [];
            Log.debug(`[Worker Messenger] Service worker received message:`, event.data);
            for (let listenerRecord of listenerRecords) {
                if (listenerRecord.onceListenerOnly) {
                    listenersToRemove.push(listenerRecord);
                }
                listenersToCall.push(listenerRecord);
            }
            for (let i = listenersToRemove.length - 1; i >= 0; i--) {
                const listenerRecord = listenersToRemove[i];
                this.replies.deleteListenerRecord(data.command, listenerRecord);
            }
            for (let listenerRecord of listenersToCall) {
                listenerRecord.callback.apply(null, [data.payload]);
            }
        }
        /*
        Occurs when the page receives a message from the service worker.
      
        A map of callbacks is checked to see if anyone is listening to the specific
        message topic. If no one is listening to the message, it is discarded;
        otherwise, the listener callback is executed.
        */
        onPageMessageReceivedFromServiceWorker(event) {
            const data = event.data;
            /* If this message doesn't contain our expected fields, discard the message */
            if (!data || !data.command) {
                return;
            }
            const listenerRecords = this.replies.findListenersForMessage(data.command);
            const listenersToRemove = [];
            const listenersToCall = [];
            Log.debug(`[Worker Messenger] Page received message:`, event.data);
            for (let listenerRecord of listenerRecords) {
                if (listenerRecord.onceListenerOnly) {
                    listenersToRemove.push(listenerRecord);
                }
                listenersToCall.push(listenerRecord);
            }
            for (let i = listenersToRemove.length - 1; i >= 0; i--) {
                const listenerRecord = listenersToRemove[i];
                this.replies.deleteListenerRecord(data.command, listenerRecord);
            }
            for (let listenerRecord of listenersToCall) {
                listenerRecord.callback.apply(null, [data.payload]);
            }
        }
        /*
          Subscribes a callback to be notified every time a service worker sends a
          message to the window frame with the specific command.
         */
        on(command, callback) {
            this.replies.addListener(command, callback, false);
        }
        /*
        Subscribes a callback to be notified the next time a service worker sends a
        message to the window frame with the specific command.
      
        The callback is executed once at most.
        */
        once(command, callback) {
            this.replies.addListener(command, callback, true);
        }
        /**
          Unsubscribe a callback from being notified about service worker messages
          with the specified command.
         */
        off(command) {
            if (command) {
                this.replies.deleteListenerRecords(command);
            }
            else {
                this.replies.deleteAllListenerRecords();
            }
        }
        /*
          Service worker postMessage() communication relies on the property
          navigator.serviceWorker.controller to be non-null. The controller property
          references the active service worker controlling the page. Without this
          property, there is no service worker to message.
      
          The controller property is set when a service worker has successfully
          registered, installed, and activated a worker, and when a page isn't loaded
          in a hard refresh mode bypassing the cache.
      
          It's possible for a service worker to take a second page load to be fully
          activated.
         */
        async isWorkerControllingPage() {
            const env = SdkEnvironment.getWindowEnv();
            if (env === WindowEnvironmentKind.ServiceWorker) {
                return !!self.registration.active;
            }
            else {
                const workerState = await this.context.serviceWorkerManager.getActiveState();
                return workerState === ServiceWorkerActiveState.WorkerA ||
                    workerState === ServiceWorkerActiveState.WorkerB;
            }
        }
        /**
         * For pages, waits until one of our workers is activated.
         *
         * For service workers, waits until the registration is active.
         */
        async waitUntilWorkerControlsPage() {
            return new Promise(async (resolve) => {
                if (await this.isWorkerControllingPage()) {
                    resolve();
                }
                else {
                    const env = SdkEnvironment.getWindowEnv();
                    if (env === WindowEnvironmentKind.ServiceWorker) {
                        self.addEventListener('activate', async (e) => {
                            if (await this.isWorkerControllingPage()) {
                                resolve();
                            }
                        });
                    }
                    else {
                        navigator.serviceWorker.addEventListener('controllerchange', async (e) => {
                            if (await this.isWorkerControllingPage()) {
                                resolve();
                            }
                        });
                    }
                }
            });
        }
    }

    /**
     * LocalStorage with expiring keys.
     *
     * Used when synchronous data access is required, like when clicking the notify button to show the
     * popup conditionally based on a storage value. IndexedDb and cross-frame communication is
     * asynchronous and loses the direct user action privilege required to show a popup.
     */
    class TimedLocalStorage {
        /**
         * Performs a feature test to determine whether LocalStorage is accessible. For example, a user's
         * browser preferences set to prevent saving website data will disable LocalStorage.
         */
        static isLocalStorageSupported() {
            if (typeof localStorage === "undefined") {
                return false;
            }
            try {
                localStorage.getItem("test");
                return true;
            }
            catch (e) {
                return false;
            }
        }
        /**
         * Sets a key in LocalStorage with an expiration time measured in minutes.
         */
        static setItem(key, value, expirationInMinutes) {
            if (!TimedLocalStorage.isLocalStorageSupported()) {
                return;
            }
            const expirationInMilliseconds = typeof expirationInMinutes !== "undefined" ?
                expirationInMinutes * 60 * 1000 :
                0;
            const record = {
                value: JSON.stringify(value),
                timestamp: typeof expirationInMinutes !== "undefined" ?
                    new Date().getTime() + expirationInMilliseconds :
                    undefined,
            };
            localStorage.setItem(key, JSON.stringify(record));
        }
        /**
         * Retrieves a key from LocalStorage if the expiration time when the key was set hasn't already
         * expired.
         */
        static getItem(key) {
            if (!TimedLocalStorage.isLocalStorageSupported()) {
                return null;
            }
            const record = localStorage.getItem(key);
            let parsedRecord;
            try {
                parsedRecord = JSON.parse(record);
            }
            catch (e) {
                return null;
            }
            if (parsedRecord === null) {
                return null;
            }
            if (parsedRecord.timestamp &&
                new Date().getTime() >= parsedRecord.timestamp) {
                localStorage.removeItem(key);
                return null;
            }
            let parsedRecordValue = parsedRecord.value;
            try {
                parsedRecordValue = JSON.parse(parsedRecord.value);
            }
            catch (e) {
                return parsedRecordValue;
            }
            return parsedRecordValue;
        }
        /**
         * Removes an item from LocalStorage.
         */
        static removeItem(key) {
            if (!TimedLocalStorage.isLocalStorageSupported()) {
                return null;
            }
            localStorage.removeItem(key);
        }
    }

    class MainHelper {
        /**
         * If there are multiple manifests, and one of them is our OneSignal manifest, we move it to the top of <head> to ensure our manifest is used for push subscription (manifests after the first are ignored as part of the spec).
         */
        static fixWordpressManifestIfMisplaced() {
            var manifests = document.querySelectorAll('link[rel=manifest]');
            if (!manifests || manifests.length <= 1) {
                // Multiple manifests do not exist on this webpage; there is no issue
                return;
            }
            for (let i = 0; i < manifests.length; i++) {
                let manifest = manifests[i];
                let url = manifest.href;
                if (contains(url, 'gcm_sender_id')) {
                    // Move the <manifest> to the first thing in <head>
                    document.querySelector('head').insertBefore(manifest, document.querySelector('head').children[0]);
                    Log.info('OneSignal: Moved the WordPress push <manifest> to the first element in <head>.');
                }
            }
        }
        /**
         * If the user has manually opted out of notifications (OneSignal.setSubscription), returns -2; otherwise returns 1.
         * @param isOptedIn The result of OneSignal.getSubscription().
         */
        static getNotificationTypeFromOptIn(isOptedIn) {
            if (isOptedIn == true || isOptedIn == null) {
                return 1;
            }
            else {
                return -2;
            }
        }
        /**
         * Returns true if a LocalStorage entry exists for noting the user dismissed the native prompt.
         */
        static wasHttpsNativePromptDismissed() {
            return TimedLocalStorage.getItem('onesignal-notification-prompt') === 'dismissed';
        }
        /**
         * Stores a flag in sessionStorage that we've already shown the HTTP popover to this user and that we should not
         * show it again until they open a new window or tab to the site.
         */
        static markHttpPopoverShown() {
            sessionStorage.setItem('ONESIGNAL_HTTP_PROMPT_SHOWN', 'true');
        }
        /**
         * Returns true if the HTTP popover was already shown inside the same session.
         */
        static isHttpPromptAlreadyShown() {
            return sessionStorage.getItem('ONESIGNAL_HTTP_PROMPT_SHOWN') == 'true';
        }
        static async checkAndTriggerNotificationPermissionChanged() {
            const previousPermission = await Database.get('Options', 'notificationPermission');
            const currentPermission = await OneSignal.getNotificationPermission();
            if (previousPermission !== currentPermission) {
                await EventHelper.triggerNotificationPermissionChanged();
                await Database.put('Options', {
                    key: 'notificationPermission',
                    value: currentPermission
                });
            }
        }
        static async showNotifyButton() {
            if (Environment.isBrowser() && !OneSignal.notifyButton) {
                OneSignal.config.userConfig.notifyButton = OneSignal.config.userConfig.notifyButton || {};
                if (OneSignal.config.userConfig.bell) {
                    // If both bell and notifyButton, notifyButton's options take precedence
                    OneSignal.config.userConfig.bell = {
                        ...OneSignal.config.userConfig.bell,
                        ...OneSignal.config.userConfig.notifyButton
                    };
                    OneSignal.config.userConfig.notifyButton = {
                        ...OneSignal.config.userConfig.notifyButton,
                        ...OneSignal.config.userConfig.bell
                    };
                }
                const displayPredicate = OneSignal.config.userConfig.notifyButton.displayPredicate;
                if (displayPredicate && typeof displayPredicate === 'function') {
                    const predicateValue = await Promise.resolve(OneSignal.config.userConfig.notifyButton.displayPredicate());
                    if (predicateValue !== false) {
                        OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
                        OneSignal.notifyButton.create();
                    }
                    else {
                        Log.debug('Notify button display predicate returned false so not showing the notify button.');
                    }
                }
                else {
                    OneSignal.notifyButton = new Bell(OneSignal.config.userConfig.notifyButton);
                    OneSignal.notifyButton.create();
                }
            }
        }
        static async getNotificationIcons() {
            const appId = await MainHelper.getAppId();
            if (!appId || !appId) {
                throw new InvalidStateError(InvalidStateReason.MissingAppId);
            }
            var url = `${SdkEnvironment.getOneSignalApiUrl().toString()}/apps/${appId}/icon`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.errors) {
                Log.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
                throw new Error('Failed to get notification icons.');
            }
            return data;
        }
        static establishServiceWorkerChannel() {
            const workerMessenger = OneSignal.context.workerMessenger;
            workerMessenger.off();
            workerMessenger.on(WorkerMessengerCommand.NotificationDisplayed, data => {
                Log.debug(location.origin, 'Received notification display event from service worker.');
                Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISPLAYED, data);
            });
            workerMessenger.on(WorkerMessengerCommand.NotificationClicked, async (data) => {
                let clickedListenerCallbackCount;
                if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalProxyFrame) {
                    clickedListenerCallbackCount = await new Promise(resolve => {
                        const proxyFrame = OneSignal.proxyFrame;
                        if (proxyFrame) {
                            proxyFrame.messenger.message(OneSignal.POSTMAM_COMMANDS.GET_EVENT_LISTENER_COUNT, OneSignal.EVENTS.NOTIFICATION_CLICKED, reply => {
                                let callbackCount = reply.data;
                                resolve(callbackCount);
                            });
                        }
                    });
                }
                else {
                    clickedListenerCallbackCount = OneSignal.getListeners(OneSignal.EVENTS.NOTIFICATION_CLICKED).length;
                }
                if (clickedListenerCallbackCount === 0) {
                    /*
                      A site's page can be open but not listening to the
                      notification.clicked event because it didn't call
                      addListenerForNotificationOpened(). In this case, if there are no
                      detected event listeners, we should save the event, instead of firing
                      it without anybody recieving it.
            
                      Or, since addListenerForNotificationOpened() only works once (you have
                      to call it again each time), maybe it was only called once and the
                      user isn't receiving the notification.clicked event for subsequent
                      notifications on the same browser tab.
            
                      Example: notificationClickHandlerMatch: 'origin', tab is clicked,
                               event fires without anybody listening, calling
                               addListenerForNotificationOpened() returns no results even
                               though a notification was just clicked.
                    */
                    Log.debug('notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.');
                    /* For empty notifications without a URL, use the current document's URL */
                    let url = data.url;
                    if (!data.url) {
                        // Least likely to modify, since modifying this property changes the page's URL
                        url = location.href;
                    }
                    await Database.put('NotificationOpened', { url: url, data: data, timestamp: Date.now() });
                }
                else {
                    Event.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, data);
                }
            });
            workerMessenger.on(WorkerMessengerCommand.RedirectPage, data => {
                Log.debug(`${SdkEnvironment.getWindowEnv().toString()} Picked up command.redirect to ${data}, forwarding to host page.`);
                const proxyFrame = OneSignal.proxyFrame;
                if (proxyFrame) {
                    proxyFrame.messenger.message(OneSignal.POSTMAM_COMMANDS.SERVICEWORKER_COMMAND_REDIRECT, data);
                }
            });
            workerMessenger.on(WorkerMessengerCommand.NotificationDismissed, data => {
                Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
            });
        }
        static getSlidedownPermissionMessageOptions() {
            const promptOptions = OneSignal.config.userConfig.promptOptions;
            if (!promptOptions) {
                return null;
            }
            if (promptOptions && !promptOptions.slidedown) {
                return promptOptions;
            }
            return {
                actionMessage: promptOptions.slidedown.actionMessage,
                acceptButtonText: promptOptions.slidedown.acceptButtonText,
                cancelButtonText: promptOptions.slidedown.cancelButtonText,
            };
        }
        static getFullscreenPermissionMessageOptions() {
            const promptOptions = OneSignal.config.userConfig.promptOptions;
            if (!promptOptions) {
                return null;
            }
            if (promptOptions && !promptOptions.fullscreen) {
                return promptOptions;
            }
            return {
                autoAcceptTitle: promptOptions.fullscreen.autoAcceptTitle,
                actionMessage: promptOptions.fullscreen.actionMessage,
                exampleNotificationTitleDesktop: promptOptions.fullscreen.title,
                exampleNotificationTitleMobile: promptOptions.fullscreen.title,
                exampleNotificationMessageDesktop: promptOptions.fullscreen.message,
                exampleNotificationMessageMobile: promptOptions.fullscreen.message,
                exampleNotificationCaption: promptOptions.fullscreen.caption,
                acceptButtonText: promptOptions.fullscreen.acceptButton,
                cancelButtonText: promptOptions.fullscreen.cancelButton,
            };
        }
        static getPromptOptionsQueryString() {
            let promptOptions = MainHelper.getFullscreenPermissionMessageOptions();
            let promptOptionsStr = '';
            if (promptOptions) {
                let hash = MainHelper.getPromptOptionsPostHash();
                for (let key of Object.keys(hash)) {
                    var value = hash[key];
                    promptOptionsStr += '&' + key + '=' + value;
                }
            }
            return promptOptionsStr;
        }
        static getPromptOptionsPostHash() {
            let promptOptions = MainHelper.getFullscreenPermissionMessageOptions();
            if (promptOptions) {
                var legacyParams = {
                    exampleNotificationTitleDesktop: 'exampleNotificationTitle',
                    exampleNotificationMessageDesktop: 'exampleNotificationMessage',
                    exampleNotificationTitleMobile: 'exampleNotificationTitle',
                    exampleNotificationMessageMobile: 'exampleNotificationMessage'
                };
                for (let legacyParamKey of Object.keys(legacyParams)) {
                    let legacyParamValue = legacyParams[legacyParamKey];
                    if (promptOptions[legacyParamKey]) {
                        promptOptions[legacyParamValue] = promptOptions[legacyParamKey];
                    }
                }
                var allowedPromptOptions = [
                    'autoAcceptTitle',
                    'siteName',
                    'autoAcceptTitle',
                    'subscribeText',
                    'showGraphic',
                    'actionMessage',
                    'exampleNotificationTitle',
                    'exampleNotificationMessage',
                    'exampleNotificationCaption',
                    'acceptButtonText',
                    'cancelButtonText',
                    'timeout'
                ];
                var hash = {};
                for (var i = 0; i < allowedPromptOptions.length; i++) {
                    var key = allowedPromptOptions[i];
                    var value = promptOptions[key];
                    var encoded_value = encodeURIComponent(value);
                    if (value || value === false || value === '') {
                        hash[key] = encoded_value;
                    }
                }
            }
            return hash;
        }
        static triggerCustomPromptClicked(clickResult) {
            Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
                result: clickResult
            });
        }
        static async getAppId() {
            if (OneSignal.config.appId) {
                return Promise.resolve(OneSignal.config.appId);
            }
            else {
                const appId = await Database.get('Ids', 'appId');
                return appId;
            }
        }
    }

    class EventHelper {
        static onNotificationPermissionChange() {
            EventHelper.checkAndTriggerSubscriptionChanged();
        }
        static async onInternalSubscriptionSet(optedOut) {
            LimitStore.put('subscription.optedOut', optedOut);
        }
        static async checkAndTriggerSubscriptionChanged() {
            logMethodCall('checkAndTriggerSubscriptionChanged');
            const context = OneSignal.context;
            const subscriptionState = await context.subscriptionManager.getSubscriptionState();
            const appState = await Database.getAppState();
            const { lastKnownPushEnabled } = appState;
            const didStateChange = (lastKnownPushEnabled === null ||
                subscriptionState.subscribed !== lastKnownPushEnabled);
            if (!didStateChange)
                return;
            Log.info(`The user's subscription state changed from ` +
                `${lastKnownPushEnabled === null ? '(not stored)' : lastKnownPushEnabled} ⟶ ${subscriptionState.subscribed}`);
            appState.lastKnownPushEnabled = subscriptionState.subscribed;
            await Database.setAppState(appState);
            EventHelper.triggerSubscriptionChanged(subscriptionState.subscribed);
        }
        static async _onSubscriptionChanged(newSubscriptionState) {
            EventHelper.onSubscriptionChanged_showWelcomeNotification(newSubscriptionState);
            EventHelper.onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate(newSubscriptionState);
        }
        static async onSubscriptionChanged_showWelcomeNotification(isSubscribed) {
            if (OneSignal.__doNotShowWelcomeNotification) {
                Log.debug('Not showing welcome notification because user has previously subscribed.');
                return;
            }
            if (isSubscribed === true) {
                const { deviceId } = await Database.getSubscription();
                const appId = await MainHelper.getAppId();
                let welcome_notification_opts = OneSignal.config.userConfig.welcomeNotification;
                let welcome_notification_disabled = welcome_notification_opts !== undefined && welcome_notification_opts['disable'] === true;
                let title = welcome_notification_opts !== undefined &&
                    welcome_notification_opts['title'] !== undefined &&
                    welcome_notification_opts['title'] !== null
                    ? welcome_notification_opts['title']
                    : '';
                let message = welcome_notification_opts !== undefined &&
                    welcome_notification_opts['message'] !== undefined &&
                    welcome_notification_opts['message'] !== null &&
                    welcome_notification_opts['message'].length > 0
                    ? welcome_notification_opts['message']
                    : 'Thanks for subscribing!';
                let unopenableWelcomeNotificationUrl = new URL(location.href).origin + '?_osp=do_not_open';
                let url = welcome_notification_opts && welcome_notification_opts['url'] && welcome_notification_opts['url'].length > 0
                    ? welcome_notification_opts['url']
                    : unopenableWelcomeNotificationUrl;
                title = decodeHtmlEntities(title);
                message = decodeHtmlEntities(message);
                if (!welcome_notification_disabled) {
                    Log.debug('Sending welcome notification.');
                    OneSignalApi.sendNotification(appId, [deviceId], { en: title }, { en: message }, url, null, { __isOneSignalWelcomeNotification: true }, undefined);
                    Event.trigger(OneSignal.EVENTS.WELCOME_NOTIFICATION_SENT, {
                        title: title,
                        message: message,
                        url: url
                    });
                }
            }
        }
        static async onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate(isSubscribed) {
            const displayPredicate = OneSignal.config.userConfig.notifyButton.displayPredicate;
            if (displayPredicate && typeof displayPredicate === "function" && OneSignal.notifyButton) {
                const predicateResult = await displayPredicate();
                if (predicateResult !== false) {
                    Log.debug('Showing notify button because display predicate returned true.');
                    OneSignal.notifyButton.launcher.show();
                }
                else {
                    Log.debug('Hiding notify button because display predicate returned false.');
                    OneSignal.notifyButton.launcher.hide();
                }
            }
        }
        static async triggerNotificationPermissionChanged(updateIfIdentical = false) {
            let newPermission, isUpdating;
            const currentPermission = await OneSignal.getNotificationPermission();
            const previousPermission = await Database.get('Options', 'notificationPermission');
            newPermission = currentPermission;
            isUpdating = currentPermission !== previousPermission || updateIfIdentical;
            if (isUpdating) {
                await Database.put('Options', {
                    key: 'notificationPermission',
                    value: currentPermission
                });
                Event.trigger(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, {
                    to: newPermission
                });
            }
        }
        static triggerSubscriptionChanged(to) {
            Event.trigger(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, to);
        }
        /**
         * When notifications are clicked, because the site isn't open, the notification is stored in the database. The next
         * time the page opens, the event is triggered if its less than 5 minutes (usually page opens instantly from click).
         *
         * This method is fired for both HTTPS and HTTP sites, so for HTTP sites, the host URL needs to be used, not the
         * subdomain.onesignal.com URL.
         */
        static async fireStoredNotificationClicks(url = document.URL) {
            async function fireEventWithNotification(clickedNotificationInfo) {
                // Remove the notification from the recently clicked list
                // Once this page processes this retroactively provided clicked event, nothing should get the same event
                const appState = await Database.getAppState();
                appState.clickedNotifications[clickedNotificationInfo.url] = null;
                await Database.setAppState(appState);
                /* Clicked notifications look like:
                {
                  "url": "https://notify.tech",
                  "data": {
                    "id": "f44dfcc7-e8cd-47c6-af7e-e2b7ac68afca",
                    "heading": "Example Notification",
                    "content": "This is an example notification.",
                    "icon": "https://onesignal.com/images/notification_logo.png"
                    (there would be a URL field here if it was set)
                  },
                  "timestamp": 1490998270607
                }
                */
                const { data: notification, timestamp } = clickedNotificationInfo;
                if (timestamp) {
                    const minutesSinceNotificationClicked = (Date.now() - timestamp) / 1000 / 60;
                    if (minutesSinceNotificationClicked > 5)
                        return;
                }
                Event.trigger(OneSignal.EVENTS.NOTIFICATION_CLICKED, notification);
            }
            const appState = await Database.getAppState();
            /* Is the flag notificationClickHandlerMatch: origin enabled?
        
               If so, this means we should provide a retroactive notification.clicked event as long as there exists any recently clicked
               notification that matches this site's origin.
        
               Otherwise, the default behavior is to only provide a retroactive notification.clicked event if this page's URL exactly
               matches the notification's URL.
            */
            const notificationClickHandlerMatch = await Database.get('Options', 'notificationClickHandlerMatch');
            if (notificationClickHandlerMatch === 'origin') {
                for (const clickedNotificationUrl of Object.keys(appState.clickedNotifications)) {
                    // Using notificationClickHandlerMatch: 'origin', as long as the notification's URL's origin matches our current tab's origin,
                    // fire the clicked event
                    if (new URL(clickedNotificationUrl).origin === location.origin) {
                        const clickedNotification = appState.clickedNotifications[clickedNotificationUrl];
                        await fireEventWithNotification(clickedNotification);
                    }
                }
            }
            else {
                /*
                  If a user is on https://site.com, document.URL and location.href both report the page's URL as https://site.com/.
                  This causes checking for notifications for the current URL to fail, since there is a notification for https://site.com,
                  but there is no notification for https://site.com/.
          
                  As a workaround, if there are no notifications for https://site.com/, we'll do a check for https://site.com.
                */
                var pageClickedNotifications = appState.clickedNotifications[url];
                if (pageClickedNotifications) {
                    await fireEventWithNotification(pageClickedNotifications);
                }
                else if (!pageClickedNotifications && url.endsWith('/')) {
                    var urlWithoutTrailingSlash = url.substring(0, url.length - 1);
                    pageClickedNotifications = appState.clickedNotifications[urlWithoutTrailingSlash];
                    if (pageClickedNotifications) {
                        await fireEventWithNotification(pageClickedNotifications);
                    }
                }
            }
        }
    }

    var NotificationPermission;
    (function (NotificationPermission) {
        /**
         * The user has not granted notification permissions and may have just dismissed the notification permission prompt.
         */
        NotificationPermission["Default"] = "default";
        /**
         * The user has granted notification permissions.
         */
        NotificationPermission["Granted"] = "granted";
        /**
         * The user has blocked notifications.
         */
        NotificationPermission["Denied"] = "denied";
    })(NotificationPermission || (NotificationPermission = {}));

    class SubscriptionHelper {
        static async registerForPush() {
            let subscription;
            const context = OneSignal.context;
            /*
              Within the same page navigation (the same session), do not register for
              push if the user is already subscribed, otherwise the user will have its
              session count incremented on each page refresh. However, if the user is
              not subscribed, subscribe.
            */
            const isPushEnabled = await OneSignal.isPushNotificationsEnabled();
            if (isPushEnabled && !context.sessionManager.isFirstPageView()) {
                Log.debug('Not registering for push because the user is subscribed and this is not the first page view.');
                return null;
            }
            if (typeof OneSignal !== "undefined") {
                if (OneSignal._isRegisteringForPush) {
                    return null;
                }
                else {
                    OneSignal._isRegisteringForPush = true;
                }
            }
            switch (SdkEnvironment.getWindowEnv()) {
                case WindowEnvironmentKind.Host:
                case WindowEnvironmentKind.OneSignalSubscriptionModal:
                    try {
                        const rawSubscription = await context.subscriptionManager.subscribe(0 /* ResubscribeExisting */);
                        subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
                        context.sessionManager.incrementPageViewCount();
                        EventHelper.triggerNotificationPermissionChanged();
                        EventHelper.checkAndTriggerSubscriptionChanged();
                    }
                    catch (e) {
                        Log.info(e);
                    }
                    break;
                case WindowEnvironmentKind.OneSignalSubscriptionPopup:
                    /*
                      This is the code for the HTTP popup.
                     */
                    const windowCreator = opener || parent;
                    let rawSubscription;
                    // Update the stored permission first, so we know the real value even if the user closes the
                    // popup
                    await context.permissionManager.updateStoredPermission();
                    try {
                        /* If the user doesn't grant permissions, a PushPermissionNotGrantedError will be thrown here. */
                        rawSubscription = await context.subscriptionManager.subscribe(1 /* SubscribeNew */);
                        // Update the permission to granted
                        await context.permissionManager.updateStoredPermission();
                    }
                    catch (e) {
                        // Update the permission to denied or default
                        await context.permissionManager.updateStoredPermission();
                        if (e instanceof PushPermissionNotGrantedError) {
                            switch (e.reason) {
                                case PushPermissionNotGrantedErrorReason.Blocked:
                                    await context.permissionManager.updateStoredPermission();
                                    /* Force update false, because the iframe installs a native
                                    permission change handler that will be triggered when the user
                                    clicks out of the popup back to the parent page */
                                    OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                                        permission: NotificationPermission.Denied,
                                        forceUpdatePermission: false
                                    });
                                    break;
                                case PushPermissionNotGrantedErrorReason.Dismissed:
                                    /* Force update true because default permissions (before
                                    prompting) -> default permissions (after prompting) isn't a
                                    change, but we still want to be notified about it */
                                    OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, {
                                        permission: NotificationPermission.Default,
                                        forceUpdatePermission: true
                                    });
                                    break;
                            }
                        }
                        /*
                          Popup native permission request was blocked or dismissed
                          Close the window
                        */
                        if (windowCreator) {
                            window.close();
                            return null;
                        }
                    }
                    OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.FINISH_REMOTE_REGISTRATION, {
                        rawPushSubscription: rawSubscription.serialize()
                    }, message => {
                        if (message.data.progress === true) {
                            Log.debug('Got message from host page that remote reg. is in progress, closing popup.');
                            if (windowCreator) {
                                window.close();
                            }
                        }
                        else {
                            Log.debug('Got message from host page that remote reg. could not be finished.');
                        }
                    });
                    break;
                default:
                    if (typeof OneSignal !== "undefined") {
                        OneSignal._isRegisteringForPush = false;
                    }
                    throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
            }
            if (typeof OneSignal !== "undefined") {
                OneSignal._isRegisteringForPush = false;
            }
            return subscription;
        }
        /**
         * Returns true if web push subscription occurs on a subdomain of OneSignal.
         * If true, our main IndexedDB is stored on the subdomain of onesignal.com, and not the user's site.
         * @remarks
         *   This method returns true if:
         *     - The browser is not Safari
         *         - Safari uses a different method of subscription and does not require our workaround
         *     - The init parameters contain a subdomain (even if the protocol is HTTPS)
         *         - HTTPS users using our subdomain workaround still have the main IndexedDB stored on our subdomain
         *        - The protocol of the current webpage is http:
         *   Exceptions are:
         *     - Safe hostnames like localhost and 127.0.0.1
         *          - Because we don't want users to get the wrong idea when testing on localhost that direct permission is supported on HTTP, we'll ignore these exceptions. HTTPS will always be required for direct permission
         *        - We are already in popup or iFrame mode, or this is called from the service worker
         */
        static isUsingSubscriptionWorkaround() {
            if (!OneSignal.config) {
                throw new Error(`(${SdkEnvironment.getWindowEnv().toString()}) isUsingSubscriptionWorkaround() cannot be called until OneSignal.config exists.`);
            }
            if (bowser.safari) {
                return false;
            }
            if ((SubscriptionHelper.isLocalhostAllowedAsSecureOrigin() && location.hostname === 'localhost') ||
                location.hostname === '127.0.0.1') {
                return false;
            }
            return ((SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.Host ||
                SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe) &&
                (!!OneSignal.config.subdomain ||
                    location.protocol === 'http:'));
        }
        /**
         * From a child frame, returns true if the current frame context is insecure.
         *
         * This is used to check if isPushNotificationsEnabled() should grab the service worker
         * registration. In an HTTPS iframe of an HTTP page, getting the service worker registration would
         * throw an error.
         *
         * This method can trigger console warnings due to using ServiceWorkerContainer.getRegistration in
         * an insecure frame.
         */
        static async isFrameContextInsecure() {
            // If we are the top frame, or service workers aren't available, don't run this check
            if (window === window.top ||
                !('serviceWorker' in navigator) ||
                typeof navigator.serviceWorker.getRegistration === 'undefined') {
                return false;
            }
            try {
                await navigator.serviceWorker.getRegistration();
                return false;
            }
            catch (e) {
                return true;
            }
        }
        static isInsecureOrigin() {
            return window.location.protocol === "http:";
        }
        static isLocalhostAllowedAsSecureOrigin() {
            return (OneSignal.config &&
                OneSignal.config.userConfig &&
                OneSignal.config.userConfig.allowLocalhostAsSecureOrigin === true);
        }
    }

    class SdkEnvironment {
        /**
         * Returns development, staging, or production.
         *
         * The magic constants used to detect the environment is set or unset when
         * building the SDK.
         */
        static getBuildEnv() {
            if (typeof __DEV__ !== undefined && __DEV__) {
                return BuildEnvironmentKind.Development;
            }
            else if (typeof __STAGING__ !== undefined && __STAGING__) {
                return BuildEnvironmentKind.Staging;
            }
            else {
                return BuildEnvironmentKind.Production;
            }
        }
        /**
         * Determines whether the current frame context executing this function is part of a:
         *
         *  a) HTTP site using a proxy subscription origin
         *
         *  b) or, HTTPS site using a proxy subscription origin
         *
         *  c) or, HTTPS site using its own origin for subscribing
         *
         * The determination affects permissions and subscription:
         *
         *  a) Because the parent (top frame) of the proxy origin frame is HTTP, the entire context is
         *  insecure. In the proxy origin frame, notification permissions are always "denied", access to
         *  the service worker's registration throws a security error, and no service worker controls the
         *  proxy origin frame.
         *
         *  b) The context is secure. In the proxy origin frame, notification permissions are "granted" if
         *  actually granted otherwise "denied" if either unprompted or blocked. The service worker
         *  controls the proxy origin frame and access to the service worker's registration is allowed.
         *  Requesting permissions from child frames is not allowed. Subscribing from child frames wasn't
         *  allowed but is now allowed.
         *
         *  c) All features are allowed.
         *
         * @param usingProxyOrigin Using a subdomain of os.tc or onesignal.com for subscribing to push.
         */
        static async getIntegration(usingProxyOrigin) {
            const isTopFrame = (window === window.top);
            const isHttpsProtocol = window.location.protocol === "https:";
            // For convenience, try to look up usingProxyOrigin instead of requiring it to be passed in
            if (typeof usingProxyOrigin === "undefined") {
                if (typeof OneSignal !== "undefined") {
                    const context = OneSignal.context;
                    if (context) {
                        usingProxyOrigin = !!context.appConfig.subdomain;
                    }
                }
                else
                    throw new InvalidArgumentError("usingProxyOrigin", InvalidArgumentReason.Empty);
            }
            /*
              Executing from the top frame, we can easily determine whether we're HTTPS or HTTP.
        
              Executing from a child frame of any depth, we can check the current frame's protocol. If it's
              HTTP it's definitely insecure. If it's HTTPS, we attempt to call
              ServiceWorkerContainer.getRegistration and see if the call throws an error or succeeds. If the
              call throws an error, we can assume some parent frame in the chain above us is insecure.
             */
            if (isTopFrame) {
                if (isHttpsProtocol) {
                    return usingProxyOrigin ?
                        IntegrationKind.SecureProxy :
                        IntegrationKind.Secure;
                }
                else {
                    /* The case of HTTP and not using a proxy origin isn't possible, because the SDK will throw
                    an initialization error stating a proxy origin is required for HTTP sites. */
                    return IntegrationKind.InsecureProxy;
                }
            }
            else {
                if (isHttpsProtocol) {
                    /* Check whether any parent frames are insecure */
                    const isFrameContextInsecure = await SubscriptionHelper.isFrameContextInsecure();
                    if (isFrameContextInsecure) {
                        return IntegrationKind.InsecureProxy;
                    }
                    else {
                        return usingProxyOrigin ?
                            IntegrationKind.SecureProxy :
                            IntegrationKind.Secure;
                    }
                }
                else {
                    /*
                    Because this frame is insecure, the entire chain is insecure.
            
                    The case of HTTP and not using a proxy origin isn't possible, because the SDK will throw an
                    initialization error stating a proxy origin is required for HTTP sites. */
                    return IntegrationKind.InsecureProxy;
                }
            }
        }
        /**
         * Describes the current frame context.
         */
        static getWindowEnv() {
            if (typeof window === "undefined") {
                if (typeof self !== "undefined" && typeof self.registration !== "undefined") {
                    return WindowEnvironmentKind.ServiceWorker;
                }
                else {
                    return WindowEnvironmentKind.Unknown;
                }
            }
            else {
                // If the window is the root top-most level
                if (window === window.top) {
                    if (location.href.indexOf("initOneSignal") !== -1 ||
                        (location.pathname === '/subscribe' &&
                            location.search === '') &&
                            (location.hostname.endsWith('.onesignal.com') ||
                                location.hostname.endsWith('.os.tc') ||
                                (location.hostname.indexOf('.localhost') !== -1 && SdkEnvironment.getBuildEnv() === BuildEnvironmentKind.Development))) {
                        return WindowEnvironmentKind.OneSignalSubscriptionPopup;
                    }
                    else {
                        return WindowEnvironmentKind.Host;
                    }
                }
                else if (location.pathname === '/webPushIframe') {
                    return WindowEnvironmentKind.OneSignalProxyFrame;
                }
                else if (location.pathname === '/webPushModal') {
                    return WindowEnvironmentKind.OneSignalSubscriptionModal;
                }
                else {
                    return WindowEnvironmentKind.CustomIframe;
                }
            }
        }
        /**
         * Describes whether the SDK is built in tests mode or not.
         *
         * This method is overriden when tests are run.
         */
        static getTestEnv() {
            return TestEnvironmentKind.None;
        }
        /**
         * Returns build-specific prefixes used for operations like registering the
         * service worker.
         *
         * For example, in staging the registered service worker filename is
         * Staging-OneSignalSDKWorker.js.
         */
        static getBuildEnvPrefix(buildEnv = SdkEnvironment.getBuildEnv()) {
            switch (buildEnv) {
                case BuildEnvironmentKind.Development:
                    return 'Dev-';
                case BuildEnvironmentKind.Staging:
                    return 'Staging-';
                case BuildEnvironmentKind.Production:
                    return '';
                default:
                    throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
            }
        }
        /**
         * Returns the URL object representing the components of OneSignal's API
         * endpoint.
         */
        static getOneSignalApiUrl(buildEnv = SdkEnvironment.getBuildEnv()) {
            switch (buildEnv) {
                case BuildEnvironmentKind.Development:
                    return new URL('https://localhost:3001/api/v1');
                case BuildEnvironmentKind.Staging:
                    return new URL('https://onesignal-staging.pw/api/v1');
                case BuildEnvironmentKind.Production:
                    return new URL('https://onesignal.com/api/v1');
                default:
                    throw new InvalidArgumentError('buildEnv', InvalidArgumentReason.EnumOutOfRange);
            }
        }
    }

    class Environment {
        /**
         * True if not in a service worker environment.
         */
        static isBrowser() {
            return typeof window !== 'undefined';
        }
        static version() {
            return (typeof __VERSION__ === "undefined" ? 1 : Number(__VERSION__));
        }
        static get TRADITIONAL_CHINESE_LANGUAGE_TAG() {
            return ['tw', 'hant'];
        }
        static get SIMPLIFIED_CHINESE_LANGUAGE_TAG() {
            return ['cn', 'hans'];
        }
        /* Specifications: https://tools.ietf.org/html/bcp47 */
        static getLanguage() {
            let languageTag = navigator.language;
            if (languageTag) {
                languageTag = languageTag.toLowerCase();
                let languageSubtags = languageTag.split('-');
                if (languageSubtags[0] == 'zh') {
                    // The language is zh-?
                    // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional); OneSignal only supports these two Chinese variants
                    for (let traditionalSubtag of Environment.TRADITIONAL_CHINESE_LANGUAGE_TAG) {
                        if (languageSubtags.indexOf(traditionalSubtag) !== -1) {
                            return 'zh-Hant';
                        }
                    }
                    for (let simpleSubtag of Environment.SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
                        if (languageSubtags.indexOf(simpleSubtag) !== -1) {
                            return 'zh-Hans';
                        }
                    }
                    return 'zh-Hant'; // Return Chinese traditional by default
                }
                else {
                    // Return the language subtag (it can be three characters, so truncate it down to 2 just to be sure)
                    return languageSubtags[0].substring(0, 2);
                }
            }
            else {
                return 'en';
            }
        }
        static supportsServiceWorkers() {
            const env = SdkEnvironment.getWindowEnv();
            switch (env) {
                case WindowEnvironmentKind.ServiceWorker:
                    return true;
                default:
                    return typeof navigator !== "undefined" &&
                        'serviceWorker' in navigator;
            }
        }
        /*
          Returns the MD5 hash of all stylesheets within the src/stylesheets
          directory.
         */
        static getSdkStylesVersionHash() {
            return (typeof __SRC_STYLESHEETS_MD5_HASH__ === "undefined" ? '1' : __SRC_STYLESHEETS_MD5_HASH__);
        }
    }

    var SdkInitErrorKind;
    (function (SdkInitErrorKind) {
        SdkInitErrorKind[SdkInitErrorKind["InvalidAppId"] = 0] = "InvalidAppId";
        SdkInitErrorKind[SdkInitErrorKind["AppNotConfiguredForWebPush"] = 1] = "AppNotConfiguredForWebPush";
        SdkInitErrorKind[SdkInitErrorKind["MissingSubdomain"] = 2] = "MissingSubdomain";
        SdkInitErrorKind[SdkInitErrorKind["WrongSiteUrl"] = 3] = "WrongSiteUrl";
        SdkInitErrorKind[SdkInitErrorKind["MultipleInitialization"] = 4] = "MultipleInitialization";
        SdkInitErrorKind[SdkInitErrorKind["MissingSafariWebId"] = 5] = "MissingSafariWebId";
        SdkInitErrorKind[SdkInitErrorKind["Unknown"] = 6] = "Unknown";
    })(SdkInitErrorKind || (SdkInitErrorKind = {}));
    class SdkInitError extends OneSignalError {
        constructor(reason, extra) {
            switch (reason) {
                case SdkInitErrorKind.InvalidAppId:
                    super('OneSignal: This app ID does match any existing app. Double check your app ID.');
                    break;
                case SdkInitErrorKind.AppNotConfiguredForWebPush:
                    super('OneSignal: This app ID does not have any web platforms enabled. Double check your app ID, or see step 1 on our setup guide (https://goo.gl/01h7fZ).');
                    break;
                case SdkInitErrorKind.MissingSubdomain:
                    super('OneSignal: Non-HTTPS pages require a subdomain of OneSignal to be chosen on your dashboard. See step 1.4 on our setup guide (https://goo.gl/xip6JB).');
                    break;
                case SdkInitErrorKind.WrongSiteUrl:
                    if (extra && extra.siteUrl) {
                        super(`OneSignal: This web push config can only be used on ${new URL(extra.siteUrl).origin}. Your current origin is ${location.origin}.`);
                    }
                    else {
                        super('OneSignal: This web push config can not be used on the current site.');
                    }
                    break;
                case SdkInitErrorKind.MultipleInitialization:
                    super('OneSignal: The OneSignal web SDK can only be initialized once. Extra initializations are ignored. Please remove calls initializing the SDK more than once.');
                    break;
                case SdkInitErrorKind.MissingSafariWebId:
                    super('OneSignal: Safari browser support on Mac OS X requires the Safari web platform to be enabled. Please see the Safari Support steps in our web setup guide.');
                    break;
                case SdkInitErrorKind.Unknown:
                    super('OneSignal: An unknown initialization error occurred.');
                    break;
            }
            this.reason = SdkInitErrorKind[reason];
        }
    }

    var SubscriptionErrorReason;
    (function (SubscriptionErrorReason) {
        SubscriptionErrorReason[SubscriptionErrorReason["InvalidSafariSetup"] = 0] = "InvalidSafariSetup";
        SubscriptionErrorReason[SubscriptionErrorReason["Blocked"] = 1] = "Blocked";
        SubscriptionErrorReason[SubscriptionErrorReason["Dismissed"] = 2] = "Dismissed";
    })(SubscriptionErrorReason || (SubscriptionErrorReason = {}));
    class SubscriptionError extends OneSignalError {
        constructor(reason) {
            switch (reason) {
                case SubscriptionErrorReason.InvalidSafariSetup:
                    super('The Safari site URL, icon size, or push certificate is invalid, or Safari is in a private session.');
                    break;
                case SubscriptionErrorReason.Blocked:
                    super('Notification permissions are blocked.');
                    break;
                case SubscriptionErrorReason.Dismissed:
                    super('The notification permission prompt was dismissed.');
                    break;
            }
        }
    }

    class RawPushSubscription {
        /**
         * Returns true if an existing recorded W3C or Safari subscription is
         * identical to the current subscription.
         */
        isNewSubscription() {
            if (this.existingW3cPushSubscription) {
                return this.existingW3cPushSubscription.w3cEndpoint.toString() !== this.w3cEndpoint.toString() ||
                    this.existingW3cPushSubscription.w3cP256dh !== this.w3cP256dh ||
                    this.existingW3cPushSubscription.w3cAuth !== this.w3cAuth;
            }
            else if (this.existingSafariDeviceToken) {
                return this.existingSafariDeviceToken !== this.safariDeviceToken;
            }
            else {
                return true;
            }
        }
        /**
         * Given a native W3C browser push subscription, takes the endpoint, p256dh,
         * and auth.
         *
         * @param pushSubscription A native browser W3C push subscription.
         */
        static setFromW3cSubscription(pushSubscription) {
            const rawPushSubscription = new RawPushSubscription();
            if (pushSubscription) {
                rawPushSubscription.w3cEndpoint = new URL(pushSubscription.endpoint);
                // Retrieve p256dh and auth for encrypted web push protocol
                if (pushSubscription.getKey) {
                    // p256dh and auth are both ArrayBuffer
                    let p256dh = null;
                    try {
                        p256dh = pushSubscription.getKey('p256dh');
                    }
                    catch (e) {
                        // User is most likely running < Chrome < 50
                    }
                    let auth = null;
                    try {
                        auth = pushSubscription.getKey('auth');
                    }
                    catch (e) {
                        // User is most likely running < Firefox 45
                    }
                    if (p256dh) {
                        // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                        let p256dh_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)));
                        rawPushSubscription.w3cP256dh = p256dh_base64encoded;
                    }
                    if (auth) {
                        // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
                        let auth_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));
                        rawPushSubscription.w3cAuth = auth_base64encoded;
                    }
                }
            }
            return rawPushSubscription;
        }
        /**
         * Given a native browser Safari push subscription, sets the device token
         * property.
         *
         * @param safariDeviceToken A native browser Safari push subscription.
         */
        setFromSafariSubscription(safariDeviceToken) {
            this.safariDeviceToken = safariDeviceToken;
        }
        serialize() {
            const serializedBundle = {
                /* Old Parameters */
                w3cEndpoint: this.w3cEndpoint.toString(),
                w3cP256dh: this.w3cP256dh,
                w3cAuth: this.w3cAuth,
                safariDeviceToken: this.safariDeviceToken,
                existingPushSubscription: this.existingW3cPushSubscription ? this.existingW3cPushSubscription.serialize() : null,
                existingSafariDeviceToken: this.existingSafariDeviceToken
            };
            return serializedBundle;
        }
        static deserialize(bundle) {
            const subscription = new RawPushSubscription();
            if (!bundle) {
                return subscription;
            }
            try {
                subscription.w3cEndpoint = new URL(bundle.w3cEndpoint);
            }
            catch (e) {
                // w3cEndpoint will be null for Safari
            }
            subscription.w3cP256dh = bundle.w3cP256dh;
            subscription.w3cAuth = bundle.w3cAuth;
            subscription.existingW3cPushSubscription = bundle.existingPushSubscription
                ? RawPushSubscription.deserialize(bundle.existingPushSubscription)
                : null;
            subscription.safariDeviceToken = bundle.safariDeviceToken;
            subscription.existingSafariDeviceToken = bundle.existingSafariDeviceToken;
            return subscription;
        }
    }

    /**
     * Used for VAPID, converts the VAPID public key into a byte format the browser accepts.
     */
    function base64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    /**
     * From: https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
     */
    function base64Encode(str) {
        // first we use encodeURIComponent to get percent-encoded UTF-8,
        // then we convert the percent encodings into raw bytes which
        // can be fed into btoa.
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    }

    var DeliveryPlatformKind;
    (function (DeliveryPlatformKind) {
        DeliveryPlatformKind[DeliveryPlatformKind["ChromeLike"] = 5] = "ChromeLike";
        DeliveryPlatformKind[DeliveryPlatformKind["Safari"] = 7] = "Safari";
        DeliveryPlatformKind[DeliveryPlatformKind["Firefox"] = 8] = "Firefox";
        DeliveryPlatformKind[DeliveryPlatformKind["Edge"] = 12] = "Edge";
    })(DeliveryPlatformKind || (DeliveryPlatformKind = {}));

    var DevicePlatformKind;
    (function (DevicePlatformKind) {
        DevicePlatformKind["Mobile"] = "mobile";
        DevicePlatformKind["Tablet"] = "tablet";
        DevicePlatformKind["Desktop"] = "desktop";
    })(DevicePlatformKind || (DevicePlatformKind = {}));

    /**
     * Describes the fields of a OneSignal "player" device record.
     *
     * This is used when creating or modifying push and email records.
     */
    class DeviceRecord {
        constructor() {
            this.language = Environment.getLanguage();
            this.timezone = new Date().getTimezoneOffset() * -60;
            this.browserName = bowser.name;
            this.browserVersion = parseInt(String(bowser.version)) !== NaN ? parseInt(String(bowser.version)) : -1;
            this.operatingSystem = this.getBrowserOperatingSystem();
            this.operatingSystemVersion = String(bowser.osversion);
            this.devicePlatform = this.getDevicePlatform();
            this.deviceModel = navigator.platform;
            this.sdkVersion = Environment.version().toString();
            this.deliveryPlatform = this.getDeliveryPlatform();
            // Unimplemented properties are appId, deliveryPlatform, subscriptionState, and subscription
        }
        getDevicePlatform() {
            const isMobile = bowser.mobile;
            const isTablet = bowser.tablet;
            if (isMobile) {
                return DevicePlatformKind.Mobile;
            }
            else if (isTablet) {
                return DevicePlatformKind.Tablet;
            }
            else {
                return DevicePlatformKind.Desktop;
            }
        }
        isSafari() {
            return bowser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
        }
        getBrowserOperatingSystem() {
            /*
              mac
              windows - other than Windows Phone
              windowsphone
              linux - other than android, chromeos, webos, tizen, and sailfish
              chromeos
              android
              ios - also sets one of iphone/ipad/ipod
              blackberry
              firefoxos
              webos - may also set touchpad
              bada
              tizen
              sailfish
            */
            if (bowser.mac) {
                return "Mac OS X";
            }
            if (bowser.windows) {
                return "Microsoft Windows";
            }
            if (bowser.windowsphone) {
                return "Microsoft Windows Phone";
            }
            if (bowser.linux) {
                return "Linux";
            }
            if (bowser.chromeos) {
                return "Google Chrome OS";
            }
            if (bowser.android) {
                return "Google Android";
            }
            if (bowser.ios) {
                return "Apple iOS";
            }
            if (bowser.blackberry) {
                return "Blackberry";
            }
            if (bowser.firefoxos) {
                return "Mozilla Firefox OS";
            }
            if (bowser.webos) {
                return "WebOS";
            }
            if (bowser.tizen) {
                return "Tizen";
            }
            if (bowser.sailfish) {
                return "Sailfish OS";
            }
            return "Unknown";
        }
        getDeliveryPlatform() {
            // For testing purposes, allows changing the browser user agent
            const browser = redetectBrowserUserAgent();
            if (this.isSafari()) {
                return DeliveryPlatformKind.Safari;
            }
            else if (browser.firefox) {
                return DeliveryPlatformKind.Firefox;
            }
            else if (browser.msedge) {
                return DeliveryPlatformKind.Edge;
            }
            else {
                return DeliveryPlatformKind.ChromeLike;
            }
        }
        serialize() {
            const serializedBundle = {
                /* Old Parameters */
                device_type: this.deliveryPlatform,
                language: this.language,
                timezone: this.timezone,
                device_os: this.browserVersion,
                sdk: this.sdkVersion,
                notification_types: this.subscriptionState,
                /* New Parameters */
                delivery_platform: this.deliveryPlatform,
                browser_name: this.browserName,
                browser_version: this.browserVersion,
                operating_system: this.operatingSystem,
                operating_system_version: this.operatingSystemVersion,
                device_platform: this.devicePlatform,
                device_model: this.deviceModel,
            };
            if (this.appId) {
                serializedBundle.app_id = this.appId;
            }
            return serializedBundle;
        }
        deserialize(_) { throw new NotImplementedError(); }
    }

    /**
     * Describes a push notification device record.
     */
    class PushDeviceRecord extends DeviceRecord {
        /**
         * @param subscription Omitting this parameter does not void the record's identifier.
         */
        constructor(subscription) {
            super();
            this.subscription = subscription;
        }
        serialize() {
            const serializedBundle = super.serialize();
            if (this.subscription) {
                serializedBundle.identifier = bowser.safari ?
                    this.subscription.safariDeviceToken :
                    this.subscription.w3cEndpoint.toString();
                serializedBundle.web_auth = this.subscription.w3cAuth;
                serializedBundle.web_p256 = this.subscription.w3cP256dh;
            }
            return serializedBundle;
        }
        static createFromPushSubscription(appId, rawPushSubscription, subscriptionState) {
            const pushRegistration = new PushDeviceRecord(rawPushSubscription);
            pushRegistration.appId = appId;
            pushRegistration.subscriptionState = rawPushSubscription ?
                SubscriptionStateKind.Subscribed :
                SubscriptionStateKind.NotSubscribed;
            if (subscriptionState) {
                pushRegistration.subscriptionState = subscriptionState;
            }
            return pushRegistration;
        }
        deserialize(_) { throw new NotImplementedError(); }
    }

    class SubscriptionManager {
        constructor(context, config) {
            this.context = context;
            this.config = config;
        }
        static isSafari() {
            return bowser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
        }
        /**
         * Subscribes for a web push subscription.
         *
         * This method is aware of different subscription environments like subscribing from a webpage,
         * service worker, or OneSignal HTTP popup and will select the correct method. This is intended to
         * be the single public API for obtaining a raw web push subscription (i.e. what the browser
         * returns from a successful subscription).
         */
        async subscribe(subscriptionStrategy) {
            const env = SdkEnvironment.getWindowEnv();
            switch (env) {
                case WindowEnvironmentKind.CustomIframe:
                case WindowEnvironmentKind.Unknown:
                case WindowEnvironmentKind.OneSignalProxyFrame:
                    throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
            }
            let rawPushSubscription;
            switch (env) {
                case WindowEnvironmentKind.ServiceWorker:
                    rawPushSubscription = await this.subscribeFcmFromWorker(subscriptionStrategy);
                    break;
                case WindowEnvironmentKind.Host:
                case WindowEnvironmentKind.OneSignalSubscriptionModal:
                case WindowEnvironmentKind.OneSignalSubscriptionPopup:
                    /*
                      Check our notification permission before subscribing.
            
                      - If notifications are blocked, we can't subscribe.
                      - If notifications are granted, the user should be completely resubscribed.
                      - If notifications permissions are untouched, the user will be prompted and then
                        subscribed.
            
                      Subscribing is only possible on the top-level frame, so there's no permission ambiguity
                      here.
                    */
                    if ((await OneSignal.getNotificationPermission()) === NotificationPermission.Denied) {
                        throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
                    }
                    if (SubscriptionManager.isSafari()) {
                        rawPushSubscription = await this.subscribeSafari();
                    }
                    else {
                        rawPushSubscription = await this.subscribeFcmFromPage(subscriptionStrategy);
                    }
                    break;
            }
            return rawPushSubscription;
        }
        /**
         * Creates a device record from the provided raw push subscription and forwards this device record
         * to OneSignal to create or update the device ID.
         *
         * @param rawPushSubscription The raw push subscription obtained from calling subscribe(). This
         * can be null, in which case OneSignal's device record is set to unsubscribed.
         *
         * @param subscriptionState Describes whether the device record is subscribed, unsubscribed, or in
         * another state. By default, this is set from the availability of rawPushSubscription (exists:
         * Subscribed, null: Unsubscribed). Other use cases may result in creation of a device record that
         * warrants a special subscription state. For example, a device ID can be retrieved by providing
         * an identifier, and a new device record will be created if the identifier didn't exist. These
         * records are marked with a special subscription state for tracking purposes.
         */
        async registerSubscription(pushSubscription, subscriptionState) {
            /*
              This may be called after the RawPushSubscription has been serialized across a postMessage
              frame. This means it will only have object properties and none of the functions. We have to
              recreate the RawPushSubscription.
        
              Keep in mind pushSubscription can be null in cases where resubscription isn't possible
              (blocked permission).
            */
            if (pushSubscription) {
                pushSubscription = RawPushSubscription.deserialize(pushSubscription);
            }
            const deviceRecord = PushDeviceRecord.createFromPushSubscription(this.config.appId, pushSubscription, subscriptionState);
            deviceRecord.appId = this.config.appId;
            deviceRecord.subscriptionState = SubscriptionStateKind.Subscribed;
            let newDeviceId;
            if (await this.isAlreadyRegisteredWithOneSignal()) {
                const { deviceId } = await Database.getSubscription();
                if (!pushSubscription || pushSubscription.isNewSubscription()) {
                    newDeviceId = await OneSignalApi.updateUserSession(deviceId, deviceRecord);
                    Log.info("Updated the subscriber's OneSignal session:", deviceRecord);
                }
                else {
                    // The subscription hasn't changed; don't register with OneSignal and reuse the existing device ID
                    newDeviceId = deviceId;
                    Log.debug('The existing push subscription was resubscribed, but not registering with OneSignal because the ' +
                        'new subscription is identical.');
                }
            }
            else {
                const id = await OneSignalApi.createUser(deviceRecord);
                newDeviceId = id;
                Log.info("Subscribed to web push and registered with OneSignal:", deviceRecord);
            }
            await this.associateSubscriptionWithEmail(newDeviceId);
            if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
                Event.trigger(OneSignal.EVENTS.REGISTERED);
            }
            // Get the existing subscription settings to prevent overriding opt out
            const subscription = await Database.getSubscription();
            subscription.deviceId = newDeviceId;
            if (pushSubscription) {
                if (SubscriptionManager.isSafari()) {
                    subscription.subscriptionToken = pushSubscription.safariDeviceToken;
                }
                else {
                    subscription.subscriptionToken = pushSubscription.w3cEndpoint.toString();
                }
            }
            else {
                subscription.subscriptionToken = null;
            }
            await Database.setSubscription(subscription);
            if (typeof OneSignal !== "undefined") {
                OneSignal._sessionInitAlreadyRunning = false;
            }
            return subscription;
        }
        /**
         * Used before subscribing for push, we request notification permissions
         * before installing the service worker to prevent non-subscribers from
         * querying our server for an updated service worker every 24 hours.
         */
        async requestPresubscribeNotificationPermission() {
            return SubscriptionManager.requestNotificationPermission();
        }
        async unsubscribe(strategy) {
            if (strategy === 0 /* DestroySubscription */) {
                throw new NotImplementedError();
            }
            else if (strategy === 1 /* MarkUnsubscribed */) {
                if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.ServiceWorker) {
                    const { deviceId } = await Database.getSubscription();
                    await OneSignalApi.updatePlayer(this.context.appConfig.appId, deviceId, {
                        notification_types: SubscriptionStateKind.MutedByApi
                    });
                    await Database.put('Options', { key: 'optedOut', value: true });
                }
                else {
                    throw new NotImplementedError();
                }
            }
            else {
                throw new NotImplementedError();
            }
        }
        /**
         * Calls Notification.requestPermission(), but returns a Promise instead of
         * accepting a callback like the actual Notification.requestPermission();
         */
        static requestNotificationPermission() {
            return new Promise(resolve => window.Notification.requestPermission(resolve));
        }
        /**
         * Called after registering a subscription with OneSignal to associate this subscription with an
         * email record if one exists.
         */
        async associateSubscriptionWithEmail(newDeviceId) {
            const emailProfile = await Database.getEmailProfile();
            if (!emailProfile.emailId || !emailProfile.emailId) {
                return;
            }
            // Update the push device record with a reference to the new email ID and email address
            await OneSignalApi.updatePlayer(this.config.appId, newDeviceId, {
                parent_player_id: emailProfile.emailId,
                email: emailProfile.emailAddress
            });
        }
        async isAlreadyRegisteredWithOneSignal() {
            const { deviceId } = await Database.getSubscription();
            return !!deviceId;
        }
        subscribeSafariPromptPermission() {
            return new Promise(resolve => {
                window.safari.pushNotification.requestPermission(`${SdkEnvironment.getOneSignalApiUrl().toString()}/safari`, this.config.safariWebId, {
                    app_id: this.config.appId
                }, response => {
                    if (response.deviceToken) {
                        resolve(response.deviceToken.toLowerCase());
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        }
        async subscribeSafari() {
            const pushSubscriptionDetails = new RawPushSubscription();
            if (!this.config.safariWebId) {
                throw new SdkInitError(SdkInitErrorKind.MissingSafariWebId);
            }
            const { deviceToken: existingDeviceToken } = window.safari.pushNotification.permission(this.config.safariWebId);
            pushSubscriptionDetails.existingSafariDeviceToken = existingDeviceToken;
            if (!existingDeviceToken) {
                /*
                  We're about to show the Safari native permission request. It can fail for a number of
                  reasons, e.g.:
                    - Setup-related reasons when developers just starting to get set up
                      - Address bar URL doesn't match safari certificate allowed origins (case-sensitive)
                      - Safari web ID doesn't match provided web ID
                      - Browsing in a Safari private window
                      - Bad icon DPI
          
                  but shouldn't fail for sites that have already gotten Safari working.
          
                  We'll show the permissionPromptDisplay event if the Safari user isn't already subscribed,
                  otherwise an already subscribed Safari user would not see the permission request again.
                 */
                Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
            }
            const deviceToken = await this.subscribeSafariPromptPermission();
            EventHelper.triggerNotificationPermissionChanged();
            if (deviceToken) {
                pushSubscriptionDetails.setFromSafariSubscription(deviceToken);
            }
            else {
                throw new SubscriptionError(SubscriptionErrorReason.InvalidSafariSetup);
            }
            return pushSubscriptionDetails;
        }
        async subscribeFcmFromPage(subscriptionStrategy) {
            /*
              Before installing the service worker, request notification permissions. If
              the visitor doesn't grant permissions, this saves bandwidth bleeding from
              an unused install service worker periodically fetching an updated version
              from our CDN.
            */
            /*
              Trigger the permissionPromptDisplay event to the best of our knowledge.
            */
            if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker &&
                window.Notification.permission === NotificationPermission.Default) {
                Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
                const permission = await this.requestPresubscribeNotificationPermission();
                /*
                  Notification permission changes are already broadcast by the page's
                  notificationpermissionchange handler. This means that allowing or
                  denying the permission prompt will cause double events. However, the
                  native event handler does not broadcast an event for dismissing the
                  prompt, because going from "default" permissions to "default"
                  permissions isn't a change. We specifically broadcast "default" to "default" changes.
                 */
                if (permission === NotificationPermission.Default) {
                    EventHelper.triggerNotificationPermissionChanged(true);
                }
                // If the user did not grant push permissions, throw and exit
                switch (permission) {
                    case NotificationPermission.Default:
                        Log.debug('Exiting subscription and not registering worker because the permission was dismissed.');
                        OneSignal._sessionInitAlreadyRunning = false;
                        OneSignal._isRegisteringForPush = false;
                        throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Dismissed);
                    case NotificationPermission.Denied:
                        Log.debug('Exiting subscription and not registering worker because the permission was blocked.');
                        OneSignal._sessionInitAlreadyRunning = false;
                        OneSignal._isRegisteringForPush = false;
                        throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
                }
            }
            /* Now that permissions have been granted, install the service worker */
            if (await this.context.serviceWorkerManager.shouldInstallWorker()) {
                await this.context.serviceWorkerManager.installWorker();
            }
            Log.debug('Waiting for the service worker to activate...');
            const workerRegistration = await navigator.serviceWorker.ready;
            Log.debug('Service worker is ready to continue subscribing.');
            return await this.subscribeFcmVapidOrLegacyKey(workerRegistration.pushManager, subscriptionStrategy);
        }
        async subscribeFcmFromWorker(subscriptionStrategy) {
            /*
              We're running inside of the service worker.
        
              Check to make sure our registration is activated, otherwise we can't
              subscribe for push.
        
              HACK: Firefox doesn't set self.registration.active in the service worker
              context. From a non-service worker context, like
              navigator.serviceWorker.getRegistration().active, the property actually is
              set, but it's just not set within the service worker context.
        
              Because of this, we're not able to check for this property on Firefox.
             */
            if (!self.registration.active && !bowser.firefox) {
                throw new InvalidStateError(InvalidStateReason.ServiceWorkerNotActivated);
                /*
                  Or should we wait for the service worker to be ready?
          
                  await new Promise(resolve => self.onactivate = resolve);
                 */
            }
            /*
              Check to make sure push permissions have been granted.
             */
            const pushPermission = await self.registration.pushManager.permissionState({ userVisibleOnly: true });
            if (pushPermission === 'denied') {
                throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked);
            }
            else if (pushPermission === 'prompt') {
                throw new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Default);
            }
            return await this.subscribeFcmVapidOrLegacyKey(self.registration.pushManager, subscriptionStrategy);
        }
        /**
         * Returns the correct VAPID key to use for subscription based on the browser type.
         *
         * If the VAPID key isn't present, undefined is returned instead of null.
         */
        getVapidKeyForBrowser() {
            // Specifically return undefined instead of null if the key isn't available
            let key = undefined;
            if (bowser.firefox) {
                /*
                  Firefox uses VAPID for application identification instead of
                  authentication, and so all apps share an identification key.
                 */
                key = this.config.onesignalVapidPublicKey;
            }
            else {
                /*
                  Chrome and Chrome-like browsers including Opera and Yandex use VAPID for
                  authentication, and so each app uses a uniquely generated key.
                 */
                key = this.config.vapidPublicKey;
            }
            if (key) {
                return base64ToUint8Array(key).buffer;
            }
            else {
                return undefined;
            }
        }
        /**
         * Uses the browser's PushManager interface to actually subscribe for a web push subscription.
         *
         * @param pushManager An instance of the browser's push manager, either from the page or from the
         * service worker.
         *
         * @param subscriptionStrategy Given an existing push subscription, describes whether the existing
         * push subscription is resubscribed as-is leaving it unchanged, or unsubscribed to make room for
         * a new push subscription.
         */
        async subscribeFcmVapidOrLegacyKey(pushManager, subscriptionStrategy) {
            /*
              Always try subscribing using VAPID by providing an applicationServerKey, except for cases
              where the user is already subscribed, handled below. If browser doesn't support VAPID's
              applicationServerKey property, our extra options will be safely ignored, and a non-VAPID
              subscription will be automatically returned.
             */
            let subscriptionOptions = {
                userVisibleOnly: true,
                applicationServerKey: this.getVapidKeyForBrowser() ? this.getVapidKeyForBrowser() : undefined
            };
            let newPushSubscription;
            /*
              Is there an existing push subscription?
        
              If so, and if we're on Chrome 54+, we can use its details to resubscribe
              without any extra info needed.
             */
            const existingPushSubscription = await pushManager.getSubscription();
            /* Record the subscription created at timestamp only if this is a new subscription */
            let shouldRecordSubscriptionCreatedAt = !existingPushSubscription;
            /* Depending on the subscription strategy, handle existing subscription in various ways */
            switch (subscriptionStrategy) {
                case 0 /* ResubscribeExisting */:
                    /* Use the existing push subscription's PushSubscriptionOptions if it exists to resubscribe
                    an identical unchanged subscription, or unsubscribe this existing push subscription if
                    PushSubscriptionOptions is null. */
                    if (existingPushSubscription && existingPushSubscription.options) {
                        Log.debug('[Subscription Manager] An existing push subscription exists and options is not null. ' +
                            'Using existing options to resubscribe.');
                        /*
                          Hopefully we're on Chrome 54+, so we can use PushSubscriptionOptions to get the exact
                          applicationServerKey to use, without needing to assume a manifest.json exists or passing
                          in our VAPID key and dealing with potential mismatched sender ID issues.
                        */
                        /*
                          Overwrite our subscription options to use the exact same subscription options we used to
                          subscribe in the first place. The previous always-use-VAPID assignment is overriden by
                          this assignment.
                        */
                        subscriptionOptions = existingPushSubscription.options;
                        /* If we're not subscribing a new subscription, don't overwrite the created at timestamp */
                        shouldRecordSubscriptionCreatedAt = false;
                    }
                    else if (existingPushSubscription && !existingPushSubscription.options) {
                        Log.debug('[Subscription Manager] An existing push subscription exists and options is null. ' +
                            'Unsubscribing from push first now.');
                        /*
                          There isn't a great solution if PushSubscriptionOptions (supported on Chrome 54+) isn't
                          supported.
              
                          We want to subscribe the user, but we don't know whether the user was subscribed via
                          GCM's manifest.json or FCM's VAPID.
              
                          This bug (https://bugs.chromium.org/p/chromium/issues/detail?id=692577) shows that a
                          mismatched sender ID error is possible if you subscribe via FCM's VAPID while the user
                          was originally subscribed via GCM's manifest.json (fails silently).
              
                          Because of this, we should unsubscribe the user from push first and then resubscribe
                          them.
                        */
                        await existingPushSubscription.unsubscribe();
                        /* We're unsubscribing, so we want to store the created at timestamp */
                        shouldRecordSubscriptionCreatedAt = false;
                    }
                    break;
                case 1 /* SubscribeNew */:
                    /* Since we want a new subscription every time with this strategy, just unsubscribe. */
                    if (existingPushSubscription) {
                        Log.debug('[Subscription Manager] Unsubscribing existing push subscription.');
                        await existingPushSubscription.unsubscribe();
                    }
                    // Always record the subscription if we're resubscribing
                    shouldRecordSubscriptionCreatedAt = true;
                    break;
            }
            // Actually subscribe the user to push
            Log.debug('[Subscription Manager] Subscribing to web push with these options:', subscriptionOptions);
            newPushSubscription = await pushManager.subscribe(subscriptionOptions);
            if (shouldRecordSubscriptionCreatedAt) {
                const bundle = await Database.getSubscription();
                bundle.createdAt = new Date().getTime();
                bundle.expirationTime = newPushSubscription.expirationTime;
                await Database.setSubscription(bundle);
            }
            // Create our own custom object from the browser's native PushSubscription object
            const pushSubscriptionDetails = RawPushSubscription.setFromW3cSubscription(newPushSubscription);
            if (existingPushSubscription) {
                pushSubscriptionDetails.existingW3cPushSubscription =
                    RawPushSubscription.setFromW3cSubscription(existingPushSubscription);
            }
            return pushSubscriptionDetails;
        }
        async isSubscriptionExpiring() {
            const integrationKind = await SdkEnvironment.getIntegration();
            const windowEnv = await SdkEnvironment.getWindowEnv();
            switch (integrationKind) {
                case IntegrationKind.Secure:
                    return await this.isSubscriptionExpiringForSecureIntegration();
                case IntegrationKind.SecureProxy:
                    if (windowEnv === WindowEnvironmentKind.Host) {
                        const proxyFrameHost = OneSignal.proxyFrameHost;
                        if (!proxyFrameHost) {
                            throw new InvalidStateError(InvalidStateReason.NoProxyFrame);
                        }
                        else {
                            return await proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SUBSCRIPTION_EXPIRATION_STATE);
                        }
                    }
                    else {
                        return await this.isSubscriptionExpiringForSecureIntegration();
                    }
                case IntegrationKind.InsecureProxy:
                    /* If we're in an insecure frame context, check the stored expiration since we can't access
                    the actual push subscription. */
                    const { expirationTime } = await Database.getSubscription();
                    if (!expirationTime) {
                        /* If an existing subscription does not have a stored expiration time, do not
                        treat it as expired. The subscription may have been created before this feature was added,
                        or the browser may not assign any expiration time. */
                        return false;
                    }
                    /* The current time (in UTC) is past the expiration time (also in UTC) */
                    return new Date().getTime() >= expirationTime;
            }
        }
        async isSubscriptionExpiringForSecureIntegration() {
            const serviceWorkerState = await this.context.serviceWorkerManager.getActiveState();
            if (!(serviceWorkerState === ServiceWorkerActiveState.WorkerA ||
                serviceWorkerState === ServiceWorkerActiveState.WorkerB)) {
                /* If the service worker isn't activated, there's no subscription to look for */
                return false;
            }
            const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
            const pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
            if (!pushSubscription) {
                /* Not subscribed to web push */
                return false;
            }
            if (!pushSubscription.expirationTime) {
                /* No push subscription expiration time */
                return false;
            }
            let { createdAt: subscriptionCreatedAt } = await Database.getSubscription();
            if (!subscriptionCreatedAt) {
                /* If we don't have a record of when the subscription was created, set it into the future to
                guarantee expiration and obtain a new subscription */
                const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;
                subscriptionCreatedAt = new Date().getTime() + ONE_YEAR;
            }
            const midpointExpirationTime = subscriptionCreatedAt + ((pushSubscription.expirationTime - subscriptionCreatedAt) / 2);
            return pushSubscription.expirationTime && (
            /* The current time (in UTC) is past the expiration time (also in UTC) */
            new Date().getTime() >= pushSubscription.expirationTime ||
                new Date().getTime() >= midpointExpirationTime);
        }
        /**
         * Returns an object describing the user's actual push subscription state and opt-out status.
         */
        async getSubscriptionState() {
            const windowEnv = SdkEnvironment.getWindowEnv();
            switch (windowEnv) {
                case WindowEnvironmentKind.ServiceWorker:
                    const pushSubscription = await self.registration.pushManager.getSubscription();
                    const { optedOut } = await Database.getSubscription();
                    return {
                        subscribed: !!pushSubscription,
                        optedOut: optedOut
                    };
                default:
                    /* Regular browser window environments */
                    const integration = await SdkEnvironment.getIntegration();
                    switch (integration) {
                        case IntegrationKind.Secure:
                            return this.getSubscriptionStateForSecure();
                        case IntegrationKind.SecureProxy:
                            switch (windowEnv) {
                                case WindowEnvironmentKind.OneSignalProxyFrame:
                                case WindowEnvironmentKind.OneSignalSubscriptionPopup:
                                case WindowEnvironmentKind.OneSignalSubscriptionModal:
                                    return this.getSubscriptionStateForSecure();
                                default:
                                    /* Re-run this command in the proxy frame */
                                    const proxyFrameHost = OneSignal.proxyFrameHost;
                                    const pushSubscriptionState = await proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.GET_SUBSCRIPTION_STATE);
                                    return pushSubscriptionState;
                            }
                        case IntegrationKind.InsecureProxy:
                            return await this.getSubscriptionStateForInsecure();
                        default:
                            throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
                    }
            }
        }
        async getSubscriptionStateForSecure() {
            const { deviceId, subscriptionToken, optedOut } = await Database.getSubscription();
            const workerState = await this.context.serviceWorkerManager.getActiveState();
            const workerRegistration = await navigator.serviceWorker.getRegistration();
            const notificationPermission = await this.context.permissionManager.getNotificationPermission(this.context.appConfig.safariWebId);
            const isWorkerActive = (workerState === ServiceWorkerActiveState.WorkerA ||
                workerState === ServiceWorkerActiveState.WorkerB);
            if (!workerRegistration) {
                /* You can't be subscribed without a service worker registration */
                return {
                    subscribed: false,
                    optedOut: optedOut,
                };
            }
            const pushSubscription = await workerRegistration.pushManager.getSubscription();
            const isPushEnabled = !!(pushSubscription &&
                deviceId && deviceId &&
                notificationPermission === NotificationPermission.Granted &&
                isWorkerActive);
            return {
                subscribed: isPushEnabled,
                optedOut: optedOut,
            };
        }
        async getSubscriptionStateForInsecure() {
            /* For HTTP, we need to rely on stored values; we never have access to the actual data */
            const { deviceId, subscriptionToken, optedOut } = await Database.getSubscription();
            const notificationPermission = await this.context.permissionManager.getNotificationPermission(this.context.appConfig.safariWebId);
            const isPushEnabled = !!(deviceId && deviceId &&
                subscriptionToken &&
                notificationPermission === NotificationPermission.Granted);
            return {
                subscribed: isPushEnabled,
                optedOut: optedOut,
            };
        }
    }

    class DynamicResourceLoader {
        constructor() {
            this.cache = {};
        }
        getCache() {
            // Cache is private; return a cloned copy just for testing
            return { ...this.cache };
        }
        async loadSdkStylesheet() {
            const originForEnv = SdkEnvironment.getOneSignalApiUrl().origin;
            return await this.loadIfNew(0 /* Stylesheet */, new URL(`${originForEnv}/sdks/OneSignalSDKStyles.css?v=${Environment.getSdkStylesVersionHash()}`));
        }
        async loadFetchPolyfill() {
            return await this.loadIfNew(1 /* Script */, new URL('https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.3/fetch.min.js'));
        }
        /**
         * Attempts to load a resource by adding it to the document's <head>.
         * Caches any previous load attempt's result and does not retry loading a previous resource.
         */
        async loadIfNew(type, url) {
            // Load for first time
            if (!this.cache[url.toString()]) {
                this.cache[url.toString()] = DynamicResourceLoader.load(type, url);
            }
            // Resource is loading; multiple calls can be made to this while the same resource is loading
            // Waiting on the Promise is what we want here
            return await this.cache[url.toString()];
        }
        /**
         * Attempts to load a resource by adding it to the document's <head>.
         * Each call creates a new DOM element and fetch attempt.
         */
        static async load(type, url) {
            try {
                await new Promise((resolve, reject) => {
                    switch (type) {
                        case 1 /* Script */:
                            var domElement = document.createElement('script');
                            domElement.setAttribute('type', 'text/javascript');
                            domElement.setAttribute('async', 'async');
                            domElement.setAttribute('src', url.toString());
                            break;
                        case 0 /* Stylesheet */:
                            var domElement = document.createElement('link');
                            domElement.setAttribute('rel', 'stylesheet');
                            domElement.setAttribute('href', url.toString());
                            break;
                    }
                    domElement.onerror = reject;
                    domElement.onload = resolve;
                    document.querySelector('head').appendChild(domElement);
                });
                return 0 /* Loaded */;
            }
            catch (e) {
                return 1 /* Failed */;
            }
        }
    }

    class CookieSyncer {
        constructor(context, isFeatureEnabled) {
            this.context = context;
            this.isFeatureEnabled = isFeatureEnabled;
        }
        get PUBLISHER_ID() {
            const defaultId = "os!os";
            try {
                const appId = this.context.appConfig.appId;
                const truncatedAppId = appId.replace(/-/g, '').substr(0, 15).toLowerCase();
                return `os!${truncatedAppId}`;
            }
            catch (e) {
                return defaultId;
            }
        }
        static get SDK_URL() {
            const url = new URL("https://cdn.tynt.com/afx.js");
            url.protocol = window.location.protocol;
            return url;
        }
        install() {
            if (!this.isFeatureEnabled) {
                Log.debug('Cookie sync feature is disabled.');
                return;
            }
            if (window.top !== window) {
                /* This cookie integration can only be injected into the top frame, so that it's targeting the intended site. */
                return;
            }
            window.Tynt = window.Tynt || [];
            window.Tynt.push(this.PUBLISHER_ID);
            this.context.dynamicResourceLoader.loadIfNew(1 /* Script */, CookieSyncer.SDK_URL);
            Log.debug('Enabled cookie sync feature.');
        }
    }

    class SessionManager {
        getPageViewCount() {
            try {
                /*
                  sessionStorage may be supported by the browser but may not be available
                  as an API in incognito mode and in cases where the user disables
                  third-party cookies on some browsers.
                 */
                const pageViewCountStr = sessionStorage.getItem(SessionManager.SESSION_STORAGE_KEY_NAME);
                const pageViewCount = parseInt(pageViewCountStr);
                if (isNaN(pageViewCount)) {
                    return 0;
                }
                else {
                    return pageViewCount;
                }
            }
            catch (e) {
                /*
                  If we're in incognito mode or sessionStorage is otherwise unsupported,
                  pretend we're starting our first session.
                 */
                return 0;
            }
        }
        setPageViewCount(sessionCount) {
            try {
                sessionStorage.setItem(SessionManager.SESSION_STORAGE_KEY_NAME, sessionCount.toString());
                if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.OneSignalSubscriptionPopup) {
                    // If we're setting sessionStorage and we're in an Popup, we need to also set sessionStorage on the
                    // main page
                    if (OneSignal.subscriptionPopup) {
                        OneSignal.subscriptionPopup.message(OneSignal.POSTMAM_COMMANDS.SET_SESSION_COUNT);
                    }
                }
            }
            catch (e) {
                /*
                  If sessionStorage isn't available, don't error.
                 */
            }
        }
        /**
         * Increments the session count at most once for the current page view.
         *
         * A flag is set to prevent incrementing the session count more than once for
         * the current page view. If the page is refreshed, this in-memory variable
         * will be automatically reset. Because of this, regardless of the number of
         * times this method is called on the current page view, the page view count
         * will only be incremented once.
         */
        incrementPageViewCount() {
            if (this.incrementedPageViewCount) {
                // For this method, we don't want to increment the session count more than
                // once per pageview
                return;
            }
            const newCount = this.getPageViewCount() + 1;
            this.setPageViewCount(newCount);
            Log.debug(`Incremented page view count to ${newCount}.`);
            this.incrementedPageViewCount = true;
        }
        simulatePageNavigationOrRefresh() {
            this.incrementedPageViewCount = false;
        }
        /**
         * Returns true if this page is running OneSignal for the first time and has
         * not been navigated or refreshed.
         */
        isFirstPageView() {
            return this.getPageViewCount() === 1;
        }
    }
    SessionManager.SESSION_STORAGE_KEY_NAME = 'onesignal-pageview-count';

    /**
     * A permission manager to consolidate the different quirks of obtaining and evaluating permissions
     * across Safari, Chrome, and Firefox.
     */
    class PermissionManager {
        static get STORED_PERMISSION_KEY() {
            return 'storedNotificationPermission';
        }
        /**
         * Returns an interpreted version of the browser's notification permission.
         *
         * On some environments, it isn't possible to obtain the actual notification
         * permission. For example, starting with Chrome 62+, cross-origin iframes and
         * insecure origins can no longer accurately detect the default notification
         * permission state.
         *
         * For cross-origin iframes, returned permissions are correct except that
         * "denied" is returned instead of "default".
         *
         * For insecure origins, returned permissions are always "denied". This
         * differs from cross-origin iframes where the cross-origin iframes are
         * acurrate if returning "granted", but insecure origins will always return
         * "denied" regardless of the actual permission.
         *
         * This method therefore returns the notification permission best suited for
         * our SDK, and it may not always be accurate. On most environments (i.e. not
         * Chrome 62+), the returned permission will be accurate.
         *
         * @param safariWebId The Safari web ID necessary to access the permission
         * state on Safari.
         */
        async getNotificationPermission(safariWebId) {
            const reportedPermission = await this.getReportedNotificationPermission(safariWebId);
            if (await this.isPermissionEnvironmentAmbiguous(reportedPermission)) {
                return this.getInterpretedAmbiguousPermission(reportedPermission);
            }
            else {
                return reportedPermission;
            }
        }
        /**
         * Returns the browser's actual notification permission as reported without any modifications.
         *
         * One challenge is determining the frame context our permission query needs to run in:
         *
         *   - For a regular top-level HTTPS site, query our current top-level frame
         *
         *   - For a custom web push setup in a child HTTPS iframe, query our current child iframe (even
         *     though the returned permission is ambiguous on Chrome 62+ if our origin is different from
         *     that of the top-level frame)
         *
         *   - For a regular HTTP site, query OneSignal's child subdomain.os.tc or subdomain.onesignal.com
         *     iframe
         *
         *   - For a regular HTTP site embedded in a child iframe, still query the nested child's
         *     OneSignal subdomain.os.tc or subdomain.onesignal.com iframe
         *
         * This simplifies into determining whether the web push setup is using OneSignal's subdomain. If
         * not, we assume the current frame context, regardless of whether it is a child or top-level
         * frame, is the current context to run the permission query in.
         *
         * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
         */
        async getReportedNotificationPermission(safariWebId) {
            if (bowser.safari) {
                return this.getSafariNotificationPermission(safariWebId);
            }
            else {
                // Is this web push setup using subdomain.os.tc or subdomain.onesignal.com?
                const isUsingOneSignalSubdomain = await SubscriptionHelper.isUsingSubscriptionWorkaround();
                if (isUsingOneSignalSubdomain) {
                    /*
                      Our target permission for HTTP sites lives on the subdomain.os.tc origin. To ask the iframe
                      for its notification permission state, it must first be loaded.
                     */
                    await awaitOneSignalInitAndSupported();
                    return this.getOneSignalSubdomainNotificationPermission(safariWebId);
                }
                else {
                    return this.getW3cNotificationPermission();
                }
            }
        }
        /**
         * Returns the Safari browser's notification permission as reported by the browser.
         *
         * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
         */
        getSafariNotificationPermission(safariWebId) {
            if (safariWebId) {
                return window.safari.pushNotification.permission(safariWebId).permission;
            }
            else {
                throw new InvalidArgumentError('safariWebId', InvalidArgumentReason.Empty);
            }
        }
        /**
         * Returns the notification permission as reported by the browser for non-Safari browsers. This
         * includes Chrome, Firefox, Opera, Yandex, and every browser following the Notification API
         * standard.
         */
        getW3cNotificationPermission() {
            return window.Notification.permission;
        }
        /**
         * Returns the notification permission as reported by the browser for the OneSignal subdomain
         * iframe.
         *
         * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
         */
        getOneSignalSubdomainNotificationPermission(safariWebId) {
            return new Promise(resolve => {
                OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, { safariWebId: safariWebId }, reply => {
                    let remoteNotificationPermission = reply.data;
                    resolve(remoteNotificationPermission);
                });
            });
        }
        /**
         * To interpret the browser's reported notification permission, we need to know whether we're in
         * an environment where the returned permission should be treated ambiguously.
         *
         * The reported permission should only be treated ambiguously if:
         *
         *   - We're not on Safari or Firefox (Chromium, Chrome, Opera, and Yandex will all eventually
         *     share the same Chrome 62+ codebase)
         *
         *   - And the reported permission is "denied"
         *
         *   - And the current frame context is either a cross-origin iframe or insecure
         */
        async isPermissionEnvironmentAmbiguous(permission) {
            // For testing purposes, allows changing the browser user agent
            const browser = redetectBrowserUserAgent();
            return (!browser.safari &&
                !browser.firefox &&
                permission === NotificationPermission.Denied &&
                (this.isCurrentFrameContextCrossOrigin() ||
                    await SubscriptionHelper.isFrameContextInsecure() ||
                    SubscriptionHelper.isUsingSubscriptionWorkaround() ||
                    SubscriptionHelper.isInsecureOrigin()));
        }
        /**
         * Returns true if we're a cross-origin iframe.
         *
         * This means:
         *
         *   - We're not the top-level frame
         *   - We're unable to access to the top-level frame's origin, or we can access the origin but it
         *     is different. On most browsers, accessing the top-level origin should throw an exception.
         */
        isCurrentFrameContextCrossOrigin() {
            let topFrameOrigin;
            try {
                // Accessing a cross-origin top-level frame's origin should throw an error
                topFrameOrigin = window.top.location.origin;
            }
            catch (e) {
                // We're in a cross-origin child iframe
                return true;
            }
            return window.top !== window &&
                topFrameOrigin !== window.location.origin;
        }
        /**
         * To workaround Chrome 62+'s permission ambiguity for "denied" permissions,
         * we assume the permission is "default" until we actually record the
         * permission being "denied" or "granted".
         *
         * This allows our best-effort approach to subscribe new users, and upon
         * subscribing, if we discover the actual permission to be denied, we record
         * this for next time.
         *
         * @param reportedPermission The notification permission as reported by the
         * browser without any modifications.
         */
        async getInterpretedAmbiguousPermission(reportedPermission) {
            switch (reportedPermission) {
                case NotificationPermission.Denied:
                    const storedPermission = await this.getStoredPermission();
                    if (storedPermission) {
                        // If we've recorded the last known actual browser permission, return that
                        return storedPermission;
                    }
                    else {
                        // If we don't have any stored permission, assume default
                        return NotificationPermission.Default;
                    }
                default:
                    return reportedPermission;
            }
        }
        async getStoredPermission() {
            return await Database.get('Options', PermissionManager.STORED_PERMISSION_KEY);
        }
        async setStoredPermission(permission) {
            await Database.put('Options', { key: PermissionManager.STORED_PERMISSION_KEY, value: permission });
        }
        async updateStoredPermission() {
            const permission = await this.getNotificationPermission(null);
            return await this.setStoredPermission(permission);
        }
    }

    class MetricEngagement {
    }
    var ApiUsageMetricKind;
    (function (ApiUsageMetricKind) {
        ApiUsageMetricKind["HttpPermissionRequest"] = "HttpPermissionRequest";
    })(ApiUsageMetricKind || (ApiUsageMetricKind = {}));
    class PageViewMetricEngagement extends MetricEngagement {
        constructor() {
            super();
        }
        getProfileName() {
            return "all_websites";
        }
        getDateUtc() {
            const date = new Date();
            return `${date.getUTCMonth() + 1}_${date.getUTCDate()}_${date.getUTCFullYear()}`;
        }
        getOperationData() {
            const payload = {
                $add: {},
                $ignore_time: true
            };
            payload[`$add`][`pageview_${this.getDateUtc()}`] = 1;
            return payload;
        }
    }
    class MetricsManager {
        constructor(isFeatureEnabled, mixpanelReportingToken) {
            this.isFeatureEnabled = isFeatureEnabled;
            this.mixpanelReportingToken = mixpanelReportingToken;
        }
        static get MIXPANEL_REPORTING_URL() {
            return 'https://api.mixpanel.com';
        }
        isEnabled() {
            return this.isFeatureEnabled && !!this.mixpanelReportingToken;
        }
        reportEvent(event) {
            if (!this.isEnabled()) {
                return Promise.resolve(null);
            }
            const queryParamsData = {
                event: event.getEventName(),
                properties: {
                    token: this.mixpanelReportingToken,
                    ...event.getPropertiesAsJson()
                }
            };
            const queryParams = base64Encode(JSON.stringify(queryParamsData));
            const requestOptions = {
                method: 'GET',
                headers: new Headers(),
                cache: 'no-cache',
            };
            return fetch(`${MetricsManager.MIXPANEL_REPORTING_URL}/track/?data=${queryParams}`, requestOptions);
        }
        reportEngagement(engagement) {
            if (!this.isEnabled()) {
                return Promise.resolve(null);
            }
            let queryParamsData = {
                $token: this.mixpanelReportingToken,
                $distinct_id: engagement.getProfileName(),
            };
            queryParamsData = { ...queryParamsData, ...engagement.getOperationData() };
            const queryParams = base64Encode(JSON.stringify(queryParamsData));
            const requestOptions = {
                method: 'GET',
                headers: new Headers(),
                cache: 'no-cache',
            };
            return fetch(`${MetricsManager.MIXPANEL_REPORTING_URL}/engage/?data=${queryParams}`, requestOptions);
        }
        shouldCollectPageView() {
            const date = new Date();
            return ((date.getUTCMonth() + 1) <= 2 &&
                date.getUTCDate() <= 10 &&
                date.getUTCFullYear() <= 2018 &&
                (date.getUTCMonth() + 1) >= 2 &&
                date.getUTCDate() >= 8 &&
                date.getUTCFullYear() >= 2018);
        }
        reportPageView() {
            // Collect for a couple days from feature release date
            if (this.shouldCollectPageView()) {
                this.reportEngagement(new PageViewMetricEngagement());
            }
        }
    }

    class Context {
        constructor(appConfig) {
            this.appConfig = appConfig;
            this.cookieSyncer = new CookieSyncer(this, appConfig.cookieSyncEnabled);
            this.subscriptionManager = new SubscriptionManager(this, {
                safariWebId: appConfig.safariWebId,
                appId: appConfig.appId,
                vapidPublicKey: appConfig.vapidPublicKey,
                onesignalVapidPublicKey: appConfig.onesignalVapidPublicKey,
            });
            const serviceWorkerManagerConfig = {
                workerAPath: new Path('/' + SdkEnvironment.getBuildEnvPrefix() + 'OneSignalSDKWorker.js'),
                workerBPath: new Path('/' + SdkEnvironment.getBuildEnvPrefix() + 'OneSignalSDKUpdaterWorker.js'),
                registrationOptions: { scope: '/' }
            };
            if (appConfig.userConfig) {
                if (appConfig.userConfig.path) {
                    serviceWorkerManagerConfig.workerAPath = new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerPath);
                    serviceWorkerManagerConfig.workerBPath = new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerUpdaterPath);
                }
                if (appConfig.userConfig.serviceWorkerParam) {
                    serviceWorkerManagerConfig.registrationOptions = appConfig.userConfig.serviceWorkerParam;
                }
            }
            this.serviceWorkerManager = new ServiceWorkerManager(this, serviceWorkerManagerConfig);
            this.workerMessenger = new WorkerMessenger(this);
            this.dynamicResourceLoader = new DynamicResourceLoader();
            this.sessionManager = new SessionManager();
            this.permissionManager = new PermissionManager();
            this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
        }
    }

    var ConfigIntegrationKind;
    (function (ConfigIntegrationKind) {
        ConfigIntegrationKind["TypicalSite"] = "typical";
        ConfigIntegrationKind["WordPress"] = "wordpress";
        ConfigIntegrationKind["Shopify"] = "shopify";
        ConfigIntegrationKind["Blogger"] = "blogger";
        ConfigIntegrationKind["Magento"] = "magento";
        ConfigIntegrationKind["Drupal"] = "drupal";
        ConfigIntegrationKind["SquareSpace"] = "squarespace";
        ConfigIntegrationKind["Joomla"] = "joomla";
        ConfigIntegrationKind["Weebly"] = "weebly";
        ConfigIntegrationKind["Wix"] = "wix";
        ConfigIntegrationKind["Custom"] = "custom";
    })(ConfigIntegrationKind || (ConfigIntegrationKind = {}));
    var NotificationClickMatchBehavior;
    (function (NotificationClickMatchBehavior) {
        NotificationClickMatchBehavior["Exact"] = "exact";
        NotificationClickMatchBehavior["Origin"] = "origin";
    })(NotificationClickMatchBehavior || (NotificationClickMatchBehavior = {}));
    var NotificationClickActionBehavior;
    (function (NotificationClickActionBehavior) {
        NotificationClickActionBehavior["Navigate"] = "navigate";
        NotificationClickActionBehavior["Focus"] = "focus";
    })(NotificationClickActionBehavior || (NotificationClickActionBehavior = {}));

    var ObjectType;
    (function (ObjectType) {
        ObjectType[ObjectType["Boolean"] = 0] = "Boolean";
        ObjectType[ObjectType["Text"] = 1] = "Text";
        ObjectType[ObjectType["Number"] = 2] = "Number";
    })(ObjectType || (ObjectType = {}));
    var IntegrationConfigurationKind;
    (function (IntegrationConfigurationKind) {
        /**
         * Configuration comes from the dashboard only.
         */
        IntegrationConfigurationKind[IntegrationConfigurationKind["Dashboard"] = 0] = "Dashboard";
        /**
         * Configuration comes from user-provided JavaScript code only.
         */
        IntegrationConfigurationKind[IntegrationConfigurationKind["JavaScript"] = 1] = "JavaScript";
    })(IntegrationConfigurationKind || (IntegrationConfigurationKind = {}));
    /**
     * Handles downloading settings from OneSignal and performing any other initialization-related tasks.
     */
    class ConfigManager {
        /**
         * Downloads configuration from the OneSignal dashboard, merges it with user-supplied configuration from JavaScript
         * code, and returns Web SDK-specific configuration.
         */
        async getAppConfig(userConfig) {
            try {
                const serverConfig = await OneSignalApi.downloadServerAppConfig(userConfig.appId);
                const appConfig = this.getMergedConfig(userConfig, serverConfig);
                if (appConfig.restrictedOriginEnabled) {
                    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
                        if (window.top === window &&
                            !contains(window.location.hostname, ".os.tc") &&
                            !contains(window.location.hostname, ".onesignal.com") &&
                            !this.doesCurrentOriginMatchConfigOrigin(appConfig.origin)) {
                            throw new SdkInitError(SdkInitErrorKind.WrongSiteUrl, {
                                siteUrl: appConfig.origin
                            });
                        }
                    }
                }
                return appConfig;
            }
            catch (e) {
                if (e) {
                    if (e.code === 1) {
                        throw new SdkInitError(SdkInitErrorKind.InvalidAppId);
                    }
                    else if (e.code === 2) {
                        throw new SdkInitError(SdkInitErrorKind.AppNotConfiguredForWebPush);
                    }
                }
                throw e;
            }
        }
        doesCurrentOriginMatchConfigOrigin(configOrigin) {
            try {
                return location.origin === new URL(configOrigin).origin;
            }
            catch (e) {
                return false;
            }
        }
        getIntegrationCapabilities(integration) {
            switch (integration) {
                case ConfigIntegrationKind.Custom:
                case ConfigIntegrationKind.WordPress:
                    return {
                        configuration: IntegrationConfigurationKind.JavaScript,
                    };
                default:
                    return {
                        configuration: IntegrationConfigurationKind.Dashboard,
                    };
            }
        }
        /**
         * Merges configuration downloaded from the OneSignal dashboard with user-provided JavaScript configuration to produce
         * a final web SDK-specific configuration.
         */
        getMergedConfig(userConfig, serverConfig) {
            const configIntegrationKind = this.getConfigIntegrationKind(serverConfig);
            return {
                appId: serverConfig.app_id,
                subdomain: this.getSubdomainForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
                origin: serverConfig.config.origin,
                httpUseOneSignalCom: serverConfig.config.http_use_onesignal_com,
                cookieSyncEnabled: serverConfig.features.cookie_sync.enable,
                restrictedOriginEnabled: serverConfig.features.restrict_origin && serverConfig.features.restrict_origin.enable,
                metrics: {
                    enable: serverConfig.features.metrics.enable,
                    mixpanelReportingToken: serverConfig.features.metrics.mixpanel_reporting_token
                },
                safariWebId: serverConfig.config.safari_web_id,
                vapidPublicKey: serverConfig.config.vapid_public_key,
                onesignalVapidPublicKey: serverConfig.config.onesignal_vapid_public_key,
                emailAuthRequired: serverConfig.features.email && serverConfig.features.email.require_auth,
                userConfig: this.getUserConfigForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
            };
        }
        getConfigIntegrationKind(serverConfig) {
            if (serverConfig.config.integration) {
                return serverConfig.config.integration.kind;
            }
            else {
                return ConfigIntegrationKind.Custom;
            }
        }
        getUserConfigForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig) {
            const integrationCapabilities = this.getIntegrationCapabilities(configIntegrationKind);
            switch (integrationCapabilities.configuration) {
                case IntegrationConfigurationKind.Dashboard:
                    /*
                      Ignores code-based initialization configuration and uses dashboard configuration only.
                     */
                    return {
                        appId: serverConfig.app_id,
                        autoRegister: false,
                        path: serverConfig.config.serviceWorker.path,
                        serviceWorkerPath: serverConfig.config.serviceWorker.workerName,
                        serviceWorkerUpdaterPath: serverConfig.config.serviceWorker.updaterWorkerName,
                        serviceWorkerParam: { scope: serverConfig.config.serviceWorker.registrationScope },
                        subdomainName: serverConfig.config.siteInfo.proxyOrigin,
                        promptOptions: {
                            slidedown: {
                                autoPrompt: serverConfig.config.staticPrompts.slidedown.enabled,
                                actionMessage: serverConfig.config.staticPrompts.slidedown.actionMessage,
                                acceptButtonText: serverConfig.config.staticPrompts.slidedown.acceptButton,
                                cancelButtonText: serverConfig.config.staticPrompts.slidedown.cancelButton
                            },
                            fullscreen: {
                                actionMessage: serverConfig.config.staticPrompts.fullscreen.actionMessage,
                                acceptButton: serverConfig.config.staticPrompts.fullscreen.acceptButton,
                                cancelButton: serverConfig.config.staticPrompts.fullscreen.cancelButton,
                                title: serverConfig.config.staticPrompts.fullscreen.title,
                                message: serverConfig.config.staticPrompts.fullscreen.message,
                                caption: serverConfig.config.staticPrompts.fullscreen.caption,
                                autoAcceptTitle: serverConfig.config.staticPrompts.fullscreen.autoAcceptTitle,
                            }
                        },
                        welcomeNotification: {
                            disable: !serverConfig.config.welcomeNotification.enable,
                            title: serverConfig.config.welcomeNotification.title,
                            message: serverConfig.config.welcomeNotification.message,
                            url: serverConfig.config.welcomeNotification.url
                        },
                        notifyButton: {
                            enable: serverConfig.config.staticPrompts.bell.enabled,
                            displayPredicate: serverConfig.config.staticPrompts.bell.hideWhenSubscribed ?
                                () => {
                                    return OneSignal.isPushNotificationsEnabled()
                                        .then(isPushEnabled => {
                                        /* The user is subscribed, so we want to return "false" to hide the notify button */
                                        return !isPushEnabled;
                                    });
                                } :
                                null,
                            size: serverConfig.config.staticPrompts.bell.size,
                            position: serverConfig.config.staticPrompts.bell.location,
                            showCredit: false,
                            offset: {
                                bottom: serverConfig.config.staticPrompts.bell.offset.bottom + 'px',
                                left: serverConfig.config.staticPrompts.bell.offset.left + 'px',
                                right: serverConfig.config.staticPrompts.bell.offset.right + 'px'
                            },
                            colors: {
                                'circle.background': serverConfig.config.staticPrompts.bell.color.main,
                                'circle.foreground': serverConfig.config.staticPrompts.bell.color.accent,
                                'badge.background': 'black',
                                'badge.foreground': 'white',
                                'badge.bordercolor': 'black',
                                'pulse.color': serverConfig.config.staticPrompts.bell.color.accent,
                                'dialog.button.background.hovering': serverConfig.config.staticPrompts.bell.color.main,
                                'dialog.button.background.active': serverConfig.config.staticPrompts.bell.color.main,
                                'dialog.button.background': serverConfig.config.staticPrompts.bell.color.main,
                                'dialog.button.foreground': 'white',
                            },
                            text: {
                                'tip.state.unsubscribed': serverConfig.config.staticPrompts.bell.tooltip.unsubscribed,
                                'tip.state.subscribed': serverConfig.config.staticPrompts.bell.tooltip.subscribed,
                                'tip.state.blocked': serverConfig.config.staticPrompts.bell.tooltip.blocked,
                                'message.prenotify': "Click to subscribe to notifications",
                                'message.action.subscribed': serverConfig.config.staticPrompts.bell.message.subscribing,
                                'message.action.resubscribed': serverConfig.config.staticPrompts.bell.message.subscribing,
                                'message.action.unsubscribed': serverConfig.config.staticPrompts.bell.message.unsubscribing,
                                'dialog.main.title': serverConfig.config.staticPrompts.bell.dialog.main.title,
                                'dialog.main.button.subscribe': serverConfig.config.staticPrompts.bell.dialog.main.subscribeButton,
                                'dialog.main.button.unsubscribe': serverConfig.config.staticPrompts.bell.dialog.main.unsubscribeButton,
                                'dialog.blocked.title': serverConfig.config.staticPrompts.bell.dialog.blocked.title,
                                'dialog.blocked.message': serverConfig.config.staticPrompts.bell.dialog.blocked.message,
                            }
                        },
                        persistNotification: serverConfig.config.notificationBehavior.display.persist,
                        webhooks: {
                            cors: serverConfig.config.webhooks.corsEnable,
                            'notification.displayed': serverConfig.config.webhooks.notificationDisplayedHook,
                            'notification.clicked': serverConfig.config.webhooks.notificationClickedHook,
                            'notification.dismissed': serverConfig.config.webhooks.notificationDismissedHook,
                        },
                        notificationClickHandlerMatch: serverConfig.config.notificationBehavior.click.match,
                        notificationClickHandlerAction: serverConfig.config.notificationBehavior.click.action,
                        allowLocalhostAsSecureOrigin: serverConfig.config.setupBehavior.allowLocalhostAsSecureOrigin
                    };
                case IntegrationConfigurationKind.JavaScript:
                    /*
                      Ignores dashboard configuration and uses code-based configuration only.
                    */
                    return {
                        ...userConfig,
                        ...{
                            serviceWorkerParam: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_PARAM
                                ? OneSignal.SERVICE_WORKER_PARAM
                                : { scope: '/' },
                            serviceWorkerPath: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_PATH
                                ? OneSignal.SERVICE_WORKER_PATH
                                : 'OneSignalSDKWorker.js',
                            serviceWorkerUpdaterPath: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_UPDATER_PATH
                                ? OneSignal.SERVICE_WORKER_UPDATER_PATH
                                : 'OneSignalSDUpdaterKWorker.js',
                            path: !!userConfig.path ? userConfig.path : '/'
                        }
                    };
            }
        }
        /**
         * Describes how to merge a dashboard-set subdomain with a/lack of user-supplied subdomain.
         */
        getSubdomainForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig) {
            const integrationCapabilities = this.getIntegrationCapabilities(configIntegrationKind);
            let userValue = userConfig.subdomainName;
            let serverValue = '';
            switch (integrationCapabilities.configuration) {
                case IntegrationConfigurationKind.Dashboard:
                    serverValue = serverConfig.config.siteInfo.proxyOriginEnabled ?
                        serverConfig.config.siteInfo.proxyOrigin :
                        undefined;
                    break;
                case IntegrationConfigurationKind.JavaScript:
                    serverValue = serverConfig.config.subdomain;
                    break;
            }
            if (serverValue && !this.shouldUseServerConfigSubdomain(userValue, integrationCapabilities)) {
                return undefined;
            }
            else {
                return serverValue;
            }
        }
        shouldUseServerConfigSubdomain(userProvidedSubdomain, capabilities) {
            switch (capabilities.configuration) {
                case IntegrationConfigurationKind.Dashboard:
                    /*
                      Dashboard config using the new web config editor always takes precedence.
                     */
                    return true;
                case IntegrationConfigurationKind.JavaScript:
                    /*
                     * An HTTPS site may be using either a native push integration or a fallback
                     * subdomain integration. Our SDK decides the integration based on whether
                     * init option subdomainName appears and the site's protocol.
                     *
                     * To avoid having developers write JavaScript to customize the SDK,
                     * configuration properties like subdomainName are downloaded on page start.
                     *
                     * New developers setting up web push can omit subdomainName, but existing
                     * developers already having written code to configure OneSignal aren't
                     * removing their code.
                     *
                     * When an HTTPS site is configured with a subdomain on the server-side, we do
                     * not apply it even though we've downloaded this configuration unless the
                     * user also declares it manually in their initialization code.
                     */
                    switch (location.protocol) {
                        case 'https:':
                            return !!userProvidedSubdomain;
                        case 'http:':
                            return true;
                        default:
                            return false;
                    }
            }
        }
    }

    /**
     * The main service worker script fetching and displaying notifications to users in the background even when the client
     * site is not running. The worker is registered via the navigator.serviceWorker.register() call after the user first
     * allows notification permissions, and is a pre-requisite to subscribing for push notifications.
     *
     * For HTTPS sites, the service worker is registered site-wide at the top-level scope. For HTTP sites, the service
     * worker is registered to the iFrame pointing to subdomain.onesignal.com.
     */
    class ServiceWorker {
        /**
         * An incrementing integer defined in package.json. Value doesn't matter as long as it's different from the
         * previous version.
         */
        static get VERSION() {
            return Environment.version();
        }
        /**
         * Describes what context the JavaScript code is running in and whether we're running in local development mode.
         */
        static get environment() {
            return Environment;
        }
        static get log() {
            return Log;
        }
        /**
         * An interface to the browser's IndexedDB.
         */
        static get database() {
            return Database;
        }
        static get sdkEnvironment() {
            return SdkEnvironment;
        }
        /**
         * Describes the current browser name and version.
         */
        static get browser() {
            return bowser;
        }
        /**
         * Allows message passing between this service worker and its controlled clients, or webpages. Controlled
         * clients include any HTTPS site page, or the nested iFrame pointing to OneSignal on any HTTP site. This allows
         * events like notification dismissed, clicked, and displayed to be fired on the clients. It also allows the
         * clients to communicate with the service worker to close all active notifications.
         */
        static get workerMessenger() {
            if (!self.workerMessenger) {
                self.workerMessenger = new WorkerMessenger(null);
            }
            return self.workerMessenger;
        }
        /**
         * Service worker entry point.
         */
        static run() {
            self.addEventListener('push', ServiceWorker.onPushReceived);
            self.addEventListener('notificationclose', ServiceWorker.onNotificationClosed);
            self.addEventListener('notificationclick', event => event.waitUntil(ServiceWorker.onNotificationClicked(event)));
            self.addEventListener('install', ServiceWorker.onServiceWorkerInstalled);
            self.addEventListener('activate', ServiceWorker.onServiceWorkerActivated);
            self.addEventListener('pushsubscriptionchange', (event) => {
                event.waitUntil(ServiceWorker.onPushSubscriptionChange(event));
            });
            /*
              According to
              https://w3c.github.io/ServiceWorker/#run-service-worker-algorithm:
        
              "user agents are encouraged to show a warning that the event listeners
              must be added on the very first evaluation of the worker script."
        
              We have to register our event handler statically (not within an
              asynchronous method) so that the browser can optimize not waking up the
              service worker for events that aren't known for sure to be listened for.
        
              Also see: https://github.com/w3c/ServiceWorker/issues/1156
            */
            Log.debug('Setting up message listeners.');
            // self.addEventListener('message') is statically added inside the listen() method
            ServiceWorker.workerMessenger.listen();
            // Install messaging event handlers for page <-> service worker communication
            ServiceWorker.setupMessageListeners();
        }
        static async getAppId() {
            if (self.location.search) {
                // Successful regex matches are at position 1
                const appId = self.location.search.match(/appId=([0-9a-z-]+)&?/i)[1];
                return appId;
            }
            else {
                const { appId } = await Database.getAppConfig();
                return appId;
            }
        }
        static async setupMessageListeners() {
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.WorkerVersion, _ => {
                Log.debug('[Service Worker] Received worker version message.');
                ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.WorkerVersion, Environment.version());
            });
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.Subscribe, async (appConfigBundle) => {
                const appConfig = appConfigBundle;
                Log.debug('[Service Worker] Received subscribe message.');
                const context = new Context(appConfig);
                const rawSubscription = await context.subscriptionManager.subscribe(0 /* ResubscribeExisting */);
                const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
                ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.Subscribe, subscription.serialize());
            });
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.SubscribeNew, async (appConfigBundle) => {
                const appConfig = appConfigBundle;
                Log.debug('[Service Worker] Received subscribe new message.');
                const context = new Context(appConfig);
                const rawSubscription = await context.subscriptionManager.subscribe(1 /* SubscribeNew */);
                const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
                ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.SubscribeNew, subscription.serialize());
            });
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpSubscriptionState, async (appConfigBundle) => {
                Log.debug('[Service Worker] Received AMP subscription state message.');
                const pushSubscription = await self.registration.pushManager.getSubscription();
                if (!pushSubscription) {
                    ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, false);
                }
                else {
                    const permission = await self.registration.pushManager.permissionState(pushSubscription.options);
                    const { optedOut } = await Database.getSubscription();
                    const isSubscribed = !!pushSubscription && permission === "granted" && optedOut !== true;
                    ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscriptionState, isSubscribed);
                }
            });
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpSubscribe, async () => {
                Log.debug('[Service Worker] Received AMP subscribe message.');
                const appId = await ServiceWorker.getAppId();
                const appConfig = await new ConfigManager().getAppConfig({
                    appId: appId
                });
                const context = new Context(appConfig);
                const rawSubscription = await context.subscriptionManager.subscribe(0 /* ResubscribeExisting */);
                const subscription = await context.subscriptionManager.registerSubscription(rawSubscription);
                ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpSubscribe, subscription.deviceId);
            });
            ServiceWorker.workerMessenger.on(WorkerMessengerCommand.AmpUnsubscribe, async () => {
                Log.debug('[Service Worker] Received AMP unsubscribe message.');
                const appId = await ServiceWorker.getAppId();
                const appConfig = await new ConfigManager().getAppConfig({
                    appId: appId
                });
                const context = new Context(appConfig);
                await context.subscriptionManager.unsubscribe(1 /* MarkUnsubscribed */);
                ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.AmpUnsubscribe, null);
            });
        }
        /**
         * Occurs when a push message is received.
         * This method handles the receipt of a push signal on all web browsers except Safari, which uses the OS to handle
         * notifications.
         */
        static onPushReceived(event) {
            Log.debug(`Called %conPushReceived(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
            event.waitUntil(ServiceWorker.parseOrFetchNotifications(event)
                .then((notifications) => {
                if (!notifications || notifications.length == 0) {
                    Log.debug("Because no notifications were retrieved, we'll display the last known notification, so" +
                        " long as it isn't the welcome notification.");
                    return ServiceWorker.displayBackupNotification();
                }
                //Display push notifications in the order we received them
                let notificationEventPromiseFns = [];
                for (let rawNotification of notifications) {
                    Log.debug('Raw Notification from OneSignal:', rawNotification);
                    let notification = ServiceWorker.buildStructuredNotificationObject(rawNotification);
                    // Never nest the following line in a callback from the point of entering from retrieveNotifications
                    notificationEventPromiseFns.push((notif => {
                        return ServiceWorker.displayNotification(notif)
                            .then(() => ServiceWorker.updateBackupNotification(notif).catch(e => Log.error(e)))
                            .then(() => {
                            return ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDisplayed, notif).catch(e => Log.error(e));
                        })
                            .then(() => ServiceWorker.executeWebhooks('notification.displayed', notif).catch(e => Log.error(e)));
                    }).bind(null, notification));
                }
                return notificationEventPromiseFns.reduce((p, fn) => {
                    return p = p.then(fn);
                }, Promise.resolve());
            })
                .catch(e => {
                Log.debug('Failed to display a notification:', e);
                if (ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS) {
                    Log.debug('Because we have just unsubscribed from notifications, we will not show anything.');
                    return undefined;
                }
                else {
                    Log.debug("Because a notification failed to display, we'll display the last known notification, so long as it isn't the welcome notification.");
                    return ServiceWorker.displayBackupNotification();
                }
            }));
        }
        /**
         * Makes a POST call to a specified URL to forward certain events.
         * @param event The name of the webhook event. Affects the DB key pulled for settings and the final event the user
         *              consumes.
         * @param notification A JSON object containing notification details the user consumes.
         * @returns {Promise}
         */
        static async executeWebhooks(event, notification) {
            const { deviceId } = await Database.getSubscription();
            const isServerCorsEnabled = await Database.get('Options', 'webhooks.cors');
            const webhookTargetUrl = await Database.get('Options', `webhooks.${event}`);
            if (webhookTargetUrl) {
                // JSON.stringify() does not include undefined values
                // Our response will not contain those fields here which have undefined values
                let postData = {
                    event: event,
                    id: notification.id,
                    userId: deviceId,
                    action: notification.action,
                    buttons: notification.buttons,
                    heading: notification.heading,
                    content: notification.content,
                    url: notification.url,
                    icon: notification.icon,
                    data: notification.data
                };
                let fetchOptions = {
                    method: 'post',
                    mode: 'no-cors',
                    body: JSON.stringify(postData),
                };
                if (isServerCorsEnabled) {
                    fetchOptions.mode = 'cors';
                    fetchOptions.headers = {
                        'X-OneSignal-Event': event,
                        'Content-Type': 'application/json'
                    };
                }
                Log.debug(`Executing ${event} webhook ${isServerCorsEnabled ? 'with' : 'without'} CORS %cPOST ${webhookTargetUrl}`, getConsoleStyle('code'), ':', postData);
                return await fetch(webhookTargetUrl, fetchOptions);
            }
        }
        /**
         * Gets an array of active window clients along with whether each window client is the HTTP site's iFrame or an
         * HTTPS site page.
         * An active window client is a browser tab that is controlled by the service worker.
         * Technically, this list should only ever contain clients that are iFrames, or clients that are HTTPS site pages,
         * and not both. This doesn't really matter though.
         * @returns {Promise}
         */
        static async getActiveClients() {
            const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            let activeClients = [];
            for (let client of windowClients) {
                // Test if this window client is the HTTP subdomain iFrame pointing to subdomain.onesignal.com
                if (client.frameType && client.frameType === 'nested') {
                    // Subdomain iFrames point to 'https://subdomain.onesignal.com...'
                    if (!contains(client.url, SdkEnvironment.getOneSignalApiUrl().host) &&
                        !contains(client.url, '.os.tc')) {
                        continue;
                    }
                    // Indicates this window client is an HTTP subdomain iFrame
                    client.isSubdomainIframe = true;
                }
                activeClients.push(client);
            }
            return activeClients;
        }
        /**
         * Constructs a structured notification object from the raw notification fetched from OneSignal's server. This
         * object is passed around from event to event, and is also returned to the host page for notification event details.
         * Constructed in onPushReceived, and passed along to other event handlers.
         * @param rawNotification The raw notification JSON returned from OneSignal's server.
         */
        static buildStructuredNotificationObject(rawNotification) {
            let notification = {
                id: rawNotification.custom.i,
                heading: rawNotification.title,
                content: rawNotification.alert,
                data: rawNotification.custom.a,
                url: rawNotification.custom.u,
                icon: rawNotification.icon,
                image: rawNotification.image,
                tag: rawNotification.tag,
                badge: rawNotification.badge,
                vibrate: rawNotification.vibrate
            };
            // Add action buttons
            if (rawNotification.o) {
                notification.buttons = [];
                for (let rawButton of rawNotification.o) {
                    notification.buttons.push({
                        action: rawButton.i,
                        title: rawButton.n,
                        icon: rawButton.p,
                        url: rawButton.u
                    });
                }
            }
            return trimUndefined(notification);
        }
        /**
         * Given an image URL, returns a proxied HTTPS image using the https://images.weserv.nl service.
         * For a null image, returns null so that no icon is displayed.
         * If the image protocol is HTTPS, or origin contains localhost or starts with 192.168.*.*, we do not proxy the image.
         * @param imageUrl An HTTP or HTTPS image URL.
         */
        static ensureImageResourceHttps(imageUrl) {
            if (imageUrl) {
                try {
                    let parsedImageUrl = new URL(imageUrl);
                    if (parsedImageUrl.hostname === 'localhost' ||
                        parsedImageUrl.hostname.indexOf('192.168') !== -1 ||
                        parsedImageUrl.hostname === '127.0.0.1' ||
                        parsedImageUrl.protocol === 'https:') {
                        return imageUrl;
                    }
                    if (parsedImageUrl.hostname === 'i0.wp.com' ||
                        parsedImageUrl.hostname === 'i1.wp.com' ||
                        parsedImageUrl.hostname === 'i2.wp.com' ||
                        parsedImageUrl.hostname === 'i3.wp.com') {
                        /* Their site already uses Jetpack, just make sure Jetpack is HTTPS */
                        return `https://${parsedImageUrl.hostname}${parsedImageUrl.pathname}`;
                    }
                    /* HTTPS origin hosts can be used by prefixing the hostname with ssl: */
                    let replacedImageUrl = parsedImageUrl.host + parsedImageUrl.pathname;
                    return `https://i0.wp.com/${replacedImageUrl}`;
                }
                catch (e) { }
            }
            else
                return null;
        }
        /**
         * Given a structured notification object, HTTPS-ifies the notification icons and action button icons, if they exist.
         */
        static ensureNotificationResourcesHttps(notification) {
            if (notification) {
                if (notification.icon) {
                    notification.icon = ServiceWorker.ensureImageResourceHttps(notification.icon);
                }
                if (notification.image) {
                    notification.image = ServiceWorker.ensureImageResourceHttps(notification.image);
                }
                if (notification.buttons && notification.buttons.length > 0) {
                    for (let button of notification.buttons) {
                        if (button.icon) {
                            button.icon = ServiceWorker.ensureImageResourceHttps(button.icon);
                        }
                    }
                }
            }
        }
        /**
         * Actually displays a visible notification to the user.
         * Any event needing to display a notification calls this so that all the display options can be centralized here.
         * @param notification A structured notification object.
         */
        static async displayNotification(notification, overrides) {
            Log.debug(`Called %cdisplayNotification(${JSON.stringify(notification, null, 4)}):`, getConsoleStyle('code'), notification);
            // Use the default title if one isn't provided
            const defaultTitle = await ServiceWorker._getTitle();
            // Use the default icon if one isn't provided
            const defaultIcon = await Database.get('Options', 'defaultIcon');
            // Get option of whether we should leave notification displaying indefinitely
            const persistNotification = await Database.get('Options', 'persistNotification');
            // Get app ID for tag value
            const appId = await ServiceWorker.getAppId();
            notification.heading = notification.heading ? notification.heading : defaultTitle;
            notification.icon = notification.icon ? notification.icon : (defaultIcon ? defaultIcon : undefined);
            var extra = {};
            extra.tag = notification.tag || appId;
            if (persistNotification === 'force') {
                extra.persistNotification = true;
            }
            else {
                extra.persistNotification = persistNotification;
            }
            // Allow overriding some values
            if (!overrides)
                overrides = {};
            notification = { ...notification, ...overrides };
            ServiceWorker.ensureNotificationResourcesHttps(notification);
            let notificationOptions = {
                body: notification.content,
                icon: notification.icon,
                /*
                 On Chrome 56, a large image can be displayed:
                 https://bugs.chromium.org/p/chromium/issues/detail?id=614456
                 */
                image: notification.image,
                /*
                 On Chrome 44+, use this property to store extra information which
                 you can read back when the notification gets invoked from a
                 notification click or dismissed event. We serialize the
                 notification in the 'data' field and read it back in other events.
                 See:
                 https://developers.google.com/web/updates/2015/05/notifying-you-of-changes-to-notifications?hl=en
                 */
                data: notification,
                /*
                 On Chrome 48+, action buttons show below the message body of the
                 notification. Clicking either button takes the user to a link. See:
                 https://developers.google.com/web/updates/2016/01/notification-actions
                 */
                actions: notification.buttons,
                /*
                 Tags are any string value that groups notifications together. Two
                 or notifications sharing a tag replace each other.
                 */
                tag: extra.tag,
                /*
                 On Chrome 47+ (desktop), notifications will be dismissed after 20
                 seconds unless requireInteraction is set to true. See:
                 https://developers.google.com/web/updates/2015/10/notification-requireInteractiom
                 */
                requireInteraction: extra.persistNotification,
                /*
                 On Chrome 50+, by default notifications replacing
                 identically-tagged notifications no longer vibrate/signal the user
                 that a new notification has come in. This flag allows subsequent
                 notifications to re-alert the user. See:
                 https://developers.google.com/web/updates/2016/03/notifications
                 */
                renotify: true,
                /*
                 On Chrome 53+, returns the URL of the image used to represent the
                 notification when there is not enough space to display the
                 notification itself.
          
                 The URL of an image to represent the notification when there is not
                 enough space to display the notification itself such as, for
                 example, the Android Notification Bar. On Android devices, the
                 badge should accommodate devices up to 4x resolution, about 96 by
                 96 px, and the image will be automatically masked.
                 */
                badge: notification.badge,
                /*
                A vibration pattern to run with the display of the notification. A
                vibration pattern can be an array with as few as one member. The
                values are times in milliseconds where the even indices (0, 2, 4,
                etc.) indicate how long to vibrate and the odd indices indicate how
                long to pause. For example [300, 100, 400] would vibrate 300ms,
                pause 100ms, then vibrate 400ms.
                 */
                vibrate: notification.vibrate
            };
            notificationOptions = ServiceWorker.filterNotificationOptions(notificationOptions, persistNotification === 'force');
            return self.registration.showNotification(notification.heading, notificationOptions);
        }
        static filterNotificationOptions(options, forcePersistNotifications) {
            /**
             * Due to Chrome 59+ notifications on Mac OS X using the native toast style
             * which limits the number of characters available to display the subdomain
             * to 14 with requireInteraction and 28 without, we force Mac OS X Chrome
             * notifications to be transient.
             */
            if (typeof options !== "object") {
                return options;
            }
            else {
                const clone = { ...options };
                if (bowser.name === '' && bowser.version === '') {
                    var browser = bowser._detect(navigator.userAgent);
                }
                else {
                    var browser = bowser;
                }
                if (browser.chrome &&
                    browser.mac &&
                    clone) {
                    clone.requireInteraction = false;
                }
                if (forcePersistNotifications) {
                    clone.requireInteraction = true;
                }
                return clone;
            }
        }
        /**
         * Stores the most recent notification into IndexedDB so that it can be shown as a backup if a notification fails
         * to be displayed. This is to avoid Chrome's forced "This site has been updated in the background" message. See
         * this post for more details: http://stackoverflow.com/a/35045513/555547.
         * This is called every time is a push message is received so that the most recent message can be used as the
         * backup notification.
         * @param notification The most recent notification as a structured notification object.
         */
        static async updateBackupNotification(notification) {
            let isWelcomeNotification = notification.data && notification.data.__isOneSignalWelcomeNotification;
            // Don't save the welcome notification, that just looks broken
            if (isWelcomeNotification)
                return;
            await Database.put('Ids', { type: 'backupNotification', id: notification });
        }
        /**
         * Displays a fail-safe notification during a push event in case notification contents could not be retrieved.
         * This is to avoid Chrome's forced "This site has been updated in the background" message. See this post for
         * more details: http://stackoverflow.com/a/35045513/555547.
         */
        static displayBackupNotification() {
            return Database.get('Ids', 'backupNotification')
                .then(backupNotification => {
                let overrides = {
                    // Don't persist our backup notification; users should ideally not see them
                    persistNotification: false,
                    data: { __isOneSignalBackupNotification: true }
                };
                if (backupNotification) {
                    return ServiceWorker.displayNotification(backupNotification, overrides);
                }
                else {
                    return ServiceWorker.displayNotification({
                        content: 'You have new updates.'
                    }, overrides);
                }
            });
        }
        /**
         * Returns false if the given URL matches a few special URLs designed to skip opening a URL when clicking a
         * notification. Otherwise returns true and the link will be opened.
         * @param url
           */
        static shouldOpenNotificationUrl(url) {
            return (url !== 'javascript:void(0);' &&
                url !== 'do_not_open' &&
                !contains(url, '_osp=do_not_open'));
        }
        /**
         * Occurs when a notification is dismissed by the user (clicking the 'X') or all notifications are cleared.
         * Supported on: Chrome 50+ only
         */
        static onNotificationClosed(event) {
            Log.debug(`Called %conNotificationClosed(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
            let notification = event.notification.data;
            ServiceWorker.workerMessenger.broadcast(WorkerMessengerCommand.NotificationDismissed, notification).catch(e => Log.error(e));
            event.waitUntil(ServiceWorker.executeWebhooks('notification.dismissed', notification));
        }
        /**
         * After clicking a notification, determines the URL to open based on whether an action button was clicked or the
         * notification body was clicked.
         */
        static async getNotificationUrlToOpen(notification) {
            // Defaults to the URL the service worker was registered
            // TODO: This should be fixed for HTTP sites
            let launchUrl = self.registration.scope;
            // Use the user-provided default URL if one exists
            const { defaultNotificationUrl: dbDefaultNotificationUrl } = await Database.getAppState();
            if (dbDefaultNotificationUrl)
                launchUrl = dbDefaultNotificationUrl;
            // If the user clicked an action button, use the URL provided by the action button
            // Unless the action button URL is null
            if (notification.action) {
                // Find the URL tied to the action button that was clicked
                for (let button of notification.buttons) {
                    if (button.action === notification.action &&
                        button.url &&
                        button.url !== '') {
                        launchUrl = button.url;
                    }
                }
            }
            else if (notification.url &&
                notification.url !== '') {
                // The user clicked the notification body instead of an action button
                launchUrl = notification.url;
            }
            return launchUrl;
        }
        /**
         * Occurs when the notification's body or action buttons are clicked. Does not occur if the notification is
         * dismissed by clicking the 'X' icon. See the notification close event for the dismissal event.
         */
        static async onNotificationClicked(event) {
            Log.debug(`Called %conNotificationClicked(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
            // Close the notification first here, before we do anything that might fail
            event.notification.close();
            const notification = event.notification.data;
            // Chrome 48+: Get the action button that was clicked
            if (event.action)
                notification.action = event.action;
            let notificationClickHandlerMatch = 'exact';
            let notificationClickHandlerAction = 'navigate';
            const matchPreference = await Database.get('Options', 'notificationClickHandlerMatch');
            if (matchPreference)
                notificationClickHandlerMatch = matchPreference;
            const actionPreference = await this.database.get('Options', 'notificationClickHandlerAction');
            if (actionPreference)
                notificationClickHandlerAction = actionPreference;
            const activeClients = await ServiceWorker.getActiveClients();
            let launchUrl = await ServiceWorker.getNotificationUrlToOpen(notification);
            let notificationOpensLink = ServiceWorker.shouldOpenNotificationUrl(launchUrl);
            /*
             Check if we can focus on an existing tab instead of opening a new url.
             If an existing tab with exactly the same URL already exists, then this existing tab is focused instead of
             an identical new tab being created. With a special setting, any existing tab matching the origin will
             be focused instead of an identical new tab being created.
             */
            let doNotOpenLink = false;
            for (let client of activeClients) {
                let clientUrl = client.url;
                if (client.isSubdomainIframe) {
                    const lastKnownHostUrl = await Database.get('Options', 'lastKnownHostUrl');
                    clientUrl = lastKnownHostUrl;
                    if (!lastKnownHostUrl) {
                        clientUrl = await Database.get('Options', 'defaultUrl');
                    }
                }
                let clientOrigin = '';
                try {
                    clientOrigin = new URL(clientUrl).origin;
                }
                catch (e) {
                    Log.error(`Failed to get the HTTP site's actual origin:`, e);
                }
                let launchOrigin = null;
                try {
                    // Check if the launchUrl is valid; it can be null
                    launchOrigin = new URL(launchUrl).origin;
                }
                catch (e) {
                }
                if ((notificationClickHandlerMatch === 'exact' && clientUrl === launchUrl) ||
                    (notificationClickHandlerMatch === 'origin' && clientOrigin === launchOrigin)) {
                    if ((client['isSubdomainIframe'] && clientUrl === launchUrl) ||
                        (!client['isSubdomainIframe'] && client.url === launchUrl) ||
                        (notificationClickHandlerAction === 'focus' && clientOrigin === launchOrigin)) {
                        ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.NotificationClicked, notification, client);
                        try {
                            await client.focus();
                        }
                        catch (e) {
                            Log.error("Failed to focus:", client, e);
                        }
                    }
                    else {
                        /*
                        We must focus first; once the client navigates away, it may not be to a service worker-controlled page, and
                        the client ID may change, making it unable to focus.
              
                        client.navigate() is available on Chrome 49+ and Firefox 50+.
                         */
                        if (client['isSubdomainIframe']) {
                            try {
                                Log.debug('Client is subdomain iFrame. Attempting to focus() client.');
                                await client.focus();
                            }
                            catch (e) {
                                Log.error("Failed to focus:", client, e);
                            }
                            if (notificationOpensLink) {
                                Log.debug(`Redirecting HTTP site to ${launchUrl}.`);
                                await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                                ServiceWorker.workerMessenger.unicast(WorkerMessengerCommand.RedirectPage, launchUrl, client);
                            }
                            else {
                                Log.debug('Not navigating because link is special.');
                            }
                        }
                        else if (client.navigate) {
                            try {
                                Log.debug('Client is standard HTTPS site. Attempting to focus() client.');
                                await client.focus();
                            }
                            catch (e) {
                                Log.error("Failed to focus:", client, e);
                            }
                            try {
                                if (notificationOpensLink) {
                                    Log.debug(`Redirecting HTTPS site to (${launchUrl}).`);
                                    await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                                    await client.navigate(launchUrl);
                                }
                                else {
                                    Log.debug('Not navigating because link is special.');
                                }
                            }
                            catch (e) {
                                Log.error("Failed to navigate:", client, launchUrl, e);
                            }
                        }
                        else {
                            /*
                            If client.navigate() isn't available, we have no other option but to open a new tab to the URL.
                             */
                            await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                            await ServiceWorker.openUrl(launchUrl);
                        }
                    }
                    doNotOpenLink = true;
                    break;
                }
            }
            if (notificationOpensLink && !doNotOpenLink) {
                await Database.put("NotificationOpened", { url: launchUrl, data: notification, timestamp: Date.now() });
                await ServiceWorker.openUrl(launchUrl);
            }
            const { appId } = await Database.getAppConfig();
            const { deviceId } = await Database.getSubscription();
            if (appId && deviceId) {
                await OneSignalApi.put('notifications/' + notification.id, {
                    app_id: appId,
                    player_id: deviceId,
                    opened: true
                });
            }
            return await ServiceWorker.executeWebhooks('notification.clicked', notification);
        }
        /**
         * Attempts to open the given url in a new browser tab. Called when a notification is clicked.
         * @param url May not be well-formed.
         */
        static async openUrl(url) {
            Log.debug('Opening notification URL:', url);
            try {
                return await self.clients.openWindow(url);
            }
            catch (e) {
                Log.warn(`Failed to open the URL '${url}':`, e);
                return undefined;
            }
        }
        static onServiceWorkerInstalled(event) {
            // At this point, the old service worker is still in control
            event.waitUntil(self.skipWaiting());
        }
        /*
         1/11/16: Enable the waiting service worker to immediately become the active service worker: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting
         */
        static onServiceWorkerActivated(event) {
            // The old service worker is gone now
            Log.info(`%cOneSignal Service Worker activated (version ${Environment.version()}, ${SdkEnvironment.getWindowEnv().toString()} environment).`, getConsoleStyle('bold'));
            event.waitUntil(self.clients.claim());
        }
        static async onPushSubscriptionChange(event) {
            Log.debug(`Called %conPushSubscriptionChange(${JSON.stringify(event, null, 4)}):`, getConsoleStyle('code'), event);
            const appId = await ServiceWorker.getAppId();
            if (!appId || !appId) {
                // Without an app ID, we can't make any calls
                return;
            }
            const appConfig = await new ConfigManager().getAppConfig({
                appId: appId
            });
            if (!appConfig) {
                // Without a valid app config (e.g. deleted app), we can't make any calls
                return;
            }
            const context = new Context(appConfig);
            // Get our current device ID
            let deviceIdExists;
            {
                let { deviceId } = await Database.getSubscription();
                deviceIdExists = !!(deviceId && deviceId);
                if (!deviceIdExists && event.oldSubscription) {
                    // We don't have the device ID stored, but we can look it up from our old subscription
                    deviceId = await OneSignalApi.getUserIdFromSubscriptionIdentifier(appId, PushDeviceRecord.prototype.getDeliveryPlatform(), event.oldSubscription.endpoint);
                    // Store the device ID, so it can be looked up when subscribing
                    const subscription = await Database.getSubscription();
                    subscription.deviceId = deviceId;
                    await Database.setSubscription(subscription);
                }
                deviceIdExists = !!(deviceId && deviceId);
            }
            // Get our new push subscription
            let rawPushSubscription;
            // Set it initially by the provided new push subscription
            const providedNewSubscription = event.newSubscription;
            if (providedNewSubscription) {
                rawPushSubscription = RawPushSubscription.setFromW3cSubscription(providedNewSubscription);
            }
            else {
                // Otherwise set our push registration by resubscribing
                try {
                    rawPushSubscription = await context.subscriptionManager.subscribe(1 /* SubscribeNew */);
                }
                catch (e) {
                    // Let rawPushSubscription be null
                }
            }
            const hasNewSubscription = !!rawPushSubscription;
            if (!deviceIdExists && !hasNewSubscription) {
                await Database.remove('Ids', 'userId');
                await Database.remove('Ids', 'registrationId');
            }
            else {
                /*
                  Determine subscription state we should set new record to.
          
                  If the permission is revoked, we should set the subscription state to permission revoked.
                 */
                let subscriptionState = null;
                const pushPermission = await navigator.permissions.query({ name: 'push', userVisibleOnly: true });
                if (pushPermission !== "granted") {
                    subscriptionState = SubscriptionStateKind.PermissionRevoked;
                }
                else if (!rawPushSubscription) {
                    /*
                      If it's not a permission revoked issue, the subscription expired or was revoked by the
                      push server.
                     */
                    subscriptionState = SubscriptionStateKind.PushSubscriptionRevoked;
                }
                // rawPushSubscription may be null if no push subscription was retrieved
                await context.subscriptionManager.registerSubscription(rawPushSubscription, subscriptionState);
            }
        }
        /**
         * Returns a promise that is fulfilled with either the default title from the database (first priority) or the page title from the database (alternate result).
         */
        static _getTitle() {
            return new Promise(resolve => {
                Promise.all([Database.get('Options', 'defaultTitle'), Database.get('Options', 'pageTitle')])
                    .then(([defaultTitle, pageTitle]) => {
                    if (defaultTitle !== null) {
                        resolve(defaultTitle);
                    }
                    else if (pageTitle != null) {
                        resolve(pageTitle);
                    }
                    else {
                        resolve('');
                    }
                });
            });
        }
        /**
         * Returns an array of raw notification objects, either fetched from the server (as from legacy GCM push), or read
         * from the event.data.payload property (as from the new web push protocol).
         * @param event
         * @returns An array of notifications. The new web push protocol will only ever contain one notification, however
         * an array is returned for backwards compatibility with the rest of the service worker plumbing.
           */
        static parseOrFetchNotifications(event) {
            if (event.data) {
                const isValidPayload = ServiceWorker.isValidPushPayload(event.data);
                if (isValidPayload) {
                    Log.debug('Received a valid encrypted push payload.');
                    return Promise.resolve([event.data.json()]);
                }
                else {
                    return Promise.reject('Unexpected push message payload received: ' + event.data.text());
                    /*
                     We received a push message payload from another service provider or a malformed
                     payload. The last received notification will be displayed.
                     */
                }
            }
            else
                return ServiceWorker.retrieveNotifications();
        }
        /**
         * Returns true if the raw data payload is a OneSignal push message in the format of the new web push protocol.
         * Otherwise returns false.
         * @param rawData The raw PushMessageData from the push event's event.data, not already parsed to JSON.
         */
        static isValidPushPayload(rawData) {
            try {
                const payload = rawData.json();
                if (payload &&
                    payload.custom &&
                    payload.custom.i &&
                    isValidUuid(payload.custom.i)) {
                    return true;
                }
                else {
                    Log.debug('isValidPushPayload: Valid JSON but missing notification UUID:', payload);
                    return false;
                }
            }
            catch (e) {
                Log.debug('isValidPushPayload: Parsing to JSON failed with:', e);
                return false;
            }
        }
        /**
         * Retrieves unread notifications from OneSignal's servers. For Chrome and Firefox's legacy web push protocol,
         * a push signal is sent to the service worker without any message contents, and the service worker must retrieve
         * the contents from OneSignal's servers. In Chrome and Firefox's new web push protocols involving payloads, the
         * notification contents will arrive with the push signal. The legacy format must be supported for a while.
         */
        static retrieveNotifications() {
            return new Promise(resolve => {
                var notifications = [];
                // Each entry is like:
                /*
                 Object {custom: Object, icon: "https://onesignal.com/images/notification_logo.png", alert: "asd", title: "ss"}
                 alert: "asd"
                 custom: Object
                 i: "6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"
                 __proto__: Object
                 icon: "https://onesignal.com/images/notification_logo.png"
                 title: "ss"
                 __proto__: Object
                 */
                Database.get('Ids', 'userId')
                    .then(userId => {
                    if (userId) {
                        Log.debug(`Legacy push signal received, retrieving contents from players/${userId}/chromeweb_notification`);
                        return OneSignalApi.get(`players/${userId}/chromeweb_notification`);
                    }
                    else {
                        Log.debug('Tried to get notification contents, but IndexedDB is missing user ID info.');
                        return Promise.all([
                            ServiceWorker.getAppId(),
                            self.registration.pushManager.getSubscription().then(subscription => subscription.endpoint)
                        ])
                            .then(([appId, identifier]) => {
                            let deviceType = PushDeviceRecord.prototype.getDeliveryPlatform();
                            // Get the user ID from OneSignal
                            return OneSignalApi.getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier).then(recoveredUserId => {
                                if (recoveredUserId) {
                                    Log.debug('Recovered OneSignal user ID:', recoveredUserId);
                                    // We now have our OneSignal user ID again
                                    return Promise.all([
                                        Database.put('Ids', { type: 'userId', id: recoveredUserId }),
                                        Database.put('Ids', {
                                            type: 'registrationId',
                                            id: identifier.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "")
                                        }),
                                    ]).then(() => {
                                        // Try getting the notification again
                                        Log.debug('Attempting to retrieve the notification again now with a recovered user ID.');
                                        return OneSignalApi.get(`players/${recoveredUserId}/chromeweb_notification`);
                                    });
                                }
                                else {
                                    return Promise.reject('Recovered user ID was null. Unsubscribing from push notifications.');
                                }
                            });
                        })
                            .catch(error => {
                            Log.debug('Unsuccessfully attempted to recover OneSignal user ID:', error);
                            // Actually unsubscribe from push so this user doesn't get bothered again
                            return self.registration.pushManager.getSubscription()
                                .then(subscription => {
                                return subscription.unsubscribe();
                            })
                                .then(unsubscriptionResult => {
                                Log.debug('Unsubscribed from push notifications result:', unsubscriptionResult);
                                ServiceWorker.UNSUBSCRIBED_FROM_NOTIFICATIONS = true;
                            });
                        });
                    }
                })
                    .then((response) => {
                    // The response is an array literal -- response.json() has been called by apiCall()
                    // The result looks like this:
                    // OneSignalApi.get('players/7442a553-5f61-4b3e-aedd-bb574ef6946f/chromeweb_notification').then(function(response) { Log.debug(response); });
                    // ["{"custom":{"i":"6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"},"icon":"https://onesignal.com/images/notification_logo.png","alert":"asd","title":"ss"}"]
                    // ^ Notice this is an array literal with JSON data inside
                    for (var i = 0; i < response.length; i++) {
                        notifications.push(JSON.parse(response[i]));
                    }
                    if (notifications.length == 0) {
                        Log.warn('OneSignal Worker: Received a GCM push signal, but there were no messages to retrieve. Are you' +
                            ' using the wrong API URL?', SdkEnvironment.getOneSignalApiUrl().toString());
                    }
                    resolve(notifications);
                });
            });
        }
    }
    // Expose this class to the global scope
    if (typeof self === "undefined" &&
        typeof global !== "undefined") {
        global.OneSignalWorker = ServiceWorker;
    }
    else {
        self.OneSignalWorker = ServiceWorker;
    }
    // Run our main file
    if (typeof self !== "undefined") {
        ServiceWorker.run();
    }

    self.OneSignal = ServiceWorker;

}(ExtendableError,bowser,JSONP));
