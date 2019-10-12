import { ContextSWInterface } from "../models/ContextSW";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { SessionPayload, SessionOrigin } from "../models/Session";
import MainHelper from "../helpers/MainHelper";
import Log from "../libraries/Log";
import { WorkerMessengerCommand } from "../libraries/WorkerMessenger";

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
    const payload: SessionPayload = {
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
    const payload: SessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
  }

  public async handleVisibilityChange(): Promise<void> {
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

  public async upsertSession(
    deviceId: string,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord, sessionOrigin);

    // TODO: Possibly need to add handling for "pagehide" event. And review all the cases both fire in general
    // https://github.com/w3c/page-visibility/issues/18
    document.addEventListener("visibilitychange", () => { this.handleVisibilityChange() }, false);
    // TODO: also may need to check for beforeunload though "pagehide" may help account for it

    await sessionPromise;
  }
}
