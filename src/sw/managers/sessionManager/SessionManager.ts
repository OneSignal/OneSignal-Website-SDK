import { ContextSWInterface } from "../../../shared/models/ContextSW";
import { PushDeviceRecord } from "../../../shared/models/PushDeviceRecord";
import { ISessionManager } from "../../../shared/managers/sessionManager/types";
import { SessionOrigin } from "../../../shared/models/Session";

export class SessionManager implements ISessionManager {
  constructor(_context: ContextSWInterface) { }

  async upsertSession(
    _deviceId: string,
    _deviceRecord: PushDeviceRecord,
    _sessionOrigin: SessionOrigin
  ): Promise<void> {
    // TODO: how should it be implemented if called from inside of service worker???
  }
}
