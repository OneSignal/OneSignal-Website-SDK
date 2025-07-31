import type { IUpdateUser } from 'src/core/types/api';
import { NotificationType } from 'src/core/types/subscription';
import AliasPair from '../../core/requestService/AliasPair';
import { RequestService } from '../../core/requestService/RequestService';
import type { OutcomeRequestData } from '../../page/models/OutcomeRequestData';
import type { ServerAppConfig } from '../config';
import Utils from '../context/Utils';
import { getSubscriptionType } from '../environment';
import Log from '../libraries/Log';
import type { DeliveryPlatformKindValue } from '../models/DeliveryPlatformKind';
import {
  OutcomeAttributionType,
  type OutcomeAttribution,
} from '../models/Outcomes';
import { OneSignalApiBase } from './OneSignalApiBase';
import OneSignalApiShared from './OneSignalApiShared';

export class OneSignalApiSW {
  static async downloadServerAppConfig(
    appId: string,
  ): Promise<ServerAppConfig> {
    Utils.enforceAppId(appId);
    const response = await OneSignalApiBase.get<ServerAppConfig>(
      `sync/${appId}/web`,
      null,
    );
    return response?.result;
  }

  /**
   * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
   * Used if the user clears his or her IndexedDB database and we need the user ID again.
   */
  static getUserIdFromSubscriptionIdentifier(
    appId: string,
    deviceType: DeliveryPlatformKindValue,
    identifier: string,
  ): Promise<string | null> {
    // Calling POST /players with an existing identifier returns us that player ID
    Utils.enforceAppId(appId);
    return OneSignalApiBase.post<{ id: string }>('players', {
      app_id: appId,
      device_type: deviceType,
      identifier: identifier,
      notification_types: NotificationType.TemporaryWebRecord,
    })
      .then((response) => {
        if (response?.result?.id) {
          return response.result.id;
        } else {
          return null;
        }
      })
      .catch((e) => {
        Log.debug('Error getting user ID from subscription identifier:', e);
        return null;
      });
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
    const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);
    // TO DO: in future, we should aggregate session count in case network call fails
    const updateUserPayload: IUpdateUser = {
      refresh_device_metadata: true,
      deltas: {
        session_count: 1,
      },
    };

    Utils.enforceAppId(appId);
    Utils.enforceAlias(aliasPair);
    try {
      await RequestService.updateUser(
        { appId, subscriptionId },
        aliasPair,
        updateUserPayload,
      );
    } catch (e) {
      Log.debug('Error updating user session:', e);
    }
  }

  public static async sendSessionDuration(
    appId: string,
    onesignalId: string,
    subscriptionId: string,
    sessionDuration: number,
    attribution: OutcomeAttribution,
  ): Promise<void> {
    const updateUserPayload: IUpdateUser = {
      refresh_device_metadata: true,
      deltas: {
        session_time: sessionDuration,
      },
    };

    const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);

    const outcomePayload: OutcomeRequestData = {
      id: 'os__session_duration',
      app_id: appId,
      session_time: sessionDuration,
      notification_ids: attribution.notificationIds,
      subscription: {
        id: subscriptionId,
        type: getSubscriptionType(),
      },
      onesignal_id: onesignalId,
    };

    outcomePayload.direct =
      attribution.type === OutcomeAttributionType.Direct ? true : false;

    try {
      await RequestService.updateUser(
        { appId, subscriptionId },
        aliasPair,
        updateUserPayload,
      );

      if (
        outcomePayload.notification_ids &&
        outcomePayload.notification_ids.length > 0
      ) {
        await OneSignalApiShared.sendOutcome(outcomePayload);
      }
    } catch (e) {
      Log.debug('Error sending session duration:', e);
    }
  }
}

export default OneSignalApiSW;
