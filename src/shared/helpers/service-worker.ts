import {
  cancelableTimeout,
  type CancelableTimeoutPromise,
} from '../../sw/helpers/CancelableTimeout';
import OneSignalApiSW from '../api/OneSignalApiSW';
import { encodeHashAsUriComponent } from '../context/helpers';
import {
  cleanupCurrentSession,
  db,
  getCurrentSession,
} from '../database/client';
import { getAllNotificationClickedForOutcomes } from '../database/notifications';
import type { OutcomesNotificationClicked } from '../models/OutcomesNotificationEvents';
import Path from '../models/Path';
import type { OutcomesConfig } from '../outcomes/types';
import { SessionOrigin, SessionStatus } from '../session/constants';
import { initializeNewSession } from '../session/helpers';
import type { Session, SessionOriginValue } from '../session/types';
import { getConfigAttribution } from './OutcomesHelper';
import { getBaseUrl } from './general';
import log from './log';
import { LogMessage } from './log/constants';

export function getServiceWorkerHref(
  config: ServiceWorkerManagerConfig,
  appId: string,
  sdkVersion: string,
): string {
  return appendServiceWorkerParams(
    config.workerPath.getFullPath(),
    appId,
    sdkVersion,
  );
}

function appendServiceWorkerParams(
  workerFullPath: string,
  appId: string,
  sdkVersion: string,
): string {
  const fullPath = new URL(workerFullPath, getBaseUrl()).href;
  const appIdAsQueryParam = encodeHashAsUriComponent({ appId });
  const sdkVersionAsQueryParam = encodeHashAsUriComponent({
    sdkVersion,
  });
  return `${fullPath}?${appIdAsQueryParam}&${sdkVersionAsQueryParam}`;
}

export async function upsertSession(
  appId: string,
  onesignalId: string,
  subscriptionId: string,
  sessionThresholdInSeconds: number,
  sendOnFocusEnabled: boolean,
  sessionOrigin: SessionOriginValue,
  outcomesConfig: OutcomesConfig,
): Promise<void> {
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    const session: Session = initializeNewSession({ appId });

    // if there is a record about a clicked notification in our database, attribute session to it.
    const clickedNotification: OutcomesNotificationClicked | null =
      await getLastNotificationClickedForOutcomes(appId);
    if (clickedNotification) {
      session.notificationId = clickedNotification.notificationId;
    }

    await db.put('Sessions', session);
    await sendOnSessionCallIfNotPlayerCreate(
      appId,
      onesignalId,
      subscriptionId,
      sessionOrigin,
      session,
    );
    return;
  }

  if (existingSession.status === SessionStatus.Active) {
    log(LogMessage.ServiceWorkerHelperSessionActive, existingSession);
    return;
  }

  if (!existingSession.lastDeactivatedTimestamp) {
    log(LogMessage.ServiceWorkerHelperSessionInvalid, existingSession);
    // TODO: possibly recover by re-starting session if deviceId is present?
    return;
  }

  const currentTimestamp = new Date().getTime();
  const timeSinceLastDeactivatedInSeconds: number =
    timeInSecondsBetweenTimestamps(
      currentTimestamp,
      existingSession.lastDeactivatedTimestamp,
    );

  if (timeSinceLastDeactivatedInSeconds <= sessionThresholdInSeconds) {
    existingSession.status = SessionStatus.Active;
    existingSession.lastActivatedTimestamp = currentTimestamp;
    existingSession.lastDeactivatedTimestamp = null;
    await db.put('Sessions', existingSession);
    return;
  }

  // If failed to report/clean-up last time, we can attempt to try again here.
  // TODO: Possibly check that it's not unreasonably long.
  // TODO: Or couple with periodic ping for better results.
  await finalizeSession(
    appId,
    onesignalId,
    subscriptionId,
    existingSession,
    sendOnFocusEnabled,
    outcomesConfig,
  );
  const session: Session = initializeNewSession({ appId });
  await db.put('Sessions', session);
  await sendOnSessionCallIfNotPlayerCreate(
    appId,
    onesignalId,
    subscriptionId,
    sessionOrigin,
    session,
  );
}

