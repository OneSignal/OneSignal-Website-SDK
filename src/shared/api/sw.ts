import { IdentityConstants } from 'src/core/constants';
import { updateUserByAlias } from 'src/core/requests/api';
import type { AliasPair, IUpdateUser } from 'src/core/types/api';

import type { ServerAppConfig } from '../config/types';
import { enforceAlias, enforceAppId } from '../context/helpers';
import { getSubscriptionType } from '../environment/detect';
import { getResponseStatusType, ResponseStatusType } from '../helpers/network';
import Log from '../libraries/Log';
import type { DeliveryPlatformKindValue } from '../models/DeliveryPlatformKind';
import { OutcomeAttributionType, type OutcomeAttribution } from '../models/Outcomes';
import type { OutcomeRequestData } from '../outcomes/types';
import type { SessionUser } from '../session/types';
import { NotificationType } from '../subscriptions/constants';
import * as OneSignalApiBase from './base';
import type { OneSignalApiBaseResponse } from './base';
import { sendOutcome } from './shared';

export async function downloadSWServerAppConfig(appId: string): Promise<ServerAppConfig> {
  enforceAppId(appId);
  const response = await OneSignalApiBase.get<ServerAppConfig>(`sync/${appId}/web`, null);
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
    notification_types: NotificationType._TemporaryWebRecord,
  })
    .then((response) => {
      if (response?.result?.id) {
        return response.result.id;
      } else {
        return null;
      }
    })
    .catch((e) => {
      Log._debug('Error getting user ID:', e);
      return null;
    });
}

/**
 * The page only sends both ids when Identity Verification is on and it holds a
 * token for this user, so their presence is the worker's IV signal.
 */
function sessionBackendParams({ onesignalId, externalId, jwt }: SessionUser): {
  alias: AliasPair;
  jwt?: string;
} {
  if (externalId && jwt) {
    return { alias: { label: IdentityConstants._ExternalID, id: externalId }, jwt };
  }
  return { alias: { label: IdentityConstants._OneSignalID, id: onesignalId } };
}

// The worker cannot reach the page token store. The page removes the token on
// its own next 401, so the worker only reports the rejection.
function logIfUnauthorized(response: OneSignalApiBaseResponse, jwt: string | undefined): void {
  if (jwt && getResponseStatusType(response.status) === ResponseStatusType._Unauthorized) {
    Log._error('[SW] The server rejected the session request: the JWT is invalid');
  }
}

/**
 *  Main on_session call
 * @returns
 */
export async function updateUserSession(user: SessionUser): Promise<void> {
  const { appId, subscriptionId } = user;
  const { alias, jwt } = sessionBackendParams(user);
  // TO DO: in future, we should aggregate session count in case network call fails
  const updateUserPayload: IUpdateUser = {
    refresh_device_metadata: true,
    deltas: {
      session_count: 1,
    },
  };

  enforceAppId(appId);
  enforceAlias(alias);
  try {
    const response = await updateUserByAlias(
      { appId, subscriptionId, jwt },
      alias,
      updateUserPayload,
    );
    logIfUnauthorized(response, jwt);
  } catch (e) {
    Log._debug('Session update error:', e);
  }
}

export async function sendSessionDuration(
  user: SessionUser,
  sessionDuration: number,
  attribution: OutcomeAttribution,
): Promise<void> {
  const { appId, onesignalId, subscriptionId } = user;
  const { alias, jwt } = sessionBackendParams(user);
  const updateUserPayload: IUpdateUser = {
    refresh_device_metadata: true,
    deltas: {
      session_time: sessionDuration,
    },
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

  outcomePayload.direct = attribution.type === OutcomeAttributionType._Direct ? true : false;

  try {
    const response = await updateUserByAlias(
      { appId, subscriptionId, jwt },
      alias,
      updateUserPayload,
    );
    logIfUnauthorized(response, jwt);

    if (outcomePayload.notification_ids && outcomePayload.notification_ids.length > 0) {
      await sendOutcome(outcomePayload);
    }
  } catch (e) {
    Log._debug('Session duration error:', e);
  }
}
