import {
  cancelableTimeout,
  type CancelableTimeoutPromise,
} from '../../sw/helpers/CancelableTimeout';
import { enqueueSessionCreate, enqueueSessionUpdate } from '../../sw/sessionRequests/queue';
import { drainSessionRequests } from '../../sw/sessionRequests/sender';
import { sendSessionDuration, updateUserSession } from '../api/sw';
import { encodeHashAsUriComponent } from '../context/helpers';
import { cleanupCurrentSession, clearStore, db, getCurrentSession } from '../database/client';
import { getAllNotificationClickedForOutcomes } from '../database/notifications';
import { FeatureFlag, isFeatureEnabledInWorker } from '../features/featureFlags';
import Log from '../libraries/Log';
import { IDManager } from '../managers/IDManager';
import type { OutcomesNotificationClicked } from '../models/OutcomesNotificationEvents';
import Path from '../models/Path';
import { SessionStatus } from '../session/constants';
import { initializeNewSession, isBackgroundOrigin } from '../session/helpers';
import type { Session, SessionUser, UpsertOrDeactivateSessionPayload } from '../session/types';
import { getBaseUrl } from './general';
import { getConfigAttribution } from './OutcomesHelper';

export function getServiceWorkerHref(
  config: ServiceWorkerManagerConfig,
  appId: string,
  sdkVersion: string,
): string {
  return appendServiceWorkerParams(config.workerPath._getFullPath(), appId, sdkVersion);
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

export async function upsertSession(options: UpsertOrDeactivateSessionPayload): Promise<void> {
  const { appId } = options;
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    const session = await startNewSession(options);

    // if there is a record about a clicked notification in our database, attribute session to it.
    const clickedNotification: OutcomesNotificationClicked | null =
      await getLastNotificationClickedForOutcomes(appId);
    if (clickedNotification) {
      session.notificationId = clickedNotification.notificationId;
    }

    await db.put('Sessions', session);
    await reportSessionStart(options, session);
    return;
  }

  const deferredCreate = await enqueueDeferredCreate(options, existingSession);
  await continueOrRestartSession(options, existingSession);
  if (deferredCreate) await drainSessionRequests();
}

async function continueOrRestartSession(
  options: UpsertOrDeactivateSessionPayload,
  existingSession: Session,
): Promise<void> {
  const { sessionThreshold: sessionThresholdInSeconds } = options;

  if (existingSession.status === SessionStatus._Active) {
    if (existingSession.onSessionPendingFor) {
      await sendPendingOnSession(options, existingSession);
      return;
    }
    Log._debug('Session already active', existingSession);
    return;
  }

  if (!existingSession.lastDeactivatedTimestamp) {
    Log._debug('Session is in invalid state', existingSession);
    // TODO: possibly recover by re-starting session if deviceId is present?
    return;
  }

  const currentTimestamp = new Date().getTime();
  const timeSinceLastDeactivatedInSeconds: number = timeInSecondsBetweenTimestamps(
    currentTimestamp,
    existingSession.lastDeactivatedTimestamp,
  );

  if (timeSinceLastDeactivatedInSeconds <= sessionThresholdInSeconds) {
    existingSession.status = SessionStatus._Active;
    existingSession.lastActivatedTimestamp = currentTimestamp;
    existingSession.lastDeactivatedTimestamp = null;
    await db.put('Sessions', existingSession);
    if (existingSession.onSessionPendingFor) await sendPendingOnSession(options, existingSession);
    return;
  }

  // If failed to report/clean-up last time, we can attempt to try again here.
  // TODO: Possibly check that it's not unreasonably long.
  // TODO: Or couple with periodic ping for better results.
  // Drains only once the new session is saved, so a concurrent upsert never
  // finds the row missing and starts a second session.
  const endQueued = await finalizeSession(options, existingSession);
  const session = await startNewSession(options);
  await db.put('Sessions', session);
  await reportSessionStart(options, session);
  if (endQueued) await drainSessionRequests();
}

type NewSession = Session & Required<Pick<Session, 'sessionId' | 'usesSessionsApi'>>;

async function startNewSession({
  appId,
  onesignalId,
  subscriptionId,
}: SessionUser): Promise<NewSession> {
  return initializeNewSession({
    appId,
    sessionId: crypto.randomUUID(),
    usesSessionsApi: await isFeatureEnabledInWorker(FeatureFlag._SessionsV2ApiCutover),
    onesignalId,
    subscriptionId,
  }) as NewSession;
}

async function reportSessionStart(user: SessionUser, session: NewSession): Promise<void> {
  await Promise.all([
    sendOnSessionCall(user, session),
    session.usesSessionsApi && createServerSession(user, session.sessionId, session.startTimestamp),
  ]);
}

/**
 * A new subscriber's first session starts before the user and subscription
 * exist, so its create waits for an upsert that brings the server IDs. The IDs
 * are re-pinned only once the create is queued, so a later upsert retries it.
 */
