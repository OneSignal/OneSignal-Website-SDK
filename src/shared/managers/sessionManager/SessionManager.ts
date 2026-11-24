import { resolveUserBackendParams } from 'src/core/executors/ivResolver';
import { isIvBehaviorActive } from 'src/core/identityVerification';
import { updateUserByAlias } from 'src/core/requests/api';
import type { IUpdateUser } from 'src/core/types/api';
import { enforceAlias, enforceAppId } from 'src/shared/context/helpers';
import type { ContextInterface } from 'src/shared/context/types';
import { hasSafariWindow, supportsServiceWorkers } from 'src/shared/environment/detect';
import { FeatureFlag, isFeatureEnabled } from 'src/shared/features/featureFlags';
import { getResponseStatusType, ResponseStatusType } from 'src/shared/helpers/network';
import { isFirstPageView } from 'src/shared/helpers/pageview';
import { SessionOrigin } from 'src/shared/session/constants';
import type {
  SessionOriginValue,
  SessionUser,
  UpsertOrDeactivateSessionPayload,
} from 'src/shared/session/types';
import { NotificationType } from 'src/shared/subscriptions/constants';

import User from '../../../onesignal/User';
import LoginManager from '../../../page/managers/LoginManager';
import { getAppId } from '../../helpers/main';
import Log from '../../libraries/Log';
import { WorkerMessengerCommand } from '../../libraries/workerMessenger/constants';
import { isCompleteSubscriptionObject } from '../utils';
import type { ISessionManager } from './types';

type SessionIds = Pick<SessionUser, 'onesignalId' | 'subscriptionId' | 'subscriptionType'>;

export class SessionManager implements ISessionManager {
  private _context: ContextInterface;
  private _onSessionSent = false;
  private _onSessionChain: Promise<void> = Promise.resolve();
  private _sessionStarted = false;
  private _heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  constructor(context: ContextInterface) {
    this._context = context;
  }

  /**
   * The worker holds an anonymous session's create, so it needs the external ID
   * without Identity Verification too. Under it, the message always goes out so
   * the worker session state stays correct; the worker skips the network request
   * when a token is missing.
   */
  private _userCredentials(): Pick<SessionUser, 'jwtRequired' | 'externalId' | 'jwt'> {
    const externalId = OneSignal._coreDirector._getIdentityModel()._externalId;
    if (!isIvBehaviorActive()) return { externalId };

    const jwt = externalId ? OneSignal._coreDirector._jwtTokenStore._getJwt(externalId) : undefined;
    return { jwtRequired: true, externalId, jwt };
  }

  private _sessionPayload(
    ids: SessionIds,
    sessionOrigin: SessionOriginValue,
  ): UpsertOrDeactivateSessionPayload {
    return {
      ...ids,
      appId: this._context._appConfig.appId,
      sessionThreshold: this._context._appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this._context._appConfig.enableSessionDuration,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this._context._appConfig.userConfig.outcomes!,
      heartbeatInterval: this._context._appConfig.heartbeatInterval,
      ...this._userCredentials(),
    };
  }

  _notifySWToUpsertSession(ids: SessionIds, sessionOrigin: SessionOriginValue): Promise<void> {
    const payload = this._sessionPayload(ids, sessionOrigin);
    if (supportsServiceWorkers()) {
      Log._debug('SW upsert session');
      this._context._workerMessenger._unicast(WorkerMessengerCommand._SessionUpsert, payload);
    } else {
      // http w/o our iframe
      // we probably shouldn't even be here
      Log._debug('Upsert: no-op');
    }
    return Promise.resolve();
  }

  _notifySWToDeactivateSession(ids: SessionIds, sessionOrigin: SessionOriginValue): Promise<void> {
    const payload = this._sessionPayload(ids, sessionOrigin);
    if (supportsServiceWorkers()) {
      Log._debug('SW deactivate session');
      this._context._workerMessenger._unicast(WorkerMessengerCommand._SessionDeactivate, payload);
    } else {
      // http w/o our iframe
      // we probably shouldn't even be here
      Log._debug('Deactivate: no-op');
    }
    return Promise.resolve();
  }

  public async _getOneSignalAndSubscriptionIds(): Promise<SessionIds> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const pushSubscriptionModel = await OneSignal._coreDirector._getPushSubscriptionModel();

