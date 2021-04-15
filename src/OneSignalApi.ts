import JSONP from 'jsonp';
import SdkEnvironment from "./managers/SdkEnvironment";
import { AppConfig, ServerAppConfig } from './models/AppConfig';
import { DeviceRecord } from './models/DeviceRecord';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import { SecondaryChannelProfile } from './models/SecondaryChannelProfile';
import OneSignalApiSW from "./OneSignalApiSW";
import OneSignalApiShared from "./OneSignalApiShared";
import { UpdatePlayerOptions } from './models/UpdatePlayerOptions';
import { EmailProfile } from './models/EmailProfile';

export default class OneSignalApi {
  static getPlayer(appId: string, playerId: string) {
    return OneSignalApiShared.getPlayer(appId, playerId);
  }

  static updatePlayer(appId: string, playerId: string, options?: UpdatePlayerOptions) {
    return OneSignalApiShared.updatePlayer(appId, playerId, options);
  }

  static sendNotification(appId: string, playerIds: Array<string>, titles, contents, url, icon, data, buttons) {
    return OneSignalApiShared.sendNotification(appId, playerIds, titles, contents, url, icon, data, buttons);
  }

  static jsonpLib(url: string, fn: Function) {
    JSONP(url, null, fn);
  }

  static async downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
    if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
      return await new Promise<ServerAppConfig>((resolve, reject) => {
        // Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
        OneSignalApi.jsonpLib(`${SdkEnvironment.getOneSignalApiUrl().toString()}/sync/${appId}/web`,(err, data) => {
          if (err)
            reject(err);
          else {
            if (data.success)
              resolve(data);
            else // For JSONP, we return a 200 even for errors, there's a success: false param
              reject(data);
          }
        });
      });
    } else {
      return await OneSignalApiSW.downloadServerAppConfig(appId);
    }
  }

  static async createUser(deviceRecord: DeviceRecord): Promise<string | null> {
    return await OneSignalApiShared.createUser(deviceRecord);
  }

  static async createSecondaryChannelRecord(
    appConfig: AppConfig,
    profile: SecondaryChannelProfile,
    pushDeviceRecordId?: string
  ): Promise<string | null> {
    return await OneSignalApiShared.createSecondaryChannelRecord(appConfig, profile, pushDeviceRecordId);
  }

  static async updateSecondaryChannelRecord(
    appConfig: AppConfig,
    profile: SecondaryChannelProfile,
    pushDeviceRecordId?: string
  ): Promise<string | null> {
    return await OneSignalApiShared.updateSecondaryChannelRecord(appConfig, profile, pushDeviceRecordId);
  }

  static async logoutEmail(appConfig: AppConfig, emailProfile: EmailProfile, deviceId: string): Promise<boolean> {
    return await OneSignalApiShared.logoutEmail(appConfig, emailProfile, deviceId);
  }

  static async updateUserSession(
    userId: string,
    deviceRecord: DeviceRecord,
  ): Promise<string> {
    return await OneSignalApiShared.updateUserSession(userId, deviceRecord);
  }
}
