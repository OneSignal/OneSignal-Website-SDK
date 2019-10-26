import { ServerAppConfig } from "./models/AppConfig";
import { OneSignalApiBase } from "./OneSignalApiBase";
import { SubscriptionStateKind } from "./models/SubscriptionStateKind";
import { FlattenedDeviceRecord } from "./models/DeviceRecord";
import Log from "./libraries/Log";
import { Utils } from "./utils/Utils";
import { OneSignalApiErrorKind, OneSignalApiError } from "./errors/OneSignalApiError";

export class OneSignalApiSW {
  static async downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
    Utils.enforceAppId(appId);
    return await new Promise<ServerAppConfig>((resolve, _reject) => {
      resolve(OneSignalApiBase.get(`sync/${appId}/web`, null));
    });
  }

  /**
   * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
   * Used if the user clears his or her IndexedDB database and we need the user ID again.
   */
  static getUserIdFromSubscriptionIdentifier(appId: string, deviceType: number, identifier: string): Promise<string> {
    // Calling POST /players with an existing identifier returns us that player ID
    Utils.enforceAppId(appId);
    return OneSignalApiBase.post("players", {
      app_id: appId,
      device_type: deviceType,
      identifier: identifier,
      notification_types: SubscriptionStateKind.TemporaryWebRecord,
    }).then((response: any) => {
      if (response && response.id) {
        return response.id;
      } else {
        return null;
      }
    }).catch(e => {
      Log.debug("Error getting user ID from subscription identifier:", e);
      return null;
    });
  }

  static updatePlayer(appId: string, playerId: string, options?: Object) {
    Utils.enforceAppId(appId);
    Utils.enforcePlayerId(playerId);
    return OneSignalApiBase.put(`players/${playerId}`, {app_id: appId, ...options});
  }

  public static async updateUserSession(
    userId: string,
    serializedDeviceRecord: FlattenedDeviceRecord,
  ): Promise<string> {
    try {
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
  };

  public static async sendSessionDuration(
    appId: string, deviceId: string, sessionDuration: number, deviceType: number): Promise<void> {
      try {
        Utils.enforceAppId(appId);
        Utils.enforcePlayerId(deviceId);
        const payload = {
          app_id: appId,
          type: 1,
          state: "ping",
          active_time: sessionDuration,
          device_type: deviceType,
        }
        await OneSignalApiBase.post(`players/${deviceId}/on_focus`, payload);
      } catch (e) {
        if (e && Array.isArray(e.errors) && e.errors.length > 0 &&
          Utils.contains(e.errors[0], 'app_id not found')) {
          throw new OneSignalApiError(OneSignalApiErrorKind.MissingAppId);
        } else throw e;
      }
  }
}

export default OneSignalApiSW;
