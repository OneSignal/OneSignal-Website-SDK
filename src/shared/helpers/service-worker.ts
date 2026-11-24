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

  const createQueued = await releaseHeldCreate(options, existingSession, false);
  await continueOrRestartSession(options, existingSession);
  if (createQueued) await drainSessionRequests();
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
    const createQueued =
      existingSession.isSplitPending && (await startPendingSplit(options, existingSession));
    await db.put('Sessions', existingSession);
    if (existingSession.onSessionPendingFor) await sendPendingOnSession(options, existingSession);
    if (createQueued) await drainSessionRequests();
    return;
  }

  // If failed to report/clean-up last time, we can attempt to try again here.
  // TODO: Possibly check that it's not unreasonably long.
  // TODO: Or couple with periodic ping for better results.
  // Drains only once the new session is saved, so a concurrent upsert never
  // finds the row missing and starts a second session. Not awaited: the drain
  // can wait out the post-create delay, which would hold up the next refresh.
  const endQueued = await finalizeSession(options, existingSession);
  const session = await startNewSession(options, await takeDirectAttributionId(options));
  await db.put('Sessions', session);
  await reportSessionStart(options, session);
  if (endQueued) void drainSessionRequests(true);
}

type NewSession = Session & Required<Pick<Session, 'sessionId' | 'usesSessionsApi'>>;

async function startNewSession(
  { appId, onesignalId, subscriptionId, subscriptionType, externalId }: SessionUser,
  notificationId: string | null,
): Promise<NewSession> {
  // The public create rejects SafariLegacyPush, and an older page sends no
  // type. Those sessions stay on the legacy path so they are still counted.
  const usesSessionsApi =
    !!subscriptionType &&
    subscriptionType !== SubscriptionType._SafariLegacyPush &&
    (await isFeatureEnabledInWorker(FeatureFlag._SessionsV2ApiCutover));
  return initializeNewSession({
    appId,
    notificationId,
    sessionId: crypto.randomUUID(),
    usesSessionsApi,
    onesignalId,
    subscriptionId,
    externalId,
    isCreateHeld: usesSessionsApi && !externalId,
  }) as NewSession;
}

async function reportSessionStart(user: SessionUser, session: NewSession): Promise<void> {
  const held = isCreateHeld(session);
  const queued =
    session.usesSessionsApi && !held && (await enqueueCreate(user, session.sessionId, session));
  // A create that failed to queue falls back to legacy reporting.
  session.usesSessionsApi &&= queued || held;
  await Promise.all([sendOnSessionCall(user, session), queued && drainSessionRequests()]);
}

/** Queued records are never rewritten, so a create also waits while an ID is local. */
function isCreateHeld(session: Session): boolean {
  return !!session.isCreateHeld || hasLocalId(session.onesignalId, session.subscriptionId);
}

/**
 * Queues a held create. An anonymous session holds it until `includeAnonymous`
 * (the first background, a heartbeat, or the end), so the backend does not set
 * the owner before a login. A new subscriber's first session starts before the
 * user and subscription exist, so local pinned IDs take the message's IDs. They
 * are re-pinned only once the create is queued, so a later message retries it.
 * Without the create the session's updates and end are skipped too.
 */
async function releaseHeldCreate(
  user: SessionUser,
  session: Session,
  includeAnonymous: boolean,
): Promise<boolean> {
  const { sessionId, usesSessionsApi } = session;
  if (!usesSessionsApi || !sessionId || !isCreateHeld(session) || session.isSplitPending) {
    return false;
  }
  // A row saved before the hold existed has no flag, so it releases as soon as the IDs allow.
  if (session.isCreateHeld && !session.externalId && !includeAnonymous) return false;

  // A tab that has not seen a switch still sends the user before it.
  const useMessageIds =
    hasLocalId(session.onesignalId, session.subscriptionId) &&
    (session.isCreateHeld === undefined || user.externalId === session.externalId);
  const { onesignalId, subscriptionId } = useMessageIds
    ? user
    : (session as Required<Pick<Session, 'onesignalId' | 'subscriptionId'>>);
  if (!(await enqueueCreate({ ...user, onesignalId, subscriptionId }, sessionId, session))) {
    return false;
  }

  session.onesignalId = onesignalId;
  session.subscriptionId = subscriptionId;
  session.isCreateHeld = false;
  await db.put('Sessions', session);
  return true;
}

