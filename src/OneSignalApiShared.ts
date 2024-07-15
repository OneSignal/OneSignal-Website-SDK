import { AppConfig } from './models/AppConfig';
import { DeviceRecord } from './models/DeviceRecord';
import { OneSignalApiErrorKind, OneSignalApiError } from './errors/OneSignalApiError';
import { OutcomeRequestData } from "./models/OutcomeRequestData";
import OneSignalApiBase from "./OneSignalApiBase";
import Utils from "./context/shared/utils/Utils";
import Log from "./libraries/Log";
import { UpdatePlayerOptions } from './models/UpdatePlayerOptions';
import { EmailProfile } from './models/EmailProfile';

export default class OneSignalApiShared {
  static getPlayer(appId: string, playerId: string) {
    Utils.enforceAppId(appId);
    Utils.enforcePlayerId(playerId);
    return OneSignalApiBase.get(`players/${playerId}?app_id=${appId}`);
  }

  static updatePlayer(appId: string, playerId: string, options?: UpdatePlayerOptions) {
    Utils.enforceAppId(appId);
    Utils.enforcePlayerId(playerId);
    return OneSignalApiBase.put(`players/${playerId}`, { app_id: appId, ...options });
  }

  static async createUser(deviceRecord: DeviceRecord): Promise<string | null> {
    const serializedDeviceRecord = deviceRecord.serialize();
    Utils.enforceAppId(serializedDeviceRecord.app_id);
    const response = await OneSignalApiBase.post(`players`, serializedDeviceRecord);
    if (response && response.success)
      return response.id;
    return null;
  }

  static async logoutEmail(appConfig: AppConfig, emailProfile: EmailProfile, deviceId: string): Promise<boolean> {
    Utils.enforceAppId(appConfig.appId);
    Utils.enforcePlayerId(deviceId);
    const response = await OneSignalApiBase.post(`players/${deviceId}/email_logout`, {
      app_id: appConfig.appId,
      parent_player_id: emailProfile.subscriptionId,
      identifier_auth_hash: emailProfile.identifierAuthHash ? emailProfile.identifierAuthHash : undefined
    });
    if (response && response.success) {
      return true;
    } else {
      return false;
    }
  }

  static async updateUserSession(
    userId: string,
    deviceRecord: DeviceRecord,
  ): Promise<string> {
    try {
      const serializedDeviceRecord = deviceRecord.serialize();
      Utils.enforceAppId(serializedDeviceRecord.app_id);
      Utils.enforcePlayerId(userId);
      const response = await OneSignalApiBase.post(`players/${userId}/on_session`, serializedDeviceRecord);
      if (response.id) {
        // A new user ID can be returned
        return response.id;
      } else {
        return userId;
      }
    } catch (e) {
      if (e && Array.isArray(e.errors) && e.errors.length > 0 &&
        Utils.contains(e.errors[0], 'app_id not found')) {
        throw new OneSignalApiError(OneSignalApiErrorKind.MissingAppId);
      } else throw e;
    }
  }

  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    Log.info("Outcome payload:", data);
    try {
      await OneSignalApiBase.post("outcomes/measure", data);
    } catch(e) {
      Log.error("sendOutcome", e);
    }
  }
}
