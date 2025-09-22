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
import MainHelper from '../../helpers/MainHelper';
import Log from '../../libraries/Log';
import { WorkerMessengerCommand } from '../../libraries/workerMessenger/constants';
import type { ISessionManager } from './types';

export class SessionManager implements ISessionManager {
  private context: ContextInterface;
  private onSessionSent = false;

  constructor(context: ContextInterface) {
    this.context = context;
  }

  async notifySWToUpsertSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const payload: UpsertOrDeactivateSessionPayload = {
      onesignalId,
      subscriptionId,
      appId: this.context._appConfig.appId,
      sessionThreshold: this.context._appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this.context._appConfig.enableSessionDuration,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this.context._appConfig.userConfig.outcomes!,
    };
    if (supportsServiceWorkers()) {
      Log._debug('Notify SW to upsert session');
      await this.context._workerMessenger.unicast(
        WorkerMessengerCommand.SessionUpsert,
        payload,
      );
    } else {
      // http w/o our iframe
      // we probably shouldn't even be here
      Log._debug('Notify upsert: do nothing');
    }
  }

  async notifySWToDeactivateSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOriginValue,
  ): Promise<void> {
    const payload: UpsertOrDeactivateSessionPayload = {
      appId: this.context._appConfig.appId,
      subscriptionId,
      onesignalId,
      sessionThreshold: this.context._appConfig.sessionThreshold!,
      enableSessionDuration: this.context._appConfig.enableSessionDuration!,
      sessionOrigin,
      isSafari: hasSafariWindow(),
      outcomesConfig: this.context._appConfig.userConfig.outcomes!,
    };
    if (supportsServiceWorkers()) {
      Log._debug('Notify SW to deactivate session');
      await this.context._workerMessenger.unicast(
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

    if (!identityModel || !identityModel.onesignalId) {
      throw new Error('No identity');
    }

    if (
      !pushSubscriptionModel ||
      !isCompleteSubscriptionObject(pushSubscriptionModel)
    ) {
      throw new Error('No subscription');
    }

    const { onesignalId } = identityModel;
    const { id: subscriptionId } = pushSubscriptionModel;

    return { onesignalId, subscriptionId };
  }

  async handleVisibilityChange(): Promise<void> {
    await LoginManager.switchingUsersPromise;

    if (!User.singletonInstance?.onesignalId) {
      return;
    }

    try {
      const visibilityState = document.visibilityState;
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();

      if (visibilityState === 'visible') {
        this.setupOnFocusAndOnBlurForSession();

        Log._debug(
          'handleVisibilityChange',
          'visible',
          `hasFocus: ${document.hasFocus()}`,
        );

        if (document.hasFocus()) {
          await this.notifySWToUpsertSession(
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

        await this.notifySWToDeactivateSession(
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

  async handleOnBeforeUnload(): Promise<void> {
    await LoginManager.switchingUsersPromise;

    if (!User.singletonInstance?.onesignalId) {
      return;
    }

    try {
      // don't have much time on before unload
      // have to skip adding device record to the payload
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      const payload: UpsertOrDeactivateSessionPayload = {
        appId: this.context._appConfig.appId,
        onesignalId,
        subscriptionId,
        sessionThreshold: this.context._appConfig.sessionThreshold!,
        enableSessionDuration: this.context._appConfig.enableSessionDuration!,
        sessionOrigin: SessionOrigin.BeforeUnload,
        isSafari: hasSafariWindow(),
        outcomesConfig: this.context._appConfig.userConfig.outcomes!,
      };

      Log._debug('Notify SW to deactivate session (beforeunload)');
      this.context._workerMessenger.directPostMessageToSW(
        WorkerMessengerCommand.SessionDeactivate,
        payload,
      );
    } catch (e) {
      Log._error('Error handling onbeforeunload:', e);
    }
  }

  async handleOnFocus(e: Event): Promise<void> {
    await LoginManager.switchingUsersPromise;

    Log._debug('handleOnFocus', e);
    if (!User.singletonInstance?.onesignalId) {
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
      await this.notifySWToUpsertSession(
        onesignalId,
        subscriptionId,
        SessionOrigin.Focus,
      );
    } catch (e) {
      Log._error('Error handling focus:', e);
    }
  }

  async handleOnBlur(e: Event): Promise<void> {
    await LoginManager.switchingUsersPromise;

    Log._debug('handleOnBlur', e);
    if (!User.singletonInstance?.onesignalId) {
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
      await this.notifySWToDeactivateSession(
        onesignalId,
        subscriptionId,
        SessionOrigin.Blur,
      );
    } catch (e) {
      Log._error('Error handling blur:', e);
    }
  }

  async upsertSession(sessionOrigin: SessionOriginValue): Promise<void> {
    await LoginManager.switchingUsersPromise;

    if (User.singletonInstance?.onesignalId) {
      const { onesignalId, subscriptionId } =
        await this._getOneSignalAndSubscriptionIds();
      await this.notifySWToUpsertSession(
        onesignalId,
        subscriptionId,
        sessionOrigin,
      );
    }

    if (supportsServiceWorkers()) {
      this.setupSessionEventListeners();
    } else {
      this.onSessionSent = sessionOrigin === SessionOrigin.UserCreate;
      OneSignal._emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }
  }

  setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (!supportsServiceWorkers()) {
      Log._debug(
        'Not setting session event listeners. No service worker possible.',
      );
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this.setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignal._cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange.bind(this),
        true,
      );
      OneSignal._cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignal._cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener(
        'beforeunload',
        (e) => {
          this.handleOnBeforeUnload();
          // deleting value to not show confirmation dialog
          delete e.returnValue;
        },
        true,
      );
      OneSignal._cache.isBeforeUnloadEventSetup = true;
    }
  }

  setupOnFocusAndOnBlurForSession(): void {
    Log._debug('setupOnFocusAndOnBlurForSession');

    if (!OneSignal._cache.focusHandler) {
      OneSignal._cache.focusHandler = this.handleOnFocus.bind(this);
    }
    if (!OneSignal._cache.isFocusEventSetup) {
      window.addEventListener('focus', OneSignal._cache.focusHandler, true);
      OneSignal._cache.isFocusEventSetup = true;
    }

    if (!OneSignal._cache.blurHandler) {
      OneSignal._cache.blurHandler = this.handleOnBlur.bind(this);
    }
    if (!OneSignal._cache.isBlurEventSetup) {
      window.addEventListener('blur', OneSignal._cache.blurHandler, true);
      OneSignal._cache.isBlurEventSetup = true;
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  async sendOnSessionUpdateFromPage(): Promise<void> {
    const earlyReturn = this.onSessionSent || !isFirstPageView();

    if (earlyReturn) {
      return;
    }

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    const onesignalId = identityModel.onesignalId;

    if (!onesignalId) {
      Log._debug(
        'Not sending the on session because user is not registered with OneSignal (no onesignal id)',
      );
      return;
    }

    const pushSubscription =
      await OneSignal._coreDirector._getPushSubscriptionModel();
    if (
      pushSubscription?.notification_types !== NotificationType.Subscribed &&
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
        label: IdentityConstants.ONESIGNAL_ID,
        id: onesignalId,
      };
      // TO DO: in future, we should aggregate session count in case network call fails
      const updateUserPayload: IUpdateUser = {
        refresh_device_metadata: true,
        deltas: {
          session_count: 1,
        },
      };

      const appId = MainHelper.getAppId();
      enforceAppId(appId);
      enforceAlias(aliasPair);
      try {
        await updateUserByAlias(
          { appId, subscriptionId },
          aliasPair,
          updateUserPayload,
        );
        this.onSessionSent = true;
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