async function enqueueCreate(
  { appId, onesignalId, subscriptionId, subscriptionType }: SessionUser,
  sessionId: string,
  { startTimestamp, sessionsApiStartTimestamp, notificationId }: Session,
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
      startTime: sessionsApiStartTimestamp ?? startTimestamp,
      // A click attributes the session it opened, not one split from it.
      directAttributionId: (sessionsApiStartTimestamp === undefined && notificationId) || undefined,
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

/**
 * Moves the session to the user who logged in or out. A held create moves with
 * the session and keeps its start time. An anonymous session whose create went
 * out stays on that user, so a login adds no session; the external ID is kept
 * so a later switch splits. A logged-in user's session splits, even while its
 * create waits for server IDs: the worker never gets that user's, so that part
 * is not reported rather than counted for the next user. A session past the
 * threshold is left for the next upsert to end.
 */
export async function switchSessionUser(options: UpsertOrDeactivateSessionPayload): Promise<void> {
  // A split ends a session whose create may have just gone out.
  if (await serializeSessionRefresh(() => moveOrSplitSession(options))) {
    await drainSessionRequests(true);
  }
}

async function moveOrSplitSession(user: UpsertOrDeactivateSessionPayload): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.usesSessionsApi || !session.sessionId || hasExpired(session, user)) return false;
  // Sent again once the switch finishes, with the server IDs.
  if (session.externalId === user.externalId) return releaseHeldCreate(user, session, false);

  if (session.externalId && !session.isCreateHeld) return splitSession(user, session);

  if (isCreateHeld(session)) {
    session.onesignalId = user.onesignalId;
    session.subscriptionId = user.subscriptionId;
    // Local IDs may have been the only hold, and the new IDs can be server ones.
    session.isCreateHeld = true;
  }
  session.externalId = user.externalId;
  if (await releaseHeldCreate(user, session, false)) return true;
  await db.put('Sessions', session);
  return false;
}

function hasExpired(session: Session, { sessionThreshold }: UpsertOrDeactivateSessionPayload) {
  return (
    session.status === SessionStatus._Inactive &&
    !!session.lastDeactivatedTimestamp &&
    timeInSecondsBetweenTimestamps(Date.now(), session.lastDeactivatedTimestamp) > sessionThreshold
  );
}

/**
 * Ends the session at the switch and starts the next one for the new user,
 * held like any new session. Only the sessions API session splits: the app
 * session, its start time and the legacy reporting go on, so no on_session,
 * outcome reset or click cleanup runs. In the background the session ends now
 * with the duration it has, and the next one starts on the next activation.
 */
async function splitSession(user: UpsertOrDeactivateSessionPayload, session: Session) {
  const now = Date.now();
  const active = session.status === SessionStatus._Active;
  const duration =
    session.accumulatedDuration +
    (active ? timeInSecondsBetweenTimestamps(now, session.lastActivatedTimestamp) : 0);
  const endTime = active ? now : (session.lastDeactivatedTimestamp ?? now);
  const endQueued = await enqueueDurationUpdate(
    user,
    { ...session, accumulatedDuration: duration },
    endTime,
  );

  Object.assign(session, {
    sessionId: crypto.randomUUID(),
    onesignalId: user.onesignalId,
    subscriptionId: user.subscriptionId,
    externalId: user.externalId,
    isCreateHeld: true,
    isSplitPending: !active,
    sessionsApiStartTimestamp: now,
    accumulatedDuration: 0,
    checkpointedDuration: undefined,
    lastActivatedTimestamp: active ? now : session.lastActivatedTimestamp,
  } satisfies Partial<Session>);
  const createQueued = await releaseHeldCreate(user, session, false);
  if (!createQueued) await db.put('Sessions', session);
  return endQueued || createQueued;
}