async function enqueueDeferredCreate(user: SessionUser, session: Session): Promise<boolean> {
  const { sessionId, usesSessionsApi, onesignalId, subscriptionId, startTimestamp } = session;
  if (!usesSessionsApi || !sessionId || !hasLocalId(onesignalId, subscriptionId)) return false;
  if (!(await enqueueCreate(user, sessionId, startTimestamp))) return false;

  session.onesignalId = user.onesignalId;
  session.subscriptionId = user.subscriptionId;
  await db.put('Sessions', session);
  return true;
}

async function createServerSession(
  user: SessionUser,
  sessionId: string,
  startTime: number,
): Promise<void> {
  if (await enqueueCreate(user, sessionId, startTime)) await drainSessionRequests();
}

async function enqueueCreate(
  { appId, onesignalId, subscriptionId, subscriptionType }: SessionUser,
  sessionId: string,
  startTime: number,
): Promise<boolean> {
  // Queued records are never rewritten, so a create with a local ID could never send.
  if (!subscriptionType || hasLocalId(onesignalId, subscriptionId)) {
    Log._debug('Sessions API: create waits for server ids and subscription type');
    return false;
  }
  return tryEnqueue(() =>
    enqueueSessionCreate({
      appId,
      sessionId,
      onesignalId,
      subscriptionId,
      subscriptionType,
      startTime,
    }),
  );
}

async function tryEnqueue(enqueue: () => Promise<void>): Promise<boolean> {
  try {
    await enqueue();
    return true;
  } catch (e) {
    Log._error('Sessions API: enqueue failed', e);
    return false;
  }
}

function hasLocalId(...ids: (string | undefined)[]): boolean {
  return ids.some((id) => IDManager._isLocalId(id));
}

export async function deactivateSession(
  options: UpsertOrDeactivateSessionPayload,
): Promise<CancelableTimeoutPromise | undefined> {
  const { sessionThreshold: thresholdInSeconds } = options;
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    Log._debug('No active session to deactivate');
    return undefined;
  }

  // The finalize step reuses this payload after the threshold, so a token the
  // page refreshes in that window is not used for the session_time request.
  // The caller stores this timer's cancel only once deactivate returns, so an
  // upsert that arrives meanwhile cannot cancel it. The stored row is the truth:
  // a session that resumed and went inactive again has a newer deactivate time.
  const finalizeSWSession = async () => {
    const current = await getCurrentSession();
    if (
      current?.status !== SessionStatus._Inactive ||
      current.startTimestamp !== existingSession.startTimestamp ||
      current.lastDeactivatedTimestamp !== existingSession.lastDeactivatedTimestamp
    ) {
      Log._debug('Finalize skipped, session resumed or replaced');
      return;
    }
    if (await finalizeSession(options, current)) await drainSessionRequests();
  };

  /**
   * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
   * Timer gets cleaned up before figuring out it's activate or deactivate.
   * No update needed for the session, early return.
   */
  if (existingSession.status === SessionStatus._Inactive) {
    // A blur made the session inactive without a checkpoint; the tab hiding later does.
    if (await enqueueCheckpoint(options, existingSession)) {
      if (!(await saveCheckpointedDuration(existingSession))) return undefined;
      void drainSessionRequests();
    }
    return cancelableTimeout(finalizeSWSession, thresholdInSeconds);
  }

  /**
   * Can only be active or expired at this point, but more statuses may come in in the future.
   * For anything but active, logging a warning and doing early return.
   */
  if (existingSession.status !== SessionStatus._Active) {
    Log._warn(`Invalid session state: ${String(existingSession.status)}`);
    return undefined;
  }

  const currentTimestamp = new Date().getTime();
  const timeSinceLastActivatedInSeconds: number = timeInSecondsBetweenTimestamps(
    currentTimestamp,
    existingSession.lastActivatedTimestamp,
  );

  existingSession.lastDeactivatedTimestamp = currentTimestamp;
  existingSession.accumulatedDuration += timeSinceLastActivatedInSeconds;
  existingSession.status = SessionStatus._Inactive;

  const checkpointQueued = await enqueueCheckpoint(options, existingSession);
  await db.put('Sessions', existingSession);
  // Not awaited, so the caller gets the finalize timer without waiting on the network.
  if (checkpointQueued) void drainSessionRequests();

  // Started once the row is inactive, since finalize skips a row that is not.
  return cancelableTimeout(finalizeSWSession, thresholdInSeconds);
}

/**
 * Sends the duration so far without ending the session, so a browser closed
 * in the background still leaves it on the server. The worker deactivates only
 * once no tab has focus, so this runs once for all tabs. A blur alone sends
 * nothing: switching to another app would send one per switch.
 */
async function enqueueCheckpoint(
  options: UpsertOrDeactivateSessionPayload,
  session: Session,
): Promise<boolean> {
  if (!isBackgroundOrigin(options.sessionOrigin)) return false;
  if (session.accumulatedDuration <= (session.checkpointedDuration ?? 0)) return false;
  if (!(await enqueueDurationUpdate(options, session))) return false;
  session.checkpointedDuration = session.accumulatedDuration;
  return true;
}

