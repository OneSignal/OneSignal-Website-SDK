import {
  cancelableTimeout,
  type CancelableTimeoutPromise,
} from '../../sw/helpers/CancelableTimeout';
import { enqueueSessionCreate, enqueueSessionUpdate } from '../../sw/sessionRequests/queue';
import { drainSessionRequests } from '../../sw/sessionRequests/sender';
import { sendSessionDuration, updateUserSession } from '../api/sw';
import { encodeHashAsUriComponent } from '../context/helpers';
import { cleanupCurrentSession, db, getCurrentSession } from '../database/client';
import { getAllNotificationClickedForOutcomes } from '../database/notifications';
import { FeatureFlag, isFeatureEnabledInWorker } from '../features/featureFlags';
import Log from '../libraries/Log';
import { IDManager } from '../managers/IDManager';
import type { OutcomesNotificationClicked } from '../models/OutcomesNotificationEvents';
import Path from '../models/Path';
import {
  CLICK_ATTRIBUTION_WINDOW_SECONDS,
  HEARTBEAT_SLACK_SECONDS,
  SessionStatus,
} from '../session/constants';
import { initializeNewSession, isBackgroundOrigin, toHeartbeatInterval } from '../session/helpers';
import type { Session, SessionUser, UpsertOrDeactivateSessionPayload } from '../session/types';
import { SubscriptionType } from '../subscriptions/constants';
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

let sessionRefreshTail: Promise<unknown> = Promise.resolve();

/**
 * Runs session refreshes one at a time. The debounce only cancels a refresh that
 * has not started, so two refreshes could otherwise both finalize the same
 * expired session and each start a new one. One worker handles every tab's
 * messages, so an in-memory chain is enough. A refresh runs even if the one
 * before it failed.
 */
export function serializeSessionRefresh<T>(fn: () => Promise<T>): Promise<T> {
  const run = sessionRefreshTail.then(fn, fn);
  sessionRefreshTail = run;
  return run;
}

// Call through serializeSessionRefresh.
export async function upsertSession(options: UpsertOrDeactivateSessionPayload): Promise<void> {
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    const session = await startNewSession(options, await takeDirectAttributionId(options));
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
  const session = await startNewSession(options, await takeDirectAttributionId(options));
  await db.put('Sessions', session);
  await reportSessionStart(options, session);
  if (endQueued) await drainSessionRequests();
}

type NewSession = Session & Required<Pick<Session, 'sessionId' | 'usesSessionsApi'>>;

async function startNewSession(
  { appId, onesignalId, subscriptionId, subscriptionType }: SessionUser,
  notificationId: string | null,
): Promise<NewSession> {
  return initializeNewSession({
    appId,
    notificationId,
    sessionId: crypto.randomUUID(),
    // The public create rejects SafariLegacyPush, and an older page sends no
    // type. Those sessions stay on the legacy path so they are still counted.
    usesSessionsApi:
      !!subscriptionType &&
      subscriptionType !== SubscriptionType._SafariLegacyPush &&
      (await isFeatureEnabledInWorker(FeatureFlag._SessionsV2ApiCutover)),
    onesignalId,
    subscriptionId,
  }) as NewSession;
}

async function reportSessionStart(user: SessionUser, session: NewSession): Promise<void> {
  const queued = session.usesSessionsApi && (await enqueueCreate(user, session.sessionId, session));
  // A create that failed to queue falls back to legacy reporting. Local ids still get a deferred create.
  session.usesSessionsApi &&= queued || hasLocalId(user.onesignalId, user.subscriptionId);
  await Promise.all([sendOnSessionCall(user, session), queued && drainSessionRequests()]);
}

/**
 * A new subscriber's first session starts before the user and subscription
 * exist, so its create waits for an upsert or deactivate that brings the server
 * IDs. The IDs are re-pinned only once the create is queued, so a later message
 * retries it. Without it the session's end is skipped too.
 */
async function enqueueDeferredCreate(user: SessionUser, session: Session): Promise<boolean> {
  const { sessionId, usesSessionsApi, onesignalId, subscriptionId } = session;
  if (!usesSessionsApi || !sessionId || !hasLocalId(onesignalId, subscriptionId)) return false;
  if (!(await enqueueCreate(user, sessionId, session))) return false;

  session.onesignalId = user.onesignalId;
  session.subscriptionId = user.subscriptionId;
  await db.put('Sessions', session);
  return true;
}

