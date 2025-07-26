import type { SessionOriginValue } from 'src/shared/models/Session';
import type { ISessionManager } from '../../../shared/managers/sessionManager/types';

export class SessionManager implements ISessionManager {
  async upsertSession(_sessionOrigin: SessionOriginValue): Promise<void> {
    // TODO: how should it be implemented if called from inside of service worker?
  }

  async setupSessionEventListeners(): Promise<void> {
    // TO DO
  }

  async sendOnSessionUpdateFromPage(): Promise<void> {
    // TODO: how should it be implemented if called from inside of service worker?
  }
}
