import { ContextInterface } from "../../../page/models/Context";
import { PushDeviceRecord } from "../../models/PushDeviceRecord";
import { WorkerMessengerCommand } from "../../libraries/WorkerMessenger";
import { OneSignalUtils } from "../../utils/OneSignalUtils";
import { SubscriptionStateKind } from "../../models/SubscriptionStateKind";
import Database from "../../services/Database";
import { ISessionManager } from "./types";
import { SessionOrigin, UpsertSessionPayload, DeactivateSessionPayload } from "../../models/Session";
import MainHelper from "../../helpers/MainHelper";
import Log from "../../libraries/Log";
import OneSignalApiShared from "../../api/OneSignalApiShared";
import OneSignalPublic from "../../../onesignal/OneSignalPublic";

export class SessionManager implements ISessionManager {
  private context: ContextInterface;
  private onSessionSent: boolean = false;

  constructor(context: ContextInterface) {
    this.context = context;
  }

  async notifySWToUpsertSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const isHttps = OneSignalUtils.isHttps();

    const payload: UpsertSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: this.context.appConfig.sessionThreshold || 0,
      enableSessionDuration: !!this.context.appConfig.enableSessionDuration,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to upsert session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
    } else if (this.context.environmentInfo.canTalkToServiceWorker &&
        this.context.environmentInfo.isUsingSubscriptionWorkaround) {
      Log.debug("Notify iframe to notify SW to upsert session");
      await OneSignalPublic.proxyFrameHost.runCommand(OneSignalPublic.POSTMAM_COMMANDS.SESSION_UPSERT, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify upsert: do nothing");
    }
  }

  async notifySWToDeactivateSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const isHttps = OneSignalUtils.isHttps();
    const payload: DeactivateSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: this.context.appConfig.sessionThreshold!,
      enableSessionDuration: this.context.appConfig.enableSessionDuration!,
      sessionOrigin,
      isHttps,
      isSafari: OneSignalUtils.isSafari(),
      outcomesConfig: this.context.appConfig.userConfig.outcomes!,
    };
    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
        !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Notify SW to deactivate session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
    } else if (this.context.environmentInfo.canTalkToServiceWorker &&
        this.context.environmentInfo.isUsingSubscriptionWorkaround) {
      Log.debug("Notify SW to deactivate session");
      await OneSignalPublic.proxyFrameHost.runCommand(OneSignalPublic.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    } else { // http w/o our iframe
      // we probably shouldn't even be here
      Log.debug("Notify deactivate: do nothing");
    }
  }

  async handleVisibilityChange(): Promise<void> {
    const visibilityState = document.visibilityState;

    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId, true)
    ]);

    if (visibilityState === "visible") {
      this.setupOnFocusAndOnBlurForSession();

      Log.debug("handleVisibilityChange", "visible", `hasFocus: ${document.hasFocus()}`);
      if (document.hasFocus()) {
        await this.notifySWToUpsertSession(deviceId, deviceRecord, SessionOrigin.VisibilityVisible);
      }
      return;
    }

    if (visibilityState === "hidden") {
      Log.debug("handleVisibilityChange", "hidden");
      if (OneSignalPublic.cache.focusHandler && OneSignalPublic.cache.isFocusEventSetup) {
        window.removeEventListener("focus", OneSignalPublic.cache.focusHandler, true);
        OneSignalPublic.cache.isFocusEventSetup = false;
      }
      if (OneSignalPublic.cache.blurHandler && OneSignalPublic.cache.isBlurEventSetup) {
        window.removeEventListener("blur", OneSignalPublic.cache.blurHandler, true);
        OneSignalPublic.cache.isBlurEventSetup = false;
      }

      // TODO: (iryna) need to send deactivate from here?
      const [deviceId, deviceRecord] = await Promise.all([
        MainHelper.getDeviceId(),
        MainHelper.createDeviceRecord(this.context.appConfig.appId)
      ]);

      await this.notifySWToDeactivateSession(deviceId, deviceRecord, SessionOrigin.VisibilityHidden);
      return;
    }

    // it should never be anything else at this point
    Log.warn("Unhandled visibility state happened", visibilityState);
  }

  async handleOnBeforeUnload(): Promise<void> {
    // don't have much time on before unload
    // have to skip adding device record to the payload
    const isHttps = OneSignalUtils.isHttps();
    const payload: DeactivateSessionPayload = {
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
      await OneSignalPublic.proxyFrameHost.runCommand(OneSignalPublic.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    }
  }

  async handleOnFocus(e: Event): Promise<void> {
    Log.debug("handleOnFocus", e);
    /**
     * Firefox has 2 focus events with different targets (document and window).
     * While Chrome only has one on window.
     * Target check is important to avoid double-firing of the event.
     */
    if (e.target !== window) {
      return;
    }
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId, true)
    ]);

    await this.notifySWToUpsertSession(deviceId, deviceRecord, SessionOrigin.Focus);
  }

  async handleOnBlur(e: Event): Promise<void> {
    Log.debug("handleOnBlur", e);
    /**
     * Firefox has 2 focus events with different targets (document and window).
     * While Chrome only has one on window.
     * Target check is important to avoid double-firing of the event.
     */
    if (e.target !== window) {
      return;
    }
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    await this.notifySWToDeactivateSession(deviceId, deviceRecord, SessionOrigin.Blur);
  }

  async upsertSession(
    deviceId: string,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord, sessionOrigin);

    if (
      this.context.environmentInfo.isBrowserAndSupportsServiceWorkers ||
      this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      if (!this.context.environmentInfo.canTalkToServiceWorker) {
        this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
        OneSignalPublic.emitter.emit(OneSignalPublic.EVENTS.SESSION_STARTED);
      } else {
        this.setupSessionEventListeners();
      }
    } else if (
      !this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      this.onSessionSent = sessionOrigin === SessionOrigin.PlayerCreate;
      OneSignalPublic.emitter.emit(OneSignalPublic.EVENTS.SESSION_STARTED);
    }

    await sessionPromise;
  }

  setupSessionEventListeners(): void {
    // Only want these events if it's using subscription workaround
    if (
      !this.context.environmentInfo.isBrowserAndSupportsServiceWorkers &&
      !this.context.environmentInfo.isUsingSubscriptionWorkaround
    ) {
      Log.debug("Not setting session event listeners. No service worker possible.");
      return;
    }

    if (!this.context.environmentInfo.canTalkToServiceWorker) {
      Log.debug("Not setting session event listeners. Can't talk to ServiceWorker due being hosted on an HTTP page.");
      return;
    }

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this.setupOnFocusAndOnBlurForSession();

    // To make sure we add these event listeners only once.
    if (!OneSignalPublic.cache.isVisibilityChangeEventSetup) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this), true);
      OneSignalPublic.cache.isVisibilityChangeEventSetup = true;
    }

    if (!OneSignalPublic.cache.isBeforeUnloadEventSetup) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", e => {
        this.handleOnBeforeUnload();
        // deleting value to not show confirmation dialog
        delete e.returnValue;
      }, true);
      OneSignalPublic.cache.isBeforeUnloadEventSetup = true;
    }
  }

  setupOnFocusAndOnBlurForSession(): void {
    Log.debug("setupOnFocusAndOnBlurForSession");

    if (!OneSignalPublic.cache.focusHandler) {
      OneSignalPublic.cache.focusHandler = this.handleOnFocus.bind(this);
    }
    if (!OneSignalPublic.cache.isFocusEventSetup) {
      window.addEventListener("focus", OneSignalPublic.cache.focusHandler, true);
      OneSignalPublic.cache.isFocusEventSetup = true;
    }

    if (!OneSignalPublic.cache.blurHandler) {
      OneSignalPublic.cache.blurHandler = this.handleOnBlur.bind(this);
    }
    if (!OneSignalPublic.cache.isBlurEventSetup) {
      window.addEventListener("blur", OneSignalPublic.cache.blurHandler, true);
      OneSignalPublic.cache.isBlurEventSetup = true;
    }
  }

  static setupSessionEventListenersForHttp(): void {
    if (!OneSignalPublic.context || !OneSignalPublic.context.sessionManager) {
      Log.error("OneSignal.context not available for http to setup session event listeners.");
      return;
    }

    OneSignalPublic.context.sessionManager.setupSessionEventListeners();
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  async sendOnSessionUpdateFromPage(deviceRecord?: PushDeviceRecord): Promise<void> {
    if (this.onSessionSent) {
      return;
    }

    if (!this.context.pageViewManager.isFirstPageView()) {
      return;
    }

    const existingUser = await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug("Not sending the on session because user is not registered with OneSignal (no device id)");
      return;
    }

    const deviceId = await MainHelper.getDeviceId();
    if (!deviceRecord) {
      deviceRecord = await MainHelper.createDeviceRecord(this.context.appConfig.appId);
    }

    if (deviceRecord.subscriptionState !== SubscriptionStateKind.Subscribed &&
      OneSignalPublic.config.enableOnSession !== true) {
      return;
    }

    try {
      const newPlayerId = await OneSignalApiShared.updateUserSession(deviceId!, deviceRecord);
      this.onSessionSent = true;

      // If the returned player id is different, save the new id.
      if (newPlayerId !== deviceId) {
        const subscription = await Database.getSubscription();
        subscription.deviceId = newPlayerId;
        await Database.setSubscription(subscription);
      }
    } catch(e) {
      Log.error(`Failed to update user session. Error "${e.message}" ${e.stack}`);
    }

    await this.context.secondaryChannelManager.synchronizer.onSession();
  }
}
