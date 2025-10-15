import { IdentityConstants } from 'src/core/constants';
import { updateUserByAlias } from 'src/core/requests/api';
import type { IUpdateUser } from 'src/core/types/api';
import { enforceAlias, enforceAppId } from 'src/shared/context/helpers';
import type { ContextInterface } from 'src/shared/context/types';
import {
  hasSafariWindow,
  supportsServiceWorkers,
} from 'src/shared/environment/detect';
import { isFirstPageView } from 'src/shared/helpers/pageview';
import { SessionOrigin } from 'src/shared/session/constants';
import type {
  SessionOriginValue,
  UpsertOrDeactivateSessionPayload,
} from 'src/shared/session/types';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { isCompleteSubscriptionObject } from '../../../core/utils/typePredicates';
import User from '../../../onesignal/User';
import LoginManager from '../../../page/managers/LoginManager';
import { getAppId } from '../../helpers/main';
import Log from '../../libraries/Log';
import { WorkerMessengerCommand } from '../../libraries/workerMessenger/constants';
import type { ISessionManager } from './types';

export class SessionManager implements ISessionManager {
  private _context: ContextInterface;
  private _onSessionSent = false;

  constructor(context: ContextInterface) {
    this._context = context;
  }

  async _notifySWToUpsertSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const payload: UpsertOrDeactivateSessionPayload = {
      onesignalId,
      subscriptionId,
      appId: this._context._appConfig.appId,
      sessionThreshold: this._context._appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this._context._appConfig.enableSessionDuration,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this._context._appConfig.userConfig.outcomes!,
    };
    if (supportsServiceWorkers()) {
      Log._debug('Notify SW to upsert session');
      await this._context._workerMessenger._unicast(
        WorkerMessengerCommand.SessionUpsert,
        payload,
      );
    } else {
      // http w/o our iframe
      // we probably shouldn't even be here
      Log._debug('Notify upsert: do nothing');
    }
  }

  async _notifySWToDeactivateSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const payload: UpsertOrDeactivateSessionPayload = {
      appId: this._context._appConfig.appId,
      subscriptionId,
      onesignalId,
      sessionThreshold: this._context._appConfig.sessionThreshold!,
      enableSessionDuration: this._context._appConfig.enableSessionDuration!,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this._context._appConfig.userConfig.outcomes!,
    };
    if (supportsServiceWorkers()) {
      Log._debug('Notify SW to deactivate session');
      await this._context._workerMessenger._unicast(
        WorkerMessengerCommand.SessionDeactivate,
        payload,
      );
    } else {
      // http w/o our iframe
      // we probably shouldn't even be here
      Log._debug('Notify deactivate: do nothing');
    }
  }

  private async _getOneSignalAndSubscriptionIds(): Promise<{
    onesignalId: string;
    subscriptionId: string;
  }> {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const pushSubscriptionModel =
      await OneSignal._coreDirector._getPushSubscriptionModel();

    if (!identityModel || !identityModel._onesignalId) {
      throw new Error('No identity');
    }

    if (
      !pushSubscriptionModel ||
      !isCompleteSubscriptionObject(pushSubscriptionModel)
    ) {
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
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();

      if (visibilityState === 'visible') {
        this._setupOnFocusAndOnBlurForSession();

        Log._debug(
          'handleVisibilityChange',
          'visible',
          `hasFocus: ${document.hasFocus()}`,
        );

        if (document.hasFocus()) {
          await this._notifySWToUpsertSession(
            onesignalId,
            subscriptionId,
            SessionOrigin.VisibilityVisible,
          );
        }
        return;
      }

      if (visibilityState === 'hidden') {
        Log._debug('handleVisibilityChange', 'hidden');
        if (
          OneSignal._cache.focusHandler &&
          OneSignal._cache.isFocusEventSetup
        ) {
          window.removeEventListener(
            'focus',
            OneSignal._cache.focusHandler,
            true,
          );
          OneSignal._cache.isFocusEventSetup = false;
        }
        if (OneSignal._cache.blurHandler && OneSignal._cache.isBlurEventSetup) {
          window.removeEventListener(
            'blur',
            OneSignal._cache.blurHandler,
            true,
          );
          OneSignal._cache.isBlurEventSetup = false;
        }

        await this._notifySWToDeactivateSession(
          onesignalId,
          subscriptionId,
          SessionOrigin.VisibilityHidden,
        );
        return;
      }

      // it should never be anything else at this point
      Log._warn('Unhandled visibility state happened', visibilityState);
    } catch (e) {
      Log._error('Error handling visibility change:', e);
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
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      const payload: UpsertOrDeactivateSessionPayload = {
        appId: this._context._appConfig.appId,
        onesignalId,
        subscriptionId,
        sessionThreshold: this._context._appConfig.sessionThreshold!,
        enableSessionDuration: this._context._appConfig.enableSessionDuration!,
        sessionOrigin: SessionOrigin.BeforeUnload,
        isSafari: hasSafariWindow(),
        outcomesConfig: this._context._appConfig.userConfig.outcomes!,
      };

      Log._debug('Notify SW to deactivate session (beforeunload)');
      this._context._workerMessenger._directPostMessageToSW(
        WorkerMessengerCommand.SessionDeactivate,
        payload,
      );
    } catch (e) {
      Log._error('Error handling onbeforeunload:', e);
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

      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(
        onesignalId,
        subscriptionId,
        SessionOrigin.Focus,
      );
    } catch (e) {
      Log._error('Error handling focus:', e);
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

      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToDeactivateSession(
        onesignalId,
        subscriptionId,
        SessionOrigin.Blur,
      );
    } catch (e) {
      Log._error('Error handling blur:', e);
    }
  }

  async _upsertSession(sessionOrigin: SessionOriginValue): Promise<void> {
    await LoginManager._switchingUsersPromise;

    if (User._singletonInstance?.onesignalId) {
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      await this._notifySWToUpsertSession(
        onesignalId,
        subscriptionId,
        sessionOrigin,
      );
    }

    if (supportsServiceWorkers()) {
      this._setupSessionEventListeners();
    } else {
      this._onSessionSent = sessionOrigin === SessionOrigin.UserCreate;
      OneSignal._emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }
  }

  _setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (!supportsServiceWorkers()) {
      Log._debug(
        'Not setting session event listeners. No service worker possible.',
      );
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this._setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignal._cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener(
        'visibilitychange',
        this._handleVisibilityChange.bind(this),
        true,
      );
      OneSignal._cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignal._cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener(
        'beforeunload',
        (e) => {
          this._handleOnBeforeUnload();
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
      Log._debug(
        'Not sending the on session because user is not registered with OneSignal (no onesignal id)',
      );
      return;
    }

    const pushSubscription =
      await OneSignal._coreDirector._getPushSubscriptionModel();
    if (
      pushSubscription?._notification_types !== NotificationType.Subscribed &&
      OneSignal.config?.enableOnSession !== true
    ) {
      return;
    }

    let subscriptionId;
    if (isCompleteSubscriptionObject(pushSubscription)) {
      subscriptionId = pushSubscription?.id;
    }

    try {
      const aliasPair = {
        label: IdentityConstants._OneSignalID,
        id: onesignalId,
      };
      // TO DO: in future, we should aggregate session count in case network call fails
      const updateUserPayload: IUpdateUser = {
        refresh_device_metadata: true,
        deltas: {
          session_count: 1,
        },
      };

      const appId = getAppId();
      enforceAppId(appId);
      enforceAlias(aliasPair);
      try {
        await updateUserByAlias(
          { appId, subscriptionId },
          aliasPair,
          updateUserPayload,
        );
        this._onSessionSent = true;
      } catch (e) {
        Log._debug('Error updating user session:', e);
      }
    } catch (e) {
      if (e instanceof Error) {
        Log._error(
          `Failed to update user session. Error "${e.message}" ${e.stack}`,
        );
      }
    }
  }
}
