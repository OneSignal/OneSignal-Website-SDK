import { IdentityConstants } from 'src/core/constants';
import { updateUserByAlias } from 'src/core/requests/api';
import type { IUpdateUser } from 'src/core/types/api';
import type { ServerAppConfig } from '../config/types';
import { enforceAlias, enforceAppId } from '../context/helpers';
import { getSubscriptionType } from '../environment/detect';
import Log from '../libraries/Log';
import type { DeliveryPlatformKindValue } from '../models/DeliveryPlatformKind';
import {
  OutcomeAttributionType,
  type OutcomeAttribution,
} from '../models/Outcomes';
import type { OutcomeRequestData } from '../outcomes/types';
import { NotificationType } from '../subscriptions/constants';
import * as OneSignalApiBase from './base';
import { sendOutcome } from './shared';

export async function downloadSWServerAppConfig(
  appId: string,
): Promise<ServerAppConfig> {
  enforceAppId(appId);
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
export async function getUserIdFromSubscriptionIdentifier(
  appId: string,
  deviceType: DeliveryPlatformKindValue,
  identifier: string,
): Promise<string | null> {
  // Calling POST /players with an existing identifier returns us that player ID
  enforceAppId(appId);
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
      Log._debug('Error getting user ID from subscription identifier:', e);
      return null;
    });
}

/**
 *  Main on_session call
 * @returns
 */
export async function updateUserSession(
  appId: string,
  onesignalId: string,
  subscriptionId: string,
): Promise<void> {
  const aliasPair = {
    label: IdentityConstants._OneSignalID,
    id: onesignalId,
  };
  // TO DO: in future, we should aggregate session count in case network call fails
  const updateUserPayload: IUpdateUser = {
    refresh_device_metadata: true,
    deltas: {
      session_count: 1,
    },
  };

  enforceAppId(appId);
  enforceAlias(aliasPair);
  try {
    await updateUserByAlias(
      { appId, subscriptionId },
      aliasPair,
      updateUserPayload,
    );
  } catch (e) {
    Log._debug('Error updating user session:', e);
  }
}

export async function sendSessionDuration(
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

  const aliasPair = {
    label: IdentityConstants._OneSignalID,
    id: onesignalId,
  };

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
    await updateUserByAlias(
      { appId, subscriptionId },
      aliasPair,
      updateUserPayload,
    );

    if (
      outcomePayload.notification_ids &&
      outcomePayload.notification_ids.length > 0
    ) {
      await sendOutcome(outcomePayload);
    }
  } catch (e) {
    Log._debug('Error sending session duration:', e);
  }
}
