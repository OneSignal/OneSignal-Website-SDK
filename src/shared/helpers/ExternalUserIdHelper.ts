import { DeviceRecord } from '../models/DeviceRecord';
import Database from '../services/Database';

export class ExternalUserIdHelper {
  static async addExternalUserIdToDeviceRecord(
    deviceRecord: DeviceRecord,
  ): Promise<void> {
    const externalUserId = await Database.getExternalUserId();
    if (!externalUserId) {
      return;
    }
    deviceRecord.externalUserId = externalUserId;

    const externalUserIdAuthHash = await Database.getExternalUserIdAuthHash();
    if (externalUserIdAuthHash) {
      deviceRecord.externalUserIdAuthHash = externalUserIdAuthHash;
    }
  }
}
