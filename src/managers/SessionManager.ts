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
    Log.debug("Notify SW to upsert session");
    const payload: UpsertSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
  }

  public async notifySWToDeactivateSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    Log.debug("Notify SW to deactivate session");
    const payload: DeactivateSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
  }

  async handleVisibilityChange(): Promise<void> {
    const visibilityState = document.visibilityState;

    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    if (visibilityState === "visible") {
      this.notifySWToUpsertSession(deviceId, deviceRecord, SessionOrigin.VisibilityVisible);
      return;
    }

    if (visibilityState === "hidden") {
      this.notifySWToDeactivateSession(deviceId, deviceRecord, SessionOrigin.VisibilityHidden);
      return;
    }

    // it should never be anything else at this point
    Log.warn("Unhandled visibility state happened", visibilityState);
  }

  public async handleOnBeforeUnload(): Promise<void> {
    // don't have much time on before unload
    // have to skip adding device record to the payload
    const payload: DeactivateSessionPayload = {
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin: SessionOrigin.BeforeUnload,
    };

    if (!OneSignalUtils.isUsingSubscriptionWorkaround()) {
      Log.debug("Notify SW to deactivate session (beforeunload)");
      this.context.workerMessenger.directPostMessageToSW(WorkerMessengerCommand.SessionDeactivate, payload);
    }
  }

  async upsertSession(
    deviceId: string,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord, sessionOrigin);

    // TODO: Possibly need to add handling for "pagehide" event. And review all the cases both fire in general
    // https://github.com/w3c/page-visibility/issues/18
    this.setupSessionEventListeners();

    await sessionPromise;
  }

  setupSessionEventListeners(): void {
    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    // To make sure we add these event listeners only once.
    if (!OneSignal.cache.visibilityChangeListener) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this), true);
      OneSignal.cache.visibilityChangeListener = true;
    }

    if (!OneSignal.cache.beforeUnloadListener) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", (e) => {
        this.handleOnBeforeUnload();
        // deleting value to not show confirmation dialog
        delete e.returnValue;
      }, true);
      OneSignal.cache.beforeUnloadListener = true;
    }
  }
}
