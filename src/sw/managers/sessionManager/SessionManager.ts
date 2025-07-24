import type { ISessionManager } from '../../../shared/managers/sessionManager/types';
import type { SessionOrigin } from '../../../shared/models/Session';

export class SessionManager implements ISessionManager {
  async upsertSession(_sessionOrigin: SessionOrigin): Promise<void> {
    // TODO: how should it be implemented if called from inside of service worker???
  }

  async setupSessionEventListeners(): Promise<void> {
    // TO DO
  }
}
