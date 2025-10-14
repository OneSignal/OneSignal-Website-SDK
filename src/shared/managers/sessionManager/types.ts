import type { SessionOriginValue } from '../../session/types';

export interface ISessionManager {
  _setupSessionEventListeners(): void;
  _upsertSession: (sessionOrigin: SessionOriginValue) => Promise<void>;
  _sendOnSessionUpdateFromPage: () => Promise<void>;
}
