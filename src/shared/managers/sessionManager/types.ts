import { SessionOrigin } from '../../models/Session';

export interface ISessionManager {
  setupSessionEventListeners(): void;
  upsertSession: (sessionOrigin: SessionOrigin) => Promise<void>;
}
