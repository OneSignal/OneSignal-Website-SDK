import type { SessionOriginValue } from '../../session/types';

export interface ISessionManager {
  _setupSessionEventListeners(): void;
  _startHeartbeat(): void;
  _upsertSession: (sessionOrigin: SessionOriginValue) => Promise<void>;
  _sendOnSessionUpdateFromPage: () => Promise<void>;
  _handleJwtUpdated: (externalId: string) => Promise<void>;
}
