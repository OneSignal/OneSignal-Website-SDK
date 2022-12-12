import { ContextInterface } from "../../../page/models/Context";
import { WorkerMessengerCommand } from "../../libraries/WorkerMessenger";
import { OneSignalUtils } from "../../utils/OneSignalUtils";
import { SubscriptionStateKind } from "../../models/SubscriptionStateKind";
import { ISessionManager } from "./types";
import { SessionOrigin, UpsertOrDeactivateSessionPayload } from "../../models/Session";
import MainHelper from "../../helpers/MainHelper";
import Log from "../../libraries/Log";
import OneSignal from "../../../onesignal/OneSignal";
import { isCompleteSubscriptionObject } from "../../../core/utils/typePredicates";
import OneSignalError from "../../../shared/errors/OneSignalError";
import User from "../../../onesignal/User";
import { RequestService } from "../../../core/requestService/RequestService";
import AliasPair from "../../../core/requestService/AliasPair";
import { UpdateUserPayload } from "../../../core/requestService/UpdateUserPayload";
import Utils from "../../../shared/context/Utils";

export class SessionManager implements ISessionManager {
  private context: ContextInterface;
  private onSessionSent: boolean = false;

  constructor(context: ContextInterface) {
    this.context = context;
  }

  async notifySWToUpsertSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const isHttps = OneSignalUtils.isHttps();