export async function deactivateSession(
  appId: string,
  onesignalId: string,
  subscriptionId: string,
  thresholdInSeconds: number,
  sendOnFocusEnabled: boolean,
  outcomesConfig: OutcomesConfig,
): Promise<CancelableTimeoutPromise | undefined> {
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    log(LogMessage.ServiceWorkerHelperNoActiveSession);
    return undefined;
  }

  const finalizeSWSession = () =>
    finalizeSession(
      appId,
      onesignalId,
      subscriptionId,
      existingSession,
      sendOnFocusEnabled,
      outcomesConfig,
    );

  /**
   * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
   * Timer gets cleaned up before figuring out it's activate or deactivate.
   * No update needed for the session, early return.
   */
  if (existingSession.status === SessionStatus.Inactive) {
    return cancelableTimeout(finalizeSWSession, thresholdInSeconds);
  }

  /**
   * Can only be active or expired at this point, but more statuses may come in in the future.
   * For anything but active, logging a warning and doing early return.
   */
  if (existingSession.status !== SessionStatus.Active) {
    log(LogMessage.ServiceWorkerHelperInvalidStateDeactivate, {
      status: existingSession.status,
    });
    return undefined;
  }

  const currentTimestamp = new Date().getTime();
  const timeSinceLastActivatedInSeconds: number =
    timeInSecondsBetweenTimestamps(
      currentTimestamp,
      existingSession.lastActivatedTimestamp,
    );

  existingSession.lastDeactivatedTimestamp = currentTimestamp;
  existingSession.accumulatedDuration += timeSinceLastActivatedInSeconds;
  existingSession.status = SessionStatus.Inactive;

  const cancelableFinalize = cancelableTimeout(
    finalizeSWSession,
    thresholdInSeconds,
  );

  await db.put('Sessions', existingSession);

  return cancelableFinalize;
}

/**
 * Updates session only if it isn't from the result of a user create,
 * as it already initializes it with the first session.
 */
async function sendOnSessionCallIfNotPlayerCreate(
  appId: string,
  onesignalId: string,
  subscriptionId: string,
  sessionOrigin: SessionOriginValue,
  session: Session,
) {
  if (sessionOrigin === SessionOrigin.UserCreate) {
    return;
  }

  db.put('Sessions', session);
  resetSentUniqueOutcomes();

  // USER MODEL TO DO: handle potential 404 - user does not exist
  await OneSignalApiSW.updateUserSession(appId, onesignalId, subscriptionId);
}

async function finalizeSession(
  appId: string,
  onesignalId: string,
  subscriptionId: string,
  session: Session,
  sendOnFocusEnabled: boolean,
  outcomesConfig: OutcomesConfig,
): Promise<void> {
  log(LogMessage.ServiceWorkerHelperFinalizeSession, {
    startTimestamp: session.startTimestamp,
    accumulatedDuration: session.accumulatedDuration,
  });
  if (sendOnFocusEnabled) {
    log(LogMessage.ServiceWorkerHelperSendFocus, {
      duration: session.accumulatedDuration,
    });
    const attribution = await getConfigAttribution(outcomesConfig);
    log(LogMessage.ServiceWorkerHelperSendFocusAttribution, attribution);
    await OneSignalApiSW.sendSessionDuration(
      appId,
      onesignalId,
      subscriptionId,
      session.accumulatedDuration,
      attribution,
    );
  }

  await Promise.all([
    cleanupCurrentSession(),
    db.clear('Outcomes.NotificationClicked'),
  ]);
  log(LogMessage.ServiceWorkerHelperFinalizeComplete, {
    startTimestamp: session.startTimestamp,
    accumulatedDuration: session.accumulatedDuration,
  });
}

const resetSentUniqueOutcomes = async (): Promise<void> => {
  const outcomes = await db.getAll('SentUniqueOutcome');
  const promises = outcomes.map((o) => {
    o.sentDuringSession = null;
    return db.put('SentUniqueOutcome', o);
  });
  await Promise.all(promises);
};

const getLastNotificationClickedForOutcomes = async (
  appId: string,
): Promise<OutcomesNotificationClicked | null> => {
  let allClickedNotifications: OutcomesNotificationClicked[] = [];
  try {
    allClickedNotifications = await getAllNotificationClickedForOutcomes();
  } catch (e) {
    log(LogMessage.ServiceWorkerHelperDatabaseError, e);
  }
  const predicate = (notification: OutcomesNotificationClicked) =>
    notification.appId === appId;
  return allClickedNotifications.find(predicate) || null;
};

function timeInSecondsBetweenTimestamps(
  timestamp1: number,
  timestamp2: number,
): number {
  if (timestamp1 <= timestamp2) {
    return 0;
  }
  return Math.floor((timestamp1 - timestamp2) / 1000);
}

export const ServiceWorkerActiveState = {
  /**
   * OneSignalSDKWorker.js, or the equivalent custom file name, is active.
   */
  OneSignalWorker: 'OneSignal Worker',
  /**
   * A service worker is active, but it is not OneSignalSDKWorker.js
   * (or the equivalent custom file names as provided by user config).
   */
  ThirdParty: '3rd Party',
  /**
   * No service worker is installed.
   */
  None: 'None',
} as const;

export type ServiceWorkerActiveStateValue =
  (typeof ServiceWorkerActiveState)[keyof typeof ServiceWorkerActiveState];

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
