import { ContextSWInterface } from "../../../shared/models/ContextSW";
import { ISessionManager } from "../../../shared/managers/sessionManager/types";
import { SessionOrigin } from "../../../shared/models/Session";

export class SessionManager implements ISessionManager {
  constructor(_context: ContextSWInterface) { }

  async upsertSession(
    _sessionOrigin: SessionOrigin
  ): Promise<void> {
    // TODO: how should it be implemented if called from inside of service worker???
  }

  async setupSessionEventListeners(): Promise<void> {
    // TO DO
  }
}
