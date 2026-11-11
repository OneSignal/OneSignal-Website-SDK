import { IdentityConstants } from 'src/core/constants';
import { updateUserByAlias } from 'src/core/requests/api';
import type { AliasPair, IUpdateUser } from 'src/core/types/api';

import type { ServerAppConfig } from '../config/types';
import { enforceAlias, enforceAppId } from '../context/helpers';
import { getSubscriptionType } from '../environment/detect';
import { getResponseStatusType, ResponseStatusType } from '../helpers/network';
import Log from '../libraries/Log';
import {
  type JwtUnauthorizedPayload,
  WorkerMessengerCommand,
} from '../libraries/workerMessenger/constants';
import { postToOnePage } from '../libraries/workerMessenger/sw';
import { OutcomeAttributionType, type OutcomeAttribution } from '../models/Outcomes';
import type { OutcomeRequestData } from '../outcomes/types';
import type { SessionUser } from '../session/types';
import * as OneSignalApiBase from './base';
import type { OneSignalApiBaseResponse } from './base';
import { sendOutcome } from './shared';

export async function downloadSWServerAppConfig(appId: string): Promise<ServerAppConfig> {
  enforceAppId(appId);
  const response = await OneSignalApiBase.get<ServerAppConfig>(['sync', appId, 'web'], null);
  return response?.result;
}

/**
 * Under Identity Verification an anonymous user has no backend user, and a
 * request without a token can only get a 401, so both return null and the
 * caller skips the user request. The unsigned outcome request is not affected.
 */
function sessionBackendParams({ onesignalId, jwtRequired, externalId, jwt }: SessionUser): {
  alias: AliasPair;
  jwt?: string;
} | null {
  if (!jwtRequired) {
    return { alias: { label: IdentityConstants._OneSignalID, id: onesignalId } };
  }
  if (externalId && jwt) {
    return { alias: { label: IdentityConstants._ExternalID, id: externalId }, jwt };
  }
  Log._debug('[SW] No JWT under Identity Verification, skipping the session request');
  return null;
}

// The worker cannot reach the page token store, so it tells one page which
// token the server rejected. The page removes it only if it is still the stored one.
// One page only: each tab that got the report would fire userJwtInvalidated.
// Awaited so the post finishes inside the event's waitUntil, before the
// browser can stop the worker.
async function notifyPageIfUnauthorized(
  response: OneSignalApiBaseResponse,
  { externalId, jwt }: Pick<SessionUser, 'externalId' | 'jwt'>,
): Promise<void> {
  if (!jwt || !externalId) return;
  if (getResponseStatusType(response.status) !== ResponseStatusType._Unauthorized) return;
  Log._error(`[SW] The server rejected the JWT on the session request (${response.status})`);
  const payload: JwtUnauthorizedPayload = { externalId, jwt };
  await postToOnePage(WorkerMessengerCommand._JwtUnauthorized, payload);
}

/**
 *  Main on_session call
 * @returns false when the request was skipped, got a 401, or did not reach the
 * server, so a later token can send it again. Any other response counts as sent.
 */
export async function updateUserSession(user: SessionUser): Promise<boolean> {
  const { appId, subscriptionId } = user;
  const params = sessionBackendParams(user);
  if (!params) return false;
  const { alias, jwt } = params;
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
    await notifyPageIfUnauthorized(response, user);
    return response.status !== 401;
  } catch (e) {
    Log._debug('Session update error:', e);
    return false;
  }
}

export async function sendSessionDuration(
  user: SessionUser,
  sessionDuration: number,
  attribution: OutcomeAttribution,
): Promise<void> {
  const { appId, onesignalId, subscriptionId } = user;
  const params = sessionBackendParams(user);
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
    if (params) {
      const { alias, jwt } = params;
      const response = await updateUserByAlias(
        { appId, subscriptionId, jwt },
        alias,
        updateUserPayload,
      );
      await notifyPageIfUnauthorized(response, user);
    }

    if (outcomePayload.notification_ids && outcomePayload.notification_ids.length > 0) {
      await sendOutcome(outcomePayload);
    }
  } catch (e) {
    Log._debug('Session duration error:', e);
  }
}
