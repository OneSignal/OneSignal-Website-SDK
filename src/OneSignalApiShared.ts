import { AppConfig } from './models/AppConfig';
import { DeviceRecord } from './models/DeviceRecord';
import { OneSignalApiErrorKind, OneSignalApiError } from './errors/OneSignalApiError';
import { EmailProfile } from './models/EmailProfile';
import { EmailDeviceRecord } from './models/EmailDeviceRecord';
import OneSignalApiBase from "./OneSignalApiBase";
import Utils from "./utils/Utils";

export default class OneSignalApiShared {
  static getPlayer(appId: string, playerId: string) {
    return OneSignalApiBase.get(`players/${playerId}?app_id=${appId}`);
  }

  static updatePlayer(appId: string, playerId: string, options?: Object) {
    return OneSignalApiBase.put(`players/${playerId}`, {app_id: appId, ...options});
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

  static async createUser(deviceRecord: DeviceRecord): Promise<string> {
    const response = await OneSignalApiBase.post(`players`, deviceRecord.serialize());
    if (response && response.success)
      return response.id;
    return null;
  }

  static async createEmailRecord(
    appConfig: AppConfig,
    emailProfile: EmailProfile,
    pushDeviceRecordId?: string
  ): Promise<string> {
    const emailRecord = new EmailDeviceRecord(emailProfile.emailAddress, emailProfile.emailAuthHash);
    emailRecord.appId = appConfig.appId;
    emailRecord.pushDeviceRecordId = pushDeviceRecordId;
    const response = await OneSignalApiBase.post(`players`, emailRecord.serialize());
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async updateEmailRecord(
    appConfig: AppConfig,
    emailProfile: EmailProfile,
    pushDeviceRecordId?: string
  ): Promise<string> {
    const emailRecord = new EmailDeviceRecord(emailProfile.emailAddress, emailProfile.emailAuthHash);
    emailRecord.appId = appConfig.appId;
    emailRecord.pushDeviceRecordId = pushDeviceRecordId;
    const response = await OneSignalApiBase.put(`players/${emailProfile.emailId}`, emailRecord.serialize());
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async logoutEmail(appConfig: AppConfig, emailProfile: EmailProfile, deviceId: string): Promise<boolean> {
    const response = await OneSignalApiBase.post(`players/${deviceId}/email_logout`, {
      app_id: appConfig.appId,
      parent_player_id: emailProfile.emailId,
      email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
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
      const response = await OneSignalApiBase.post(`players/${userId}/on_session`, deviceRecord.serialize());
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
}
