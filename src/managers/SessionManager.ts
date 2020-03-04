import { ContextSWInterface } from "../models/ContextSW";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { UpsertSessionPayload, DeactivateSessionPayload, SessionOrigin } from "../models/Session";
import MainHelper from "../helpers/MainHelper";
import Log from "../libraries/Log";
import { WorkerMessengerCommand } from "../libraries/WorkerMessenger";
import { OneSignalUtils } from "../utils/OneSignalUtils";

export class SessionManager {
  private context: ContextSWInterface;

  constructor(context: ContextSWInterface) {
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
    if (isHttps) {
      Log.debug("Notify SW to upsert session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
    } else {
      Log.debug("Notify iframe to notify SW to upsert session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_UPSERT, payload);
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
    if (isHttps) {
      Log.debug("Notify SW to deactivate session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
    } else {
      Log.debug("Notify SW to deactivate session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
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
      if (OneSignal.cache.focusHandler && OneSignal.cache.isFocusEventSetup) {
        window.removeEventListener("focus", OneSignal.cache.focusHandler, true);
        OneSignal.cache.isFocusEventSetup = false;
      }
      if (OneSignal.cache.blurHandler && OneSignal.cache.isBlurEventSetup) {
        window.removeEventListener("blur", OneSignal.cache.blurHandler, true);
        OneSignal.cache.isBlurEventSetup = false;
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
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
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

    if (OneSignalUtils.isHttps()) {
      this.setupSessionEventListeners();
    } else {
      OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }

    await sessionPromise;
  }

  setupSessionEventListeners(): void {
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
      window.addEventListener("beforeunload", (e) => {
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
}
