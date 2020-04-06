import { OneSignalApiSW } from "../OneSignalApiSW";
import Log from "../libraries/Log";
import Path from "../models/Path";
import { Session, initializeNewSession, SessionOrigin, SessionStatus } from "../models/Session";
import { InvalidStateError, InvalidStateReason } from "../errors/InvalidStateError";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import Database from "../services/Database";
import { SerializedPushDeviceRecord, PushDeviceRecord } from "../models/PushDeviceRecord";
import { NotificationClicked } from "../models/Notification";
import { RawPushSubscription } from '../models/RawPushSubscription';
import PageServiceWorkerHelper from "./page/ServiceWorkerHelper";
import { OutcomesConfig } from "../models/Outcomes";
import OutcomesHelper from './shared/OutcomesHelper';
import { cancelableTimeout, CancelableTimeoutPromise } from './sw/CancelableTimeout';
import { OSServiceWorkerFields } from "../service-worker/types";

declare var self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

export default class ServiceWorkerHelper {
  public static async getRegistration(): Promise<ServiceWorkerRegistration | null | undefined> {
    return await PageServiceWorkerHelper.getRegistration();
  }

  public static getServiceWorkerHref(
    workerState: ServiceWorkerActiveState,
    config: ServiceWorkerManagerConfig): string {
    let workerFullPath = "";

    // Determine which worker to install
    if (workerState === ServiceWorkerActiveState.WorkerA)
      workerFullPath = config.workerBPath.getFullPath();
    else if (workerState === ServiceWorkerActiveState.WorkerB ||
      workerState === ServiceWorkerActiveState.ThirdParty ||
      workerState === ServiceWorkerActiveState.None)
      workerFullPath = config.workerAPath.getFullPath();
    else if (workerState === ServiceWorkerActiveState.Bypassed) {
      /*
        if the page is hard refreshed bypassing the cache, no service worker
        will control the page.

        It doesn't matter if we try to reinstall an existing worker; still no
        service worker will control the page after installation.
       */
      throw new InvalidStateError(InvalidStateReason.UnsupportedEnvironment);
    }

    return new URL(workerFullPath, OneSignalUtils.getBaseUrl()).href;
  }

  public static async upsertSession(
    sessionThresholdInSeconds: number, sendOnFocusEnabled: boolean,
    deviceRecord: SerializedPushDeviceRecord, deviceId: string | undefined, sessionOrigin: SessionOrigin,
    outcomesConfig: OutcomesConfig
  ): Promise<void> {
    if (!deviceId) {
      Log.error("No deviceId provided for new session.");
      return;
    }

    if (!deviceRecord.app_id) {
      Log.error("No appId provided for new session.");
      return;
    }

    const existingSession = await Database.getCurrentSession();

    if (!existingSession) {
      const appId = deviceRecord.app_id;
      const session: Session = initializeNewSession(
        { deviceId, appId, deviceType:deviceRecord.device_type }
      );

      // if there is a record about a clicked notification in our database, attribute session to it.
      const clickedNotification: NotificationClicked | null = await Database.getLastNotificationClicked(appId);
      if (clickedNotification) {
        session.notificationId = clickedNotification.notificationId;
      }

      await Database.upsertSession(session);
      /**
       * Send on_session call on each new session initialization except the case
       * when player create call occurs, e.g. first subscribed or re-subscribed cases after clearing cookies,
       * since player#create call updates last_session field on player.
       */
      if (sessionOrigin !== SessionOrigin.PlayerCreate) {
        if (!deviceRecord.identifier) {
          const subscription = await self.registration.pushManager.getSubscription()
          if (subscription) {
            const rawPushSubscription = RawPushSubscription.setFromW3cSubscription(subscription);
            const fullDeviceRecord = new PushDeviceRecord(rawPushSubscription).serialize();
            deviceRecord.identifier = fullDeviceRecord.identifier;
          }
        }

        const newPlayerId = await OneSignalApiSW.updateUserSession(deviceId, deviceRecord);
        // If the returned player id is different, save the new id to indexed db and update session
        if (newPlayerId !== deviceId) {
          session.deviceId = newPlayerId;
          await Promise.all([
            Database.setDeviceId(newPlayerId),
            Database.upsertSession(session)
          ]);
        }
      }
      return;
    }

    if (existingSession.status === SessionStatus.Active) {
      Log.debug("Session already active", existingSession);
      return;
    }

    if (!existingSession.lastDeactivatedTimestamp) {
      Log.debug("Session is in invalid state", existingSession);
      // TODO: possibly recover by re-starting session if deviceId is present?
      return;
    }

    const currentTimestamp = new Date().getTime();
    const timeSinceLastDeactivatedInSeconds: number = ServiceWorkerHelper.timeInSecondsBetweenTimestamps(
      currentTimestamp, existingSession.lastDeactivatedTimestamp);

    if (timeSinceLastDeactivatedInSeconds <= sessionThresholdInSeconds) {
      existingSession.status = SessionStatus.Active;
      existingSession.lastActivatedTimestamp = currentTimestamp;
      existingSession.lastDeactivatedTimestamp = null;
      await Database.upsertSession(existingSession);
      return;
    }

    // If failed to report/clean-up last time, we can attempt to try again here.

    // TODO: Possibly check that it's not unreasonably long.
    // TODO: Or couple with periodic ping for better results.
    await ServiceWorkerHelper.finalizeSession(existingSession, sendOnFocusEnabled, outcomesConfig);
    await Database.upsertSession(
      initializeNewSession({deviceId, appId: deviceRecord.app_id, deviceType:deviceRecord.device_type})
    );
  }

