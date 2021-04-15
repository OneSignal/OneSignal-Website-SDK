import { AppConfig } from './models/AppConfig';
import { DeviceRecord } from './models/DeviceRecord';
import { OneSignalApiErrorKind, OneSignalApiError } from './errors/OneSignalApiError';
import { SecondaryChannelProfile } from './models/SecondaryChannelProfile';
import { SecondaryChannelDeviceRecord } from './models/SecondaryChannelDeviceRecord';
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

  static sendNotification(appId: string, playerIds: Array<string>, titles, contents, url, icon, data, buttons) {
    var params = {
      app_id: appId,
      contents: contents,
      include_player_ids: playerIds,
      isAnyWeb: true,
      data: data,
      web_buttons: buttons
    };
    if (titles) {
      (params as any).headings = titles;
    }
    if (url) {
      (params as any).url = url;
    }
    if (icon) {
      (params as any).chrome_web_icon = icon;
      (params as any).firefox_icon = icon;
    }
    Utils.trimUndefined(params);
    return OneSignalApiBase.post('notifications', params);
  }

  static async createUser(deviceRecord: DeviceRecord): Promise<string | null> {
    const serializedDeviceRecord = deviceRecord.serialize();
    Utils.enforceAppId(serializedDeviceRecord.app_id);
    const response = await OneSignalApiBase.post(`players`, serializedDeviceRecord);
    if (response && response.success)
      return response.id;
    return null;
  }

  static async createEmailRecord(
    appConfig: AppConfig,
    emailProfile: SecondaryChannelProfile,
    pushDeviceRecordId?: string
  ): Promise<string | null> {
    Utils.enforceAppId(appConfig.appId);

    const emailRecord = new SecondaryChannelDeviceRecord(
      emailProfile.identifier,
      emailProfile.identifierAuthHash,
      pushDeviceRecordId
    );

    emailRecord.appId = appConfig.appId;
    const response = await OneSignalApiBase.post(`players`, emailRecord.serialize());
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async updateEmailRecord(
    appConfig: AppConfig,
    emailProfile: SecondaryChannelProfile,
    pushDeviceRecordId?: string
  ): Promise<string | null> {
    Utils.enforceAppId(appConfig.appId);
    Utils.enforcePlayerId(emailProfile.playerId);

    const emailRecord = new SecondaryChannelDeviceRecord(
      emailProfile.identifier,
      emailProfile.identifierAuthHash,
      pushDeviceRecordId
    );

    emailRecord.appId = appConfig.appId;
    const response = await OneSignalApiBase.put(`players/${emailProfile.playerId}`, emailRecord.serialize());
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async logoutEmail(appConfig: AppConfig, emailProfile: EmailProfile, deviceId: string): Promise<boolean> {
    Utils.enforceAppId(appConfig.appId);
    Utils.enforcePlayerId(deviceId);
    const response = await OneSignalApiBase.post(`players/${deviceId}/email_logout`, {
      app_id: appConfig.appId,
      parent_player_id: emailProfile.playerId,
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
