import { SessionOrigin } from '../../models/Session';

export interface ISessionManager {
  sendOnSessionUpdateFromPage: () => Promise<void>;
  setupSessionEventListeners(): void;
  upsertSession: (sessionOrigin: SessionOrigin) => Promise<void>;
}