  public static async deactivateSession(
    thresholdInSeconds: number, sendOnFocusEnabled: boolean,
    outcomesConfig: OutcomesConfig
  ): Promise<CancelableTimeoutPromise | undefined> {
    const existingSession = await Database.getCurrentSession();

    if (!existingSession) {
      Log.debug("No active session found. Cannot deactivate.");
      return undefined;
    }

    /**
     * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
     * Timer gets cleaned up before figuring out it's activate or deactivate.
     * No update needed for the session, early return.
     */
    if (existingSession.status === SessionStatus.Inactive) {
      return cancelableTimeout(
        () => ServiceWorkerHelper.finalizeSession(existingSession, sendOnFocusEnabled, outcomesConfig), 
        thresholdInSeconds
      );
    }

    /**
     * Can only be active or expired at this point, but more statuses may come in in the future.
     * For anything but active, logging a warning and doing early return.
     */
    if (existingSession.status !== SessionStatus.Active) {
      Log.warn(`Session in invalid state ${existingSession.status}. Cannot deactivate.`);
      return undefined;
    }

    const currentTimestamp = new Date().getTime();
    const timeSinceLastActivatedInSeconds: number = ServiceWorkerHelper.timeInSecondsBetweenTimestamps(
      currentTimestamp, existingSession.lastActivatedTimestamp);

    existingSession.lastDeactivatedTimestamp = currentTimestamp;
    existingSession.accumulatedDuration += timeSinceLastActivatedInSeconds;
    existingSession.status = SessionStatus.Inactive;

    const cancelableFinalize = cancelableTimeout(
      () => ServiceWorkerHelper.finalizeSession(existingSession, sendOnFocusEnabled, outcomesConfig), 
      thresholdInSeconds
    );

    await Database.upsertSession(existingSession);

    return cancelableFinalize;
  }

  public static async finalizeSession(
    session: Session, sendOnFocusEnabled: boolean, outcomesConfig: OutcomesConfig
  ): Promise<void> {
    Log.debug(
      "Finalize session",
      `started: ${new Date(session.startTimestamp)}`,
      `duration: ${session.accumulatedDuration}s`
    );

    if (sendOnFocusEnabled) {
      Log.debug(`send on_focus reporting session duration -> ${session.accumulatedDuration}s`);
      const attribution = await OutcomesHelper.getAttribution(outcomesConfig);
      Log.debug("send on_focus with attribution", attribution);
      await OneSignalApiSW.sendSessionDuration(
        session.appId,
        session.deviceId,
        session.accumulatedDuration,
        session.deviceType,
        attribution
      );
    }

    await Promise.all([Database.cleanupCurrentSession(), Database.removeAllNotificationClicked()]);
    Log.debug(
      "Finalize session finished",
      `started: ${new Date(session.startTimestamp)}`
    );
  };

  static timeInSecondsBetweenTimestamps(timestamp1: number, timestamp2: number): number {
    if (timestamp1 <= timestamp2) {
      return 0;
    }
    return Math.floor((timestamp1 - timestamp2) / 1000);
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
   * A service worker is currently installing and we can't determine its final state yet. Wait until
   * the service worker is finished installing by checking for a controllerchange property..
   */
  Installing = 'Installing',
  /**
   * No service worker is installed.
   */
  None = 'None',
  /**
   * A service worker is active but not controlling the page. This can occur if
   * the page is hard-refreshed bypassing the cache, which also bypasses service
   * workers.
   */
  Bypassed = 'Bypassed',
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
