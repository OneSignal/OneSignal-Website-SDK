/**
 * Contains the SDK initialization options that configure future installations of our service worker.
 */
class ServiceWorkerConfig {
  /**
   * Describes how much of the origin the service worker controls.
   * This is currently always "/".
   */
  scope: string;
  /**
   * The filename of the "main" worker (e.g. OneSignalSDKWorker.js);
   */
  workerName: string;
  /**
   * The filename of the "alternate" worker, used to update an existing service worker.
   * (e.g. OneSignalSDKUpdaterWorer.js)
   */
  updaterWorkerName: string;
  /**
   * The path to the directory containing both workers.
   */
  workerFilePath: string;
}

export { ServiceWorkerConfig };