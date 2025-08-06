import type { SessionOriginValue } from '../../session';

export interface ISessionManager {
  setupSessionEventListeners(): void;
  upsertSession: (sessionOrigin: SessionOriginValue) => Promise<void>;
  sendOnSessionUpdateFromPage: () => Promise<void>;
}
