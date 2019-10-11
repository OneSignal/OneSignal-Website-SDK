import { ContextSWInterface } from "../models/ContextSW";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { SessionPayload } from "../models/Session";
import Log from "../libraries/Log";
import { WorkerMessengerCommand } from "../libraries/WorkerMessenger";

export class SessionManager {
  private context: ContextSWInterface;

  constructor(context: ContextSWInterface) {
    this.context = context;
  }

  public async notifySWToUpsertSession(deviceId?: string, deviceRecord?: PushDeviceRecord): Promise<void> {
    Log.debug("Notify SW to upsert session");
    const payload: SessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
  }

  public async notifySWToDeactivateSession(deviceId?: string, deviceRecord?: PushDeviceRecord): Promise<void> {
    Log.debug("Notify SW to deactivate session");
    const payload: SessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
  }

  public handleVisibilityChange(): void {
    const visibilityState = document.visibilityState;
    if (visibilityState === "visible") {
      this.notifySWToUpsertSession();
      return;
    }

    if (visibilityState === "hidden") {
      this.notifySWToDeactivateSession();
      return;
    }

    // it should never be anything else at this point
  }

  public async upsertSession(deviceId?: string, deviceRecord?: PushDeviceRecord): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord);

    // TODO: Possibly need to add handling for "pagehide" event. And review all the cases both fire in general
    // https://github.com/w3c/page-visibility/issues/18
    document.addEventListener("visibilitychange", () => { this.handleVisibilityChange() }, false);
    // TODO: also may need to check for beforeunload though "pagehide" may help account for it

    await sessionPromise;
  }
}
