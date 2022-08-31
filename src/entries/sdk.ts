/**
 * This is OneSignalSDK.js (ES5)
 *   * This is an entry point for pages and older service workers.
 *       - Developers are now instructed to use OneSignalSDKWorker.js directly for service workers
 *   * Also we define a ES5 Stub for OneSignal for browsers that do not support push.
 * This is a shim to detect and load either;
 *   * ServiceWorkerSDK (ES6) - OneSignalSDKWorker.js
 *   * PageSDK (ES6)          - OneSignalPageSDKES6.js
 *   * Stub-PageSDK (ES5)     - OneSignalSDK.js (This File)
 */

// NOTE: Careful if adding imports, ES5 targets can't clean up functions never called.
import {OneSignalShimLoader} from '../utils/OneSignalShimLoader';

OneSignalShimLoader.start();