async function enqueueCreate(
  { appId, onesignalId, subscriptionId, subscriptionType }: SessionUser,
  sessionId: string,
  { startTimestamp, notificationId }: Session,
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
      startTime: startTimestamp,
      directAttributionId: notificationId || undefined,
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

// Call through serializeSessionRefresh.
export async function deactivateSession(
  options: UpsertOrDeactivateSessionPayload,
): Promise<CancelableTimeoutPromise | undefined> {
  const { sessionThreshold: thresholdInSeconds } = options;
  const existingSession = await getCurrentSession();

  if (!existingSession) {
    Log._debug('No active session to deactivate');
    return undefined;
  }
  // Drained now: an update waits a few seconds after its create, so a create
  // drained with the end would leave the end for a later drain.
  const createQueued = await enqueueDeferredCreate(options, existingSession);

  // The finalize step reuses this payload after the threshold, so a token the
  // page refreshes in that window is not used for the session_time request.
  // The caller stores this timer's cancel only once deactivate returns, so an
  // upsert that arrives meanwhile cannot cancel it. The stored row is the truth:
  // a session that resumed and went inactive again has a newer deactivate time.
  const finalizeSWSession = () =>
    serializeSessionRefresh(async () => {
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
    });

  /**
   * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
   * Timer gets cleaned up before figuring out it's activate or deactivate.
   * No update needed for the session, early return.
   */
  if (existingSession.status === SessionStatus._Inactive) {
    // A blur made the session inactive without a checkpoint; the tab hiding later does.
    const checkpointQueued = await enqueueCheckpoint(options, existingSession);
    if (checkpointQueued && !(await saveCheckpointedDuration(existingSession))) return undefined;
    if (checkpointQueued || createQueued) void drainSessionRequests();
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
  if (checkpointQueued || createQueued) void drainSessionRequests();

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

/**
 * Sends the duration of an active session once it has grown a heartbeat
 * interval past the last duration sent. Every visible tab ticks, so running
 * in the refresh chain is what keeps it to one request per interval across tabs.
 */
export async function sendSessionHeartbeat(
  options: UpsertOrDeactivateSessionPayload,
): Promise<void> {
  if (await serializeSessionRefresh(() => enqueueHeartbeat(options))) await drainSessionRequests();
}

async function enqueueHeartbeat(options: UpsertOrDeactivateSessionPayload): Promise<boolean> {
  const session = await getCurrentSession();
  if (session?.status !== SessionStatus._Active) return false;
  const duration =
    session.accumulatedDuration +
    timeInSecondsBetweenTimestamps(Date.now(), session.lastActivatedTimestamp);
  const interval = toHeartbeatInterval(options.heartbeatInterval);
  // Page timers start before the worker's debounced activation, so a tick
  // can land a little short of a full interval. Capped so a short interval
  // still waits most of it.
  const slack = Math.min(HEARTBEAT_SLACK_SECONDS, interval / 10);
  const due = (session.checkpointedDuration ?? 0) + interval - slack;
  if (duration < due) return false;
  if (!(await enqueueDurationUpdate(options, { ...session, accumulatedDuration: duration }))) {
    return false;
  }
  return saveCheckpointedDuration({ ...session, checkpointedDuration: duration });
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
  const sent = await updateUserSession(user, !!session.usesSessionsApi);
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
  const sent = await updateUserSession(user, !!session.usesSessionsApi);
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
  const endedAt = session.lastDeactivatedTimestamp ?? Date.now();
  const endQueued = await enqueueDurationUpdate(options, session, endedAt);
  // The backend derives session_time and the duration outcome from a Sessions API session.
  if (sendOnFocusEnabled && !session.usesSessionsApi) {
    Log._debug(`on_focus duration: ${session.accumulatedDuration}s`);
    const attribution = await getConfigAttribution(outcomesConfig);
    Log._debug('on_focus attribution', attribution);
    await sendSessionDuration(options, session.accumulatedDuration, attribution);
  }

  // A later click can be opening the next session, which reads it once started.
  await Promise.all([
    cleanupCurrentSession(),
    keepClicks((clicks) => clicks.filter((c) => c.timestamp >= endedAt)),
  ]);
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

/** Deletes the stored clicks that `select` does not return. */
async function keepClicks(
  select: (clicks: OutcomesNotificationClicked[]) => OutcomesNotificationClicked[],
): Promise<OutcomesNotificationClicked[]> {
  const clicks = await getAllNotificationClickedForOutcomes().catch(() => []);
  const kept = select(clicks);
  await Promise.all(
    clicks
      .filter((c) => !kept.includes(c))
      .map((c) => db.delete('Outcomes.NotificationClicked', c.notificationId)),
  );
  return kept;
}

/**
 * The latest recent click opened the page that starts this session. Older
 * clicks opened nothing, such as an external link, and are deleted so they
 * attribute neither this session nor its outcomes.
 */
async function takeDirectAttributionId({
  appId,
  outcomesConfig,
}: UpsertOrDeactivateSessionPayload): Promise<string | null> {
  const recent = Date.now() - CLICK_ATTRIBUTION_WINDOW_SECONDS * 1000;
  const [click] = await keepClicks((clicks) =>
    clicks
      .filter((c) => c.appId === appId && c.timestamp >= recent)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 1),
  );
  return (outcomesConfig.direct?.enabled && click?.notificationId) || null;
}

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