    if (!identityModel || !identityModel._onesignalId) {
      throw new Error('No identity');
    }

    if (!pushSubscriptionModel || !isCompleteSubscriptionObject(pushSubscriptionModel)) {
      throw new Error('No subscription');
    }

    const { _onesignalId: onesignalId } = identityModel;
    const { id: subscriptionId, type: subscriptionType } = pushSubscriptionModel;

    return { onesignalId, subscriptionId, subscriptionType };
  }

  async _handleVisibilityChange(): Promise<void> {
    if (document.visibilityState === 'visible') this._startHeartbeat();
    else this._stopHeartbeat();

    await LoginManager._switchingUsersPromise;

    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      const visibilityState = document.visibilityState;
      const ids = await this._getOneSignalAndSubscriptionIds();

      if (visibilityState === 'visible') {
        this._setupOnFocusAndOnBlurForSession();

        Log._debug('handleVisibilityChange', 'visible', `hasFocus: ${document.hasFocus()}`);

        if (document.hasFocus()) {
          await this._notifySWToUpsertSession(ids, SessionOrigin._VisibilityVisible);
        }
        return;
      }

      if (visibilityState === 'hidden') {
        Log._debug('handleVisibilityChange', 'hidden');
        if (OneSignal._cache.focusHandler && OneSignal._cache.isFocusEventSetup) {
          window.removeEventListener('focus', OneSignal._cache.focusHandler, true);
          OneSignal._cache.isFocusEventSetup = false;
        }
        if (OneSignal._cache.blurHandler && OneSignal._cache.isBlurEventSetup) {
          window.removeEventListener('blur', OneSignal._cache.blurHandler, true);
          OneSignal._cache.isBlurEventSetup = false;
        }

        await this._notifySWToDeactivateSession(ids, SessionOrigin._VisibilityHidden);
        return;
      }

      // it should never be anything else at this point
      Log._warn('Unhandled visibility state', visibilityState);
    } catch (e) {
      Log._error('Visibility change error:', e);
    }
  }

  async _handlePageHide(): Promise<void> {
    this._stopHeartbeat();
    await LoginManager._switchingUsersPromise;

    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      // Little time before the page goes away, so the message skips the messenger.
      const ids = await this._getOneSignalAndSubscriptionIds();
      const payload = this._sessionPayload(ids, SessionOrigin._PageHide);

      Log._debug('SW deactivate (pagehide)');
      void this._context._workerMessenger._directPostMessageToSW(
        WorkerMessengerCommand._SessionDeactivate,
        payload,
      );
    } catch (e) {
      Log._error('pagehide error:', e);
    }
  }

  async _handleOnFocus(e: Event): Promise<void> {
    await LoginManager._switchingUsersPromise;

    Log._debug('handleOnFocus', e);
    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      /**
       * Firefox has 2 focus events with different targets (document and window).
       * While Chrome only has one on window.
       * Target check is important to avoid double-firing of the event.
       */
      if (e.target !== window) {
        return;
      }

      const ids = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(ids, SessionOrigin._Focus);
    } catch (e) {
      Log._error('Focus error:', e);
    }
  }

  async _handleOnBlur(e: Event): Promise<void> {
    await LoginManager._switchingUsersPromise;

    Log._debug('handleOnBlur', e);
    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      /**
       * Firefox has 2 focus events with different targets (document and window).
       * While Chrome only has one on window.
       * Target check is important to avoid double-firing of the event.
       */
      if (e.target !== window) {
        return;
      }

      const ids = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToDeactivateSession(ids, SessionOrigin._Blur);
    } catch (e) {
      Log._error('Blur error:', e);
    }
  }

  /**
   * Tells the worker the user switched, so it moves or splits the session at
   * this moment. Sent first with the new user's IDs as they are, which can be
   * local, and again once the switch finishes, so a held create can go out with
   * the server IDs. Other session messages wait for the switch, so they
   * usually follow it; the worker covers one that does not.
   */
  async _handleUserSwitch(): Promise<void> {
    if (!supportsServiceWorkers()) return;
    // A visitor who never subscribed has no worker, and the send would log an error.
    if (!(await this._context._serviceWorkerManager._getOneSignalRegistration())) return;
    await this._notifySWOfUserSwitch();
    await LoginManager._switchingUsersPromise;
    await this._notifySWOfUserSwitch();
  }

  private async _notifySWOfUserSwitch(): Promise<void> {
    try {
      const ids = await this._getOneSignalAndSubscriptionIds();
      this._context._workerMessenger._unicast(
        WorkerMessengerCommand._SessionUserSwitch,
        this._sessionPayload(ids, SessionOrigin._UserSwitch),
      );
    } catch (e) {
      Log._debug('User switch: no session update', e);
    }
  }

  async _upsertSession(sessionOrigin: SessionOriginValue): Promise<void> {
    await LoginManager._switchingUsersPromise;
    this._sessionStarted = true;

    if (User._singletonInstance?.onesignalId) {
      const ids = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(ids, sessionOrigin);
    }

    if (supportsServiceWorkers()) {
      this._setupSessionEventListeners();
    } else {
      void OneSignal._emitter._emit(OneSignal.EVENTS.SESSION_STARTED);
    }
  }

  /**
   * The worker can be stopped while idle, so a visible tab drives the
   * heartbeat. Each visible tab ticks; the worker sends at most one request
   * per interval across them. Ticks once on start too, since a timer restarts
   * on every page load and tab switch and might never reach a full interval.
   * Called again once the feature flags refresh, which can start or stop it,
   * since a page load reads the cached list. Gated on the live flag, so a
   * rollback also stops heartbeats for sessions already on the sessions API;
   * their checkpoints and end still carry the full duration.
   */
  _startHeartbeat(): void {
    if (!isFeatureEnabled(FeatureFlag._SessionsV2ApiCutover)) return this._stopHeartbeat();
    if (
      this._heartbeatTimer ||
      document.visibilityState !== 'visible' ||
      !OneSignal._cache.isVisibilityChangeEventSetup
    ) {
      return;
    }
    this._heartbeatTimer = setInterval(
      () => void this._sendHeartbeat(),
      this._context._appConfig.heartbeatInterval * 1000,
    );
    void this._sendHeartbeat();
  }

  _stopHeartbeat(): void {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = undefined;
  }

  private async _sendHeartbeat(): Promise<void> {
    await LoginManager._switchingUsersPromise;
    if (document.visibilityState !== 'visible' || !User._singletonInstance?.onesignalId) return;
    try {
      const ids = await this._getOneSignalAndSubscriptionIds();
      this._context._workerMessenger._unicast(
        WorkerMessengerCommand._SessionHeartbeat,
        this._sessionPayload(ids, SessionOrigin._Heartbeat),
      );
    } catch (e) {
      Log._error('Heartbeat error:', e);
    }
  }

  _setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (!supportsServiceWorkers()) {
      Log._debug('No SW support, skipping session listeners');
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this._setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignal._cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener('visibilitychange', this._handleVisibilityChange.bind(this), true);
      OneSignal._cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignal._cache.isPageHideEventSetup) {
      // Fires on tab close, reload and navigation, including where beforeunload does not, like mobile Safari.
      window.addEventListener('pagehide', () => void this._handlePageHide(), true);
      OneSignal._cache.isPageHideEventSetup = true;
    }

    this._startHeartbeat();
  }

  _setupOnFocusAndOnBlurForSession(): void {
    Log._debug('setupOnFocusAndOnBlurForSession');

    if (!OneSignal._cache.focusHandler) {
      OneSignal._cache.focusHandler = this._handleOnFocus.bind(this);
    }
    if (!OneSignal._cache.isFocusEventSetup) {
      window.addEventListener('focus', OneSignal._cache.focusHandler, true);
      OneSignal._cache.isFocusEventSetup = true;
    }

    if (!OneSignal._cache.blurHandler) {
      OneSignal._cache.blurHandler = this._handleOnBlur.bind(this);
    }
    if (!OneSignal._cache.isBlurEventSetup) {
      window.addEventListener('blur', OneSignal._cache.blurHandler, true);
      OneSignal._cache.isBlurEventSetup = true;
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  // Sends run one at a time, so a token update during a request re-checks the
  // flag after that request settles instead of sending a second on_session.
  _sendOnSessionUpdateFromPage(): Promise<void> {
    const run = this._onSessionChain.then(() => this._sendOnSessionUpdate());
    this._onSessionChain = run.catch(() => undefined);
    return run;
  }

  private async _sendOnSessionUpdate(): Promise<void> {
    const earlyReturn = this._onSessionSent || !isFirstPageView();

    if (earlyReturn) {
      return;
    }

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const onesignalId = identityModel._onesignalId;

    if (!onesignalId) {
      Log._debug('No onesignal id, skipping on_session');
      return;
    }

    // An anonymous user has no backend user under IV, so there is nothing to update.
    const externalId = identityModel._externalId;
    if (isIvBehaviorActive() && !externalId) {
      Log._debug('No external id under Identity Verification, skipping on_session');
      return;
    }

    const pushSubscription = await OneSignal._coreDirector._getPushSubscriptionModel();
    if (
      pushSubscription?._notification_types !== NotificationType._Subscribed &&
      OneSignal.config?.enableOnSession !== true
    ) {
      return;
    }

    let subscriptionId;
    if (isCompleteSubscriptionObject(pushSubscription)) {
      subscriptionId = pushSubscription?.id;
    }

    try {
      const { alias, jwt } = resolveUserBackendParams(
        { onesignalId, externalId },
        'on_session',
        OneSignal._coreDirector._jwtTokenStore,
      );
      // Checked after the await above, so a token removed in the meantime is seen.
      // A request without a token can only get a 401.
      if (isIvBehaviorActive() && !jwt) {
        Log._debug('No JWT under Identity Verification, skipping on_session');
        return;
      }
      // TO DO: in future, we should aggregate session count in case network call fails
      const updateUserPayload: IUpdateUser = {
        refresh_device_metadata: true,
        deltas: {
          session_count: 1,
        },
      };

      const appId = getAppId();
      enforceAppId(appId);
      enforceAlias(alias);
      try {
        const response = await updateUserByAlias(
          { appId, subscriptionId, jwt },
          alias,
          updateUserPayload,
        );
        // After a 401 or a failed request the flag stays clear, so a fresh token
        // can send this page view's on_session. A 403 counts as sent.
        if (response.status !== 401) this._onSessionSent = true;
        const unauthorized =
          getResponseStatusType(response.status) === ResponseStatusType._Unauthorized;
        if (unauthorized && jwt && externalId) {
          this._invalidateJwtAfterUnauthorized(externalId, jwt);
        }
      } catch (e) {
        Log._debug('Session update error:', e);
      }
    } catch (e) {
      if (e instanceof Error) {
        Log._error(`Session update failed: "${e.message}" ${e.stack}`);
      }
    }
  }

  /**
   * A token stored after the session started. Without a worker the page sends the
   * on_session it skipped or that got a 401. With a worker the page asks for an
   * upsert, and the worker sends on_session only if its session still waits for
   * a token. Before the session start the normal flow carries the token.
   */
  async _handleJwtUpdated(externalId: string): Promise<void> {
    if (!this._sessionStarted || !isIvBehaviorActive()) return;
    if (OneSignal._coreDirector._getIdentityModel()._externalId !== externalId) return;

    if (!supportsServiceWorkers()) {
      await this._sendOnSessionUpdateFromPage();
      return;
    }

    // An upsert from a hidden tab resets the worker's finalize timer, so the
    // session_time would move out on every token refresh. The next focus upsert
    // carries the token anyway.
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return;

    await LoginManager._switchingUsersPromise;
    if (!User._singletonInstance?.onesignalId) return;
    try {
      const ids = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(ids, SessionOrigin._JwtUpdated);
    } catch (e) {
      Log._error('JWT update session error:', e);
    }
  }

  // Same rule as the operation queue: a 401 only says the token the request went
  // out with is bad. A newer stored token is kept.
  private _invalidateJwtAfterUnauthorized(externalId: string, jwtAtRequest: string): void {
    const jwtTokenStore = OneSignal._coreDirector._jwtTokenStore;
    if (jwtTokenStore._getJwt(externalId) === jwtAtRequest) {
      jwtTokenStore._invalidateJwt(externalId);
      Log._debug('on_session: 401, JWT invalidated');
    } else {
      Log._debug('on_session: 401, newer JWT kept');
    }
  }
}
