import { ServerAppConfig } from "./models/AppConfig";
import { OneSignalApiBase } from "./OneSignalApiBase";
import { SubscriptionStateKind } from "./models/SubscriptionStateKind";
import { FlattenedDeviceRecord } from "./models/DeviceRecord";
import Log from "./libraries/Log";
import { Utils } from "./context/shared/utils/Utils";
import { OutcomeAttribution, OutcomeAttributionType } from "./models/Outcomes";

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

  static async updatePlayer(appId: string, playerId: string, options?: Object): Promise<void> {
    const funcToExecute = async () => {
      await OneSignalApiBase.put(`players/${playerId}`, {app_id: appId, ...options});
    }
    return await Utils.enforceAppIdAndPlayerId(appId, playerId, funcToExecute);
  }

  public static async updateUserSession(
    userId: string,
    serializedDeviceRecord: FlattenedDeviceRecord,
  ): Promise<string> {
    const funcToExecute = async () => {
      const response = await OneSignalApiBase.post(
        `players/${userId}/on_session`, serializedDeviceRecord);
      if (response.id) {
        // A new user ID can be returned
        return response.id;
      } else {
        return userId;
      }
    };
    return await Utils.enforceAppIdAndPlayerId(serializedDeviceRecord.app_id, userId, funcToExecute);
  };

  public static async sendSessionDuration(
    appId: string, deviceId: string, sessionDuration: number, deviceType: number, attribution: OutcomeAttribution
  ): Promise<void> {
    const funcToExecute = async () => {
      const payload: any = {
        app_id: appId,
        type: 1,
        state: "ping",
        active_time: sessionDuration,
        device_type: deviceType,
      };
      switch (attribution.type) {
        case OutcomeAttributionType.Direct:
          payload.direct = true;
          payload.notification_ids = attribution.notificationIds;
          break;
        case OutcomeAttributionType.Indirect:
          payload.direct = false;
          payload.notification_ids = attribution.notificationIds;
          break;
        default:
          break;
      }
      await OneSignalApiBase.post(`players/${deviceId}/on_focus`, payload);
    }
    Utils.enforceAppIdAndPlayerId(appId, deviceId, funcToExecute);
  }
}

export default OneSignalApiSW;
