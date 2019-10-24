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

  public async notifySWToUpsertSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const payload: UpsertSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      Log.debug("Notify SW to upsert session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
    } else {
      Log.debug("Notify iframe to notify SW to upsert session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_UPSERT, payload);
    }
  }

  public async notifySWToDeactivateSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord | undefined,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const payload: DeactivateSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      Log.debug("Notify SW to deactivate session");
      await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
    } else {
      Log.debug("Notify SW to deactivate session");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    }
  }

  private async handleOnFocus(): Promise<void> {
    Log.debug("handleOnFocus");
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    await this.notifySWToUpsertSession(deviceId, deviceRecord, SessionOrigin.Focus);
  }

  private async handleOnBlur(): Promise<void> {
    Log.debug("handleOnBlur");
    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    await this.notifySWToDeactivateSession(deviceId, deviceRecord, SessionOrigin.Blur);
  }

  public async handleOnBeforeUnload(): Promise<void> {
    const payload: DeactivateSessionPayload = {
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin: SessionOrigin.BeforeUnload,
    };

    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      Log.debug("Notify SW to deactivate session (beforeunload)");
      this.context.workerMessenger.directPostMessageToSW(WorkerMessengerCommand.SessionDeactivate, payload);
    } else {
      Log.debug("Notify iframe to notify SW to deactivate session (beforeunload)");
      await OneSignal.proxyFrameHost.runCommand(OneSignal.POSTMAM_COMMANDS.SESSION_DEACTIVATE, payload);
    }
  }

  public async handleVisibilityChange(): Promise<void> {
    const visibilityState = document.visibilityState;

    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
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
      if (OneSignal.cache.focusHandler) {
        window.removeEventListener("focus", OneSignal.cache.focusHandler, true);
      }
      if (OneSignal.cache.blurHandler) {
        window.removeEventListener("blur", OneSignal.cache.blurHandler, true);
      }
      return;
    }

    // it should never be anything else at this point
    Log.warn("Unhandled visibility state happened", visibilityState);
  }

  public async upsertSession(
    deviceId: string,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord, sessionOrigin);

    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      this.setupSessionEventListeners();
    } else {
      OneSignal.emitter.emit(OneSignal.EVENTS.SESSION_STARTED);
    }

    await sessionPromise;
  }

  public setupOnFocusAndOnBlurForSession(): void {
    Log.debug("setupOnFocusAndOnBlurForSession");

    if (!OneSignal.cache.focusHandler) {
      OneSignal.cache.focusHandler = this.handleOnFocus.bind(this);
    }
    window.addEventListener("focus", OneSignal.cache.focusHandler, true);

    if (!OneSignal.cache.blurHandler) {
      OneSignal.cache.blurHandler = this.handleOnBlur.bind(this);
    }
    window.addEventListener("blur", OneSignal.cache.blurHandler, true);
  }

  public setupSessionEventListeners(): void {
    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    this.setupOnFocusAndOnBlurForSession();

    /**
     * To make sure we add these event listeners only once. Possible use-case is calling registerForPushNotifications
     * multiple times.
     */
    if (!OneSignal.cache.visibilityChangeListener) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", () => setTimeout(() => this.handleVisibilityChange(), 0), true);
      OneSignal.cache.visibilityChangeListener = true;
    }
    
    if (!OneSignal.cache.beforeUnloadListener) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", (e) => { e.preventDefault(); this.handleOnBeforeUnload();}, true);
      OneSignal.cache.beforeUnloadListener = true;
    }
  }

  public static setupSessionEventListenersForHttp(): void {
    if (!OneSignal.context || !OneSignal.context.sessionManager) {
      Log.error("OneSignal.context not available for http to setup session event listeners.");
      return;
    }

    OneSignal.context.sessionManager.setupSessionEventListeners();
  }
}
