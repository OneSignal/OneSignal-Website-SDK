import { SessionOrigin } from "../../models/Session";

export interface ISessionManager {
  upsertSession: (sessionOrigin: SessionOrigin) => Promise<void>;
}
