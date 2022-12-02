import Log from "../../sw/libraries/Log";
import { OneSignalUtils } from "../utils/OneSignalUtils";
import Database from "../services/Database";
import { OutcomesConfig } from "../models/Outcomes";
import { cancelableTimeout, CancelableTimeoutPromise } from '../../sw/helpers/CancelableTimeout';
import Utils from "../context/Utils";
import OutcomesHelper from "./OutcomesHelper";
import { OSServiceWorkerFields } from "../../sw/serviceWorker/types";
import { NotificationClicked } from "../models/Notification";
import { SessionOrigin, initializeNewSession, SessionStatus, Session } from "../models/Session";
import OneSignalApiSW from "../api/OneSignalApiSW";
import Path from "../models/Path";

declare var self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

export default class ServiceWorkerHelper {
  public static getServiceWorkerHref(
    config: ServiceWorkerManagerConfig,
    appId: string,
    sdkVersion: number
    ): string {
    return ServiceWorkerHelper.appendServiceWorkerParams(config.workerPath.getFullPath(), appId, sdkVersion);
  }

  private static appendServiceWorkerParams(workerFullPath: string, appId: string, sdkVersion: number): string {
    const fullPath = new URL(workerFullPath, OneSignalUtils.getBaseUrl()).href;
    const appIdAsQueryParam      = Utils.encodeHashAsUriComponent({ appId });
    const sdkVersionAsQueryParam = Utils.encodeHashAsUriComponent({ sdkVersion });
    return `${fullPath}?${appIdAsQueryParam}&${sdkVersionAsQueryParam}`;
  }

  public static async upsertSession(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    sessionThresholdInSeconds: number, sendOnFocusEnabled: boolean,
    sessionOrigin: SessionOrigin, outcomesConfig: OutcomesConfig
  ): Promise<void> {
    const existingSession = await Database.getCurrentSession();

    if (!existingSession) {
      const session: Session = initializeNewSession(
        { appId }
      );

      // if there is a record about a clicked notification in our database, attribute session to it.
      const clickedNotification: NotificationClicked | null = await Database.getLastNotificationClicked(appId);
      if (clickedNotification) {
        session.notificationId = clickedNotification.notificationId;
      }

      await Database.upsertSession(session);
      await ServiceWorkerHelper.sendOnSessionCallIfNotPlayerCreate(
        appId,
        onesignalId,
        subscriptionId,
        sessionOrigin,
        session
      );
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
    await ServiceWorkerHelper.finalizeSession(
      appId,
      onesignalId,
      subscriptionId,
      existingSession,
      sendOnFocusEnabled,
      outcomesConfig
    );
    const session: Session = initializeNewSession({ appId });
    await Database.upsertSession(session);
    await ServiceWorkerHelper.sendOnSessionCallIfNotPlayerCreate(
      appId,
      onesignalId,
      subscriptionId,
      sessionOrigin,
      session
    );
  }

  public static async deactivateSession(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    thresholdInSeconds: number,
    sendOnFocusEnabled: boolean,
    outcomesConfig: OutcomesConfig
  ): Promise<CancelableTimeoutPromise | undefined> {
    const existingSession = await Database.getCurrentSession();

    if (!existingSession) {
      Log.debug("No active session found. Cannot deactivate.");
      return undefined;
    }

    const finalizeSession = () => ServiceWorkerHelper.finalizeSession(
      appId,
      onesignalId,
      subscriptionId,
      existingSession,
      sendOnFocusEnabled,
      outcomesConfig
    );

    /**
     * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
     * Timer gets cleaned up before figuring out it's activate or deactivate.
     * No update needed for the session, early return.
     */
    if (existingSession.status === SessionStatus.Inactive) {
      return cancelableTimeout(
        finalizeSession,
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
      finalizeSession,
      thresholdInSeconds
    );

    await Database.upsertSession(existingSession);

    return cancelableFinalize;
  }

  /**
   * Sends on_session call on each new session initialization except the case
   * when player create call occurs, e.g. first subscribed or re-subscribed cases after clearing cookies,
   * since player#create call updates last_session field on player.
   */
  public static async sendOnSessionCallIfNotPlayerCreate(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOrigin,
    session: Session) {
    if (sessionOrigin === SessionOrigin.PlayerCreate) {
      return;
    }

    /* TO DO: will need update token for Safari 16 migration path
    if (!deviceRecord.identifier) {
      const subscription = await self.registration.pushManager.getSubscription();
      if (subscription) {
        const rawPushSubscription = RawPushSubscription.setFromW3cSubscription(subscription);
        const fullDeviceRecord = new PushDeviceRecord(rawPushSubscription).serialize();
        deviceRecord.identifier = fullDeviceRecord.identifier;
      }
    }
    */

    Database.upsertSession(session);
    Database.resetSentUniqueOutcomes();

    // USER MODEL TO DO: handle potential 404 - user does not exist
    await OneSignalApiSW.updateUserSession(appId, onesignalId, subscriptionId);
  }

  public static async finalizeSession(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    session: Session,
    sendOnFocusEnabled: boolean,
    outcomesConfig: OutcomesConfig
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
        appId,
        onesignalId,
        subscriptionId,
        session.accumulatedDuration,
        session.deviceType,
        attribution
      );
    }

    await Promise.all([
      Database.cleanupCurrentSession(),
      Database.removeAllNotificationClicked()
    ]);
    Log.debug(
      "Finalize session finished",
      `started: ${new Date(session.startTimestamp)}`
    );
  }

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
  OneSignalWorker = 'OneSignal Worker',
  /**
   * A service worker is active, but it is not OneSignalSDKWorker.js
   * (or the equivalent custom file names as provided by user config).
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
  workerPath: Path;
  /**
   * Describes how much of the origin the service worker controls.
   * This is currently always "/".
   */
  registrationOptions: { scope: string };
}
