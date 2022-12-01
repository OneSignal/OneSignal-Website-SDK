import AliasPair from "../../core/requestService/AliasPair";
import { RequestService } from "../../core/requestService/RequestService";
import { UpdateUserPayload } from "../../core/requestService/UpdateUserPayload";
import Utils from "../context/Utils";
import Log from "../libraries/Log";
import { ServerAppConfig } from "../models/AppConfig";
import { DeliveryPlatformKind } from "../models/DeliveryPlatformKind";
import { OutcomeAttribution } from "../models/Outcomes";
import { SubscriptionStateKind } from "../models/SubscriptionStateKind";
import { OneSignalApiBase } from "./OneSignalApiBase";

export class OneSignalApiSW {
  static async downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
    Utils.enforceAppId(appId);
    return await new Promise<ServerAppConfig>(async (resolve, _reject) => {
      const response = await OneSignalApiBase.get(`sync/${appId}/web`, null);
      resolve(response?.result);
    });
  }

  /**
   * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
   * Used if the user clears his or her IndexedDB database and we need the user ID again.
   */
  static getUserIdFromSubscriptionIdentifier(
    appId: string,
    deviceType: DeliveryPlatformKind,
    identifier: string
    ): Promise<string> {
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
      await OneSignalApiBase.put(`players/${playerId}`, { app_id: appId, ...options });
    };
    return await Utils.enforceAppIdAndPlayerId(appId, playerId, funcToExecute);
  }

  /**
   *  Main on_session call
   * @returns
   */
  public static async updateUserSession(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
  ): Promise<void> {

    const aliasPair = new AliasPair("onesignalId", onesignalId);
    // TO DO: in future, we should aggregate session count in case network call fails
    const updateUserPayload: UpdateUserPayload = {
      refresh_device_metadata: true,
      deltas: {
        session_count: 1,
      }
    };


    Utils.enforceAppId(appId);
    Utils.enforceAlias(aliasPair);
    try {
      await RequestService.updateUser({ appId, subscriptionId }, aliasPair, updateUserPayload);
    } catch (e) {
      Log.debug("Error updating user session:", e);
    }
  }

  public static async sendSessionDuration(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    sessionDuration: number,
    deviceType: DeliveryPlatformKind,
    attribution: OutcomeAttribution
  ): Promise<void> {

    const updateUserPayload: UpdateUserPayload = {
      refresh_device_metadata: true,
      deltas: {
        session_time: sessionDuration,
      }
    };

    const aliasPair = new AliasPair("onesignalId", onesignalId);

    try {
      await RequestService.updateUser({ appId, subscriptionId }, aliasPair, updateUserPayload);
    } catch (e) {
      Log.debug("Error sending session duration:", e);
    }

    // TO DO: outcome attribution, make rest call to `/measure` endpoint
    // device_type will be used for outcomes
    /* TO DO: outcome attribution
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
    */
  }
}

export default OneSignalApiSW;
