import StackTrace from 'stacktrace-js';
import StackTraceGPS from 'stacktrace-gps';
import IndexedDb from '../src/indexedDb';


// URLSearchParams.toString() does a second weird URL encoding so here we have to redo the URL encoding
export default class Utils {
    static urlSearchParamToString(params) {
        let string = '?';
        for (let entry of params.entries()) {
            string += `&${entry[0]}=${entry[1]}`
        }
        return string;
    }

    /**
     * Given a JavaScript error object, returns a more precise error using source maps.
     */
    static captureError(e) {
        if (typeof(e) === 'string') {
            // This is not an actual Error object, so just return t he error
            return Promise.resolve(e);
        }
        return StackTrace.fromError(e)
            .then(stackFrame => {
                stackFrame = stackFrame[0];
                let gps = new StackTraceGPS();
                if (stackFrame.fileName) {
                    stackFrame.fileName = stackFrame.fileName.replace('https://127.0.0.1:3001/', location.origin + '/');
                }
                if (stackFrame.source) {
                    stackFrame.source = stackFrame.source.replace('https://127.0.0.1:3001/', location.origin + '/');
                }
                return gps.pinpoint(stackFrame);
            })
            .then(detailedError => {
                if (detailedError.fileName) {
                    detailedError.fileName = detailedError.fileName.replace('webpack:///', 'webpack:///./');
                }
                return `${e.name}: ${e.message} @ ${detailedError.fileName}:${detailedError.lineNumber}:${detailedError.columnNumber}`;
            })
            .catch(x => {
                if (!Utils.recursiveDepth) {
                    Utils.recursiveDepth = 0;
                }
                if (Utils.recursiveDepth < 3) {
                    Utils.recursiveDepth++;
                    return Utils.captureError(x);
                }
            });
    }

    /**
     * Wipe OneSignal-related IndexedDB data.
     */
    static wipeIndexedDb() {
        return Promise.all([
            IndexedDb.remove('Ids'),
            IndexedDb.remove('NotificationOpened'),
            IndexedDb.remove('Options')
        ]);
    }

    /**
     * Unsubscribe from push notifications and remove the service worker.
     */
    static wipeServiceWorkerAndUnsubscribe() {
        if (!navigator.serviceWorker || !navigator.serviceWorker.controller)
            return Promise.resolve();

        let unsubscribePromise = navigator.serviceWorker.ready
            .then(registration => registration.pushManager)
            .then(pushManager => pushManager.getSubscription())
            .then(subscription => {
                if (subscription) {
                    return subscription.unsubscribe();
                }
            });

        let unregisterWorkerPromise = navigator.serviceWorker.ready
            .then(registration => registration.unregister());

        return Promise.all([
            unsubscribePromise,
            unregisterWorkerPromise
        ]);
    }
}