    const payload: UpsertOrDeactivateSessionPayload = {
      onesignalId,
      subscriptionId,
      appId: this.context.appConfig.appId,
      sessionThreshold: this.context.appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this.context.appConfig.enableSessionDuration,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo?.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo?.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to upsert session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
    } else if (this.context.environmentInfo?.canTalkToServiceWorker &&
        this.context.environmentInfo?.isUsingSubscriptionWorkaround) {
      Log.debug("Notify iframe to notify SW to upsert session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_UPSERT, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify upsert: do nothing");
    }
  }

  async notifySWToDeactivateSession(
    onesignalId: string,
    subscriptionId: string,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const isHttps = OneSignalUtils.isHttps();

    const payload: UpsertOrDeactivateSessionPayload = {
      appId: this.context.appConfig.appId,
      subscriptionId,
      onesignalId,
      sessionThreshold: this.context.appConfig.sessionThreshold!,
      enableSessionDuration: this.context.appConfig.enableSessionDuration!,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo?.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo?.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to deactivate session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
    } else if (this.context.environmentInfo?.canTalkToServiceWorker &&
        this.context.environmentInfo?.isUsingSubscriptionWorkaround) {
      Log.debug("Notify SW to deactivate session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify deactivate: do nothing");
    }
  }

  async _getOneSignalAndSubscriptionIds(): Promise<{ onesignalId: string; subscriptionId: string }> {
    const identityModel = await OneSignal.coreDirector.getIdentityModel();
    const pushSubscriptionModel = await OneSignal.coreDirector.getPushSubscriptionModel();

    if (!identityModel || !identityModel.onesignalId) {
      throw new OneSignalError("Abort _getOneSignalAndSubscriptionIds: no identity");
    }

    if (!pushSubscriptionModel || !isCompleteSubscriptionObject(pushSubscriptionModel.data)) {
      throw new OneSignalError("Abort _getOneSignalAndSubscriptionIds: no subscription");
    }

    const { onesignalId } = identityModel;
    const { id: subscriptionId } = pushSubscriptionModel.data;

    return { onesignalId, subscriptionId };
  }

  async handleVisibilityChange(): Promise<void> {
    if (!User.singletonInstance?.hasOneSignalId) {
      return;
    }

    try {
      const visibilityState = document.visibilityState;
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();


      if (visibilityState === "visible") {
        this.setupOnFocusAndOnBlurForSession();

        Log.debug("handleVisibilityChange", "visible", `hasFocus: ${document.hasFocus()}`);

        if (document.hasFocus()) {
          await this.notifySWToUpsertSession(onesignalId, subscriptionId, SessionOrigin.VisibilityVisible);
        }
        return;
      }

      if (visibilityState === "hidden") {
        Log.debug("handleVisibilityChange", "hidden");
        if (OneSignal.cache.focusHandler && OneSignal.cache.isFocusEventSetup) {
          window.removeEventListener("focus", OneSignal.cache.focusHandler, true);
          OneSignal.cache.isFocusEventSetup = false;
        }
        if (OneSignal.cache.blurHandler && OneSignal.cache.isBlurEventSetup) {
          window.removeEventListener("blur", OneSignal.cache.blurHandler, true);
          OneSignal.cache.isBlurEventSetup = false;
        }

        await this.notifySWToDeactivateSession(onesignalId, subscriptionId, SessionOrigin.VisibilityHidden);
        return;
      }

      // it should never be anything else at this point
      Log.warn("Unhandled visibility state happened", visibilityState);
    } catch (e) {
      Log.error("Error handling visibility change:", e);
    }
  }

  async handleOnBeforeUnload(): Promise<void> {
    if (!User.singletonInstance?.hasOneSignalId) {
      return;
    }

    try {
      // don't have much time on before unload
      // have to skip adding device record to the payload
      const isHttps = OneSignalUtils.isHttps();
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      const payload: UpsertOrDeactivateSessionPayload = {
        appId: this.context.appConfig.appId,
        onesignalId,
        subscriptionId,
        sessionThreshold: this.context.appConfig.sessionThreshold!,
        enableSessionDuration: this.context.appConfig.enableSessionDuration!,
        sessionOrigin: SessionOrigin.BeforeUnload,
        isHttps,
        isSafari: OneSignalUtils.isSafari(),
        outcomesConfig: this.context.appConfig.userConfig.outcomes!,
      };

      if (isHttps) {
        Log.debug("Notify SW to deactivate session (beforeunload)");
        this.context.workerMessenger.directPostMessageToSW(WorkerMessengerCommand.SessionDeactivate, payload);
      } else {
        Log.debug("Notify iframe to notify SW to deactivate session (beforeunload)");
        await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
      }
    } catch (e) {
      Log.error("Error handling onbeforeunload:", e);
    }
  }

  async handleOnFocus(e: Event): Promise<void> {
    Log.debug("handleOnFocus", e);
    if (!User.singletonInstance?.hasOneSignalId) {
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
      await this.notifySWToUpsertSession(onesignalId, subscriptionId, SessionOrigin.Focus);
    } catch (e) {
      Log.error("Error handling focus:", e);
    }
  }

  async handleOnBlur(e: Event): Promise<void> {
    Log.debug("handleOnBlur", e);
    if (!User.singletonInstance?.hasOneSignalId) {
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
      await this.notifySWToDeactivateSession(onesignalId, subscriptionId, SessionOrigin.Blur);
    } catch (e) {
      Log.error("Error handling blur:", e);
    }
  }

  async upsertSession(
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    if (User.singletonInstance?.hasOneSignalId) {
      const { onesignalId, subscriptionId } = await this._getOneSignalAndSubscriptionIds();
      await this.notifySWToUpsertSession(onesignalId, subscriptionId, sessionOrigin);
    }

    if (
      this.context.environmentInfo?.isBrowserAndSupportsServiceWorkers ||
      this.context.environmentInfo?.isUsingSubscriptionWorkaround
    ) {
      if (!this.context.environmentInfo?.canTalkToServiceWorker) {
        this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
        OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
      } else {
        this.setupSessionEventListeners();
      }
    } else if (
      !this.context.environmentInfo?.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo?.isUsingSubscriptionWorkaround
    ) {
      this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
      OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }
  }

  setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (
      !this.context.environmentInfo?.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo?.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Not setting session event listeners. No service worker possible.");
      return;
    }

    if (!this.context.environmentInfo?.canTalkToServiceWorker) {
      Log.debug("Not setting session event listeners. Can't talk to ServiceWorker due being hosted on an HTTP page.");
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this.setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignal.cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this), true);
      OneSignal.cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignal.cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", e => {
        this.handleOnBeforeUnload();
        // deleting value to not show confirmation dialog
        delete e.returnValue;
      }, true);
      OneSignal.cache.isBeforeUnloadEventSetup = true;
    }
  }

  setupOnFocusAndOnBlurForSession(): void {
    Log.debug("setupOnFocusAndOnBlurForSession");

    if (!OneSignal.cache.focusHandler) {
      OneSignal.cache.focusHandler = this.handleOnFocus.bind(this);
    }
    if (!OneSignal.cache.isFocusEventSetup) {
      window.addEventListener("focus", OneSignal.cache.focusHandler, true);
      OneSignal.cache.isFocusEventSetup = true;
    }

    if (!OneSignal.cache.blurHandler) {
      OneSignal.cache.blurHandler = this.handleOnBlur.bind(this);
    }
    if (!OneSignal.cache.isBlurEventSetup) {
      window.addEventListener("blur", OneSignal.cache.blurHandler, true);
      OneSignal.cache.isBlurEventSetup = true;
    }
  }

  static setupSessionEventListenersForHttp(): void {
    if (!OneSignal.context || !OneSignal.context.sessionManager) {
      Log.error("OneSignal.context not available for http to setup session event listeners.");
      return;
    }

    OneSignal.context.sessionManager.setupSessionEventListeners();
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  async sendOnSessionUpdateFromPage(): Promise<void> {
    const earlyReturn = this.onSessionSent || !this.context.pageViewManager.isFirstPageView();

    if (earlyReturn) {
      return;
    }

    const identityModel = await OneSignal.coreDirector.getIdentityModel();
    const onesignalId = identityModel?.data?.id;

    if (!onesignalId) {
      Log.debug("Not sending the on session because user is not registered with OneSignal (no onesignal id)");
      return;
    }

    const pushSubscription = await OneSignal.coreDirector.getPushSubscriptionModel();
    if (pushSubscription?.data.notification_types !== SubscriptionStateKind.Subscribed &&
      OneSignal.config?.enableOnSession !== true) {
      return;
    }

    let subscriptionId;
    if (isCompleteSubscriptionObject(pushSubscription?.data)) {
      subscriptionId = pushSubscription?.data.id;
    }


    try {
      const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);
      // TO DO: in future, we should aggregate session count in case network call fails
      const updateUserPayload: UpdateUserPayload = {
        refresh_device_metadata: true,
        deltas: {
          session_count: 1,
        }
      };

      const appId = await MainHelper.getAppId();
      Utils.enforceAppId(appId);
      Utils.enforceAlias(aliasPair);
      try {
        await RequestService.updateUser({ appId, subscriptionId }, aliasPair, updateUserPayload);
        this.onSessionSent = true;
      } catch (e) {
        Log.debug("Error updating user session:", e);
      }
    } catch(e) {
      Log.error(`Failed to update user session. Error "${e.message}" ${e.stack}`);
    }
  }
}
