import { resolveUserBackendParams } from 'src/core/executors/ivResolver';
import { isIvBehaviorActive } from 'src/core/identityVerification';
import { updateUserByAlias } from 'src/core/requests/api';
import type { IUpdateUser } from 'src/core/types/api';
import { enforceAlias, enforceAppId } from 'src/shared/context/helpers';
import type { ContextInterface } from 'src/shared/context/types';
import { hasSafariWindow, supportsServiceWorkers } from 'src/shared/environment/detect';
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

export class SessionManager implements ISessionManager {
  private _context: ContextInterface;
  private _onSessionSent = false;

  constructor(context: ContextInterface) {
    this._context = context;
  }

  /**
   * The ids the worker needs to sign a session request. Under IV an anonymous
   * user has no backend user, and a missing token would only produce a 401, so
   * both return null and the caller skips the message.
   */
  private _ivSessionCredentials(): Pick<SessionUser, 'externalId' | 'jwt'> | null {
    if (!isIvBehaviorActive()) return {};

    const externalId = OneSignal._coreDirector._getIdentityModel()._externalId;
    if (!externalId) {
      Log._debug('No external id under Identity Verification, skipping session message');
      return null;
    }
    const jwt = OneSignal._coreDirector._jwtTokenStore._getJwt(externalId);
    if (!jwt) {
      Log._debug('No JWT under Identity Verification, skipping session message');
      return null;
    }
    return { externalId, jwt };
  }

  _notifySWToUpsertSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const credentials = this._ivSessionCredentials();
    if (!credentials) return Promise.resolve();

    const payload: UpsertOrDeactivateSessionPayload = {
      onesignalId,
      subscriptionId,
      appId: this._context._appConfig.appId,
      sessionThreshold: this._context._appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this._context._appConfig.enableSessionDuration,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this._context._appConfig.userConfig.outcomes!,
      ...credentials,
    };
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

  _notifySWToDeactivateSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const credentials = this._ivSessionCredentials();
    if (!credentials) return Promise.resolve();

    const payload: UpsertOrDeactivateSessionPayload = {
      appId: this._context._appConfig.appId,
      subscriptionId,
      onesignalId,
      sessionThreshold: this._context._appConfig.sessionThreshold!,
      enableSessionDuration: this._context._appConfig.enableSessionDuration!,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this._context._appConfig.userConfig.outcomes!,
      ...credentials,
    };
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

  public async _getOneSignalAndSubscriptionIds(): Promise<{
    onesignalId: string;
    subscriptionId: string;
  }> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const pushSubscriptionModel = await OneSignal._coreDirector._getPushSubscriptionModel();

    if (!identityModel || !identityModel._onesignalId) {
      throw new Error('No identity');
    }

    if (!pushSubscriptionModel || !isCompleteSubscriptionObject(pushSubscriptionModel)) {
      throw new Error('No subscription');
    }

    const { _onesignalId: onesignalId } = identityModel;
    const { id: subscriptionId } = pushSubscriptionModel;

    return { onesignalId, subscriptionId };
  }

  async _handleVisibilityChange(): Promise<void> {
    await LoginManager._switchingUsersPromise;

    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      const visibilityState = document.visibilityState;
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();

      if (visibilityState === 'visible') {
        this._setupOnFocusAndOnBlurForSession();

        Log._debug('handleVisibilityChange', 'visible', `hasFocus: ${document.hasFocus()}`);

        if (document.hasFocus()) {
          await this._notifySWToUpsertSession(
            onesignalId,
            subscriptionId,
            SessionOrigin._VisibilityVisible,
          );
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

        await this._notifySWToDeactivateSession(
          onesignalId,
          subscriptionId,
          SessionOrigin._VisibilityHidden,
        );
        return;
      }

      // it should never be anything else at this point
      Log._warn('Unhandled visibility state', visibilityState);
    } catch (e) {
      Log._error('Visibility change error:', e);
    }
  }

  async _handleOnBeforeUnload(): Promise<void> {
    await LoginManager._switchingUsersPromise;

    if (!User._singletonInstance?.onesignalId) {
      return;
    }

    try {
      // don't have much time on before unload
      // have to skip adding device record to the payload
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      const credentials = this._ivSessionCredentials();
      if (!credentials) return;

      const payload: UpsertOrDeactivateSessionPayload = {
        appId: this._context._appConfig.appId,
        onesignalId,
        subscriptionId,
        sessionThreshold: this._context._appConfig.sessionThreshold!,
        enableSessionDuration: this._context._appConfig.enableSessionDuration!,
        sessionOrigin: SessionOrigin._BeforeUnload,
        isSafari: hasSafariWindow(),
        outcomesConfig: this._context._appConfig.userConfig.outcomes!,
        ...credentials,
      };

      Log._debug('SW deactivate (beforeunload)');
      void this._context._workerMessenger._directPostMessageToSW(
        WorkerMessengerCommand._SessionDeactivate,
        payload,
      );
    } catch (e) {
      Log._error('beforeunload error:', e);
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

      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(onesignalId, subscriptionId, SessionOrigin._Focus);
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

      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToDeactivateSession(onesignalId, subscriptionId, SessionOrigin._Blur);
    } catch (e) {
      Log._error('Blur error:', e);
    }
  }

  async _upsertSession(sessionOrigin: SessionOriginValue): Promise<void> {
    await LoginManager._switchingUsersPromise;

    if (User._singletonInstance?.onesignalId) {
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(onesignalId, subscriptionId, sessionOrigin);
    }

    if (supportsServiceWorkers()) {
      this._setupSessionEventListeners();
    } else {
      void OneSignal._emitter._emit(OneSignal.EVENTS.SESSION_STARTED);
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

    if (!OneSignal._cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener(
        'beforeunload',
        (e) => {
          void this._handleOnBeforeUnload();
          // deleting value to not show confirmation dialog
          delete e.returnValue;
        },
        true,
      );
      OneSignal._cache.isBeforeUnloadEventSetup = true;
    }
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
  async _sendOnSessionUpdateFromPage(): Promise<void> {
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

    // An anonymous user has no backend user under IV, and a request without a
    // token can only get a 401, so neither is worth a request.
    const externalId = identityModel._externalId;
    const jwtTokenStore = OneSignal._coreDirector._jwtTokenStore;
    if (isIvBehaviorActive()) {
      if (!externalId) {
        Log._debug('No external id under Identity Verification, skipping on_session');
        return;
      }
      if (!jwtTokenStore._getJwt(externalId)) {
        Log._debug('No JWT under Identity Verification, skipping on_session');
        return;
      }
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
        jwtTokenStore,
      );
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
        this._onSessionSent = true;
        if (
          jwt &&
          externalId &&
          getResponseStatusType(response.status) === ResponseStatusType._Unauthorized
        ) {
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
