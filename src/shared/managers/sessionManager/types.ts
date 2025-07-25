import type { SessionOriginValue } from '../../models/Session';

export interface ISessionManager {
  setupSessionEventListeners(): void;
  upsertSession: (sessionOrigin: SessionOriginValue) => Promise<void>;
  sendOnSessionUpdateFromPage: () => Promise<void>;
}
