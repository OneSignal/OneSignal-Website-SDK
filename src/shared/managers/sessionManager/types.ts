import { PushDeviceRecord } from "../../models/PushDeviceRecord";
import { SessionOrigin } from "../../models/Session";

export interface ISessionManager {
  upsertSession: (deviceId: string, deviceRecord: PushDeviceRecord, sessionOrigin: SessionOrigin) => Promise<void>;
}
