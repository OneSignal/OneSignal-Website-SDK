import Path from "../models/Path";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import { OSServiceWorkerFields } from "../service-worker/types";
import Utils from "../context/shared/utils/Utils";

declare var self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

export default class ServiceWorkerHelper {

  // Get the href of the OneSiganl ServiceWorker that should be installed
  // If a OneSignal ServiceWorker is already installed we will use an alternating name
  //   to force an update to the worker.
  public static getAlternatingServiceWorkerHref(
    workerState: ServiceWorkerActiveState,
    config: ServiceWorkerManagerConfig,
    appId: string
    ): string {
    let workerFullPath: string;

    // Determine which worker to install
    if (workerState === ServiceWorkerActiveState.WorkerA)
      workerFullPath = config.workerBPath.getFullPath();
    else
      workerFullPath = config.workerAPath.getFullPath();

    return ServiceWorkerHelper.appendServiceWorkerParams(workerFullPath, appId);
  }

  public static getPossibleServiceWorkerHrefs(
    config: ServiceWorkerManagerConfig,
    appId: string
    ): string[] {
    const workerFullPaths = [config.workerAPath.getFullPath(), config.workerBPath.getFullPath()];
    return workerFullPaths.map((href) => ServiceWorkerHelper.appendServiceWorkerParams(href, appId));
  }

  private static appendServiceWorkerParams(workerFullPath: string, appId: string): string {
    const fullPath = new URL(workerFullPath, OneSignalUtils.getBaseUrl()).href;
    const appIdHasQueryParam = Utils.encodeHashAsUriComponent({appId});
    return `${fullPath}?${appIdHasQueryParam}`;
  }

}

export enum ServiceWorkerActiveState {
  /**
   * OneSignalSDKWorker.js, or the equivalent custom file name, is active.
   */
  WorkerA = 'Worker A (Main)',
  /**
   * OneSignalSDKUpdaterWorker.js, or the equivalent custom file name, is
   * active.
   *
   * We no longer need to use this filename. We can update Worker A by appending
   * a random query parameter to A.
   */
  WorkerB = 'Worker B (Updater)',
  /**
   * A service worker is active, but it is neither OneSignalSDKWorker.js nor
   * OneSignalSDKUpdaterWorker.js (or the equivalent custom file names as
   * provided by user config).
   */
  ThirdParty = '3rd Party',
  /**
   * No service worker is installed.
   */
  None = 'None',
  /**
   * Service workers are not supported in this environment. This status is used
   * on HTTP pages where it isn't possible to know whether a service worker is
   * installed or not or in any of the other states.
   */
  Indeterminate = 'Indeterminate'
}

export interface ServiceWorkerManagerConfig {
  /**
   * The path and filename of the "main" worker (e.g. '/OneSignalSDKWorker.js');
   */
  workerAPath: Path;
  /**
   * The path and filename to the "alternate" worker, used to update an existing
   * service worker. (e.g. '/OneSignalSDKUpdaterWorer.js')
   */
  workerBPath: Path;
  /**
   * Describes how much of the origin the service worker controls.
   * This is currently always "/".
   */
  registrationOptions: { scope: string };
}