/** The caller saves the session. */
function startPendingSplit(user: SessionUser, session: Session): Promise<boolean> {
  session.isSplitPending = false;
  session.sessionsApiStartTimestamp = session.lastActivatedTimestamp;
  return releaseHeldCreate(user, session, false);
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
  const createQueued = await releaseHeldCreate(
    options,
    existingSession,
    isBackgroundOrigin(options.sessionOrigin),
  );

  // The finalize step reuses this payload after the threshold, so a token the
  // page refreshes in that window is not used for the session_time request.
  // The caller stores this timer's cancel only once deactivate returns, so an
  // upsert that arrives meanwhile cannot cancel it. The stored row is the truth:
  // a session that resumed and went inactive again has a newer deactivate time.
  // The drain runs outside the refresh chain, since it can wait out the post-create delay.
  const finalizeSWSession = async () => {
    const endQueued = await serializeSessionRefresh(async () => {
      const current = await getCurrentSession();
      if (
        current?.status !== SessionStatus._Inactive ||
        current.startTimestamp !== existingSession.startTimestamp ||
        current.lastDeactivatedTimestamp !== existingSession.lastDeactivatedTimestamp
      ) {
        Log._debug('Finalize skipped, session resumed or replaced');
        return false;
      }
      return finalizeSession(options, current);
    });
    if (endQueued) await drainSessionRequests(true);
  };

  /**
   * For 2 subsequent deactivate requests we need to make sure there is an active finalization timeout.
   * Timer gets cleaned up before figuring out it's activate or deactivate.
   * No update needed for the session, early return.
   */
  if (existingSession.status === SessionStatus._Inactive) {
    // A blur made the session inactive without a checkpoint; the tab hiding later does.
    const checkpointQueued = await enqueueCheckpoint(options, existingSession);
    const saved = !checkpointQueued || (await saveCheckpointedDuration(existingSession));
    if (checkpointQueued || createQueued) void drainSessionRequests(true);
    return saved ? cancelableTimeout(finalizeSWSession, thresholdInSeconds) : undefined;
  }

  /**
   * Can only be active or expired at this point, but more statuses may come in in the future.
   * For anything but active, logging a warning and doing early return.
   */
  if (existingSession.status !== SessionStatus._Active) {
    Log._warn(`Invalid session state: ${String(existingSession.status)}`);
    if (createQueued) void drainSessionRequests();
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
  // Not awaited, so the caller gets the finalize timer without waiting on the
  // network. That timer keeps the worker alive while the drain waits for the update.
  if (checkpointQueued || createQueued) void drainSessionRequests(true);

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
  if (await serializeSessionRefresh(() => enqueueHeartbeat(options))) {
    await drainSessionRequests(true);
  }
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
  const createQueued = await releaseHeldCreate(options, session, true);
  if (!(await enqueueDurationUpdate(options, { ...session, accumulatedDuration: duration }))) {
    return createQueued;
  }
  return (
    (await saveCheckpointedDuration({ ...session, checkpointedDuration: duration })) || createQueued
  );
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
  const createQueued = await releaseHeldCreate(options, session, true);
  const endQueued = (await enqueueDurationUpdate(options, session, endedAt)) || createQueued;
  // The backend derives session_time and the duration outcome from a Sessions API
  // session. One whose create never queued is unknown to it, so the legacy
  // request reports it, unless the page's IDs are still local too.
  const reportedToApi =
    session.usesSessionsApi &&
    (!isCreateHeld(session) || hasLocalId(options.onesignalId, options.subscriptionId));
  if (sendOnFocusEnabled && !reportedToApi) {
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
 * too. Skipped when the create was not queued: still held, or a page that sends
 * no subscription type.
 */
async function enqueueDurationUpdate(
  { subscriptionType }: UpsertOrDeactivateSessionPayload,
  session: Session,
  endTime?: number,
): Promise<boolean> {
  const { appId, sessionId, usesSessionsApi, onesignalId, subscriptionId } = session;
  if (!usesSessionsApi || !sessionId) return false;
  if (!subscriptionType || !onesignalId || !subscriptionId || isCreateHeld(session)) {
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