// A finalize can delete the row during the enqueue. Writing the row read
// before it would restore an ended session, so only the field is saved.
async function saveCheckpointedDuration(session: Session): Promise<boolean> {
  const current = await getCurrentSession();
  if (!current || current.startTimestamp !== session.startTimestamp) return false;
  current.checkpointedDuration = session.checkpointedDuration;
  await db.put('Sessions', current);
  return true;
}

async function sendOnSessionCall(user: SessionUser, session: Session) {
  void db.put('Sessions', session);
  void resetSentUniqueOutcomes();

  // USER MODEL TO DO: handle potential 404 - user does not exist
  const sent = await updateUserSession(user);
  // Only a token can arrive later. An anonymous user under Identity Verification
  // has no backend user, so that skip does not leave the session pending.
  if (!sent && user.jwtRequired && user.externalId) {
    await markOnSessionPending(session, user.externalId);
  }
}

// The flag is cleared before the request, so an upsert that overlaps this one
// finds nothing pending. A skipped or rejected request sets it back.
async function sendPendingOnSession(user: SessionUser, session: Session): Promise<void> {
  const pendingFor = session.onSessionPendingFor;
  session.onSessionPendingFor = undefined;
  await db.put('Sessions', session);
  // The count belongs to the user who started the session.
  if (!pendingFor || pendingFor !== user.externalId) return;
  const sent = await updateUserSession(user);
  if (sent) return;
  await markOnSessionPending(session, pendingFor);
}

// The request can outlast the session threshold, so the row may be gone or
// replaced by then. The flag goes on the stored row only
// if it is still the same session; a write of the captured object could
// recreate a row finalizeSession deleted.
async function markOnSessionPending(session: Session, externalId: string): Promise<void> {
  const current = await getCurrentSession();
  if (!current || current.startTimestamp !== session.startTimestamp) return;
  current.onSessionPendingFor = externalId;
  await db.put('Sessions', current);
}

async function finalizeSession(
  options: UpsertOrDeactivateSessionPayload,
  session: Session,
): Promise<boolean> {
  const { enableSessionDuration: sendOnFocusEnabled, outcomesConfig } = options;
  Log._debug('Finalize session', `duration: ${session.accumulatedDuration}s`);
  // Ends at the moment the last tab went hidden, not when the threshold expired.
  const endQueued = await enqueueDurationUpdate(
    options,
    session,
    session.lastDeactivatedTimestamp ?? Date.now(),
  );
  if (sendOnFocusEnabled) {
    Log._debug(`on_focus duration: ${session.accumulatedDuration}s`);
    const attribution = await getConfigAttribution(outcomesConfig);
    Log._debug('on_focus attribution', attribution);
    await sendSessionDuration(options, session.accumulatedDuration, attribution);
  }

  await Promise.all([cleanupCurrentSession(), clearStore('Outcomes.NotificationClicked')]);
  Log._debug('Finalize session finished');
  return endQueued;
}

/**
 * The session's create was queued with the pinned IDs, so its updates use them
 * too. Skipped when the create could not have been queued: IDs still local, or
 * a page that sends no subscription type.
 */
async function enqueueDurationUpdate(
  { subscriptionType }: UpsertOrDeactivateSessionPayload,
  session: Session,
  endTime?: number,
): Promise<boolean> {
  const { appId, sessionId, usesSessionsApi, onesignalId, subscriptionId } = session;
  if (!usesSessionsApi || !sessionId) return false;
  if (
    !subscriptionType ||
    !onesignalId ||
    !subscriptionId ||
    hasLocalId(onesignalId, subscriptionId)
  ) {
    Log._debug('Sessions API: update skipped, no create was queued');
    return false;
  }
  return tryEnqueue(() =>
    enqueueSessionUpdate({
      appId,
      sessionId,
      onesignalId,
      subscriptionId,
      durationSeconds: session.accumulatedDuration,
      endTime,
    }),
  );
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
    Log._error('getLastClickedNotif error', e);
  }
  const predicate = (notification: OutcomesNotificationClicked) => notification.appId === appId;
  return allClickedNotifications.find(predicate) || null;
};

function timeInSecondsBetweenTimestamps(timestamp1: number, timestamp2: number): number {
  if (timestamp1 <= timestamp2) {
    return 0;
  }
  return Math.floor((timestamp1 - timestamp2) / 1000);
}

export const ServiceWorkerActiveState = {
  /**
   * OneSignalSDKWorker.js, or the equivalent custom file name, is active.
   */
  _OneSignalWorker: 'OneSignal Worker',

  /**
   * A service worker is active, but it is not OneSignalSDKWorker.js
   * (or the equivalent custom file names as provided by user config).
   */
  _ThirdParty: '3rd Party',

  /**
   * No service worker is installed.
   */
  _None: 'None',
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
