import { AppIDMissingError } from '../errors/common';
import Log from '../libraries/Log';
import type { SubscriptionTypeValue } from '../subscriptions/types';
import * as OneSignalApiBase from './base';
import type { OneSignalApiBaseResponse } from './base';

export interface CreateSessionRequest {
  onesignalId: string;
  subscriptionId: string;
  subscriptionType: SubscriptionTypeValue;
  /** Epoch milliseconds. */
  startTime: number;
  idempotencyKey: string;
  directAttributionId?: string;
}

export interface UpdateSessionRequest {
  onesignalId: string;
  subscriptionId: string;
  durationSeconds: number;
  idempotencyKey: string;
  /** Epoch milliseconds. Set to end the session. */
  endTime?: number;
}

export type SessionsApiResult<T = void> =
  | { kind: 'success'; value: T }
  /** No response, 5xx, 408, 429, or a create success without a session id. */
  | { kind: 'retry'; status?: number; retryAfterSeconds?: number }
  /** Other 4xx, or a request rejected before sending. Retrying will not help. */
  | { kind: 'drop'; status?: number };

interface CreateSessionResponse {
  data?: { session_id?: unknown };
}

export function createSession(
  appId: string,
  request: CreateSessionRequest,
): Promise<SessionsApiResult<string>> {
  return send(
    () =>
      OneSignalApiBase.post<CreateSessionResponse>(['apps', appId, 'sessions'], {
        onesignal_id: request.onesignalId,
        subscription_id: request.subscriptionId,
        subscription_type: request.subscriptionType,
        start_time: new Date(request.startTime).toISOString(),
        idempotency_key: request.idempotencyKey,
        direct_attribution_id: request.directAttributionId,
      }),
    (response) => {
      const sessionId = response.result?.data?.session_id;
      if (typeof sessionId === 'string' && sessionId) {
        return { kind: 'success', value: sessionId };
      }
      // Retrying with the same idempotency key returns the session the backend already created.
      Log._warn('Sessions API: create response has no session id');
      return {
        kind: 'retry',
        status: response.status,
        retryAfterSeconds: response.retryAfterSeconds,
      };
    },
  );
}

export function updateSession(
  appId: string,
  sessionId: string,
  request: UpdateSessionRequest,
): Promise<SessionsApiResult> {
  return send(
    () =>
      OneSignalApiBase.patch(['apps', appId, 'sessions', sessionId], {
        onesignal_id: request.onesignalId,
        subscription_id: request.subscriptionId,
        duration_seconds: request.durationSeconds,
        idempotency_key: request.idempotencyKey,
        end_time:
          request.endTime === undefined ? undefined : new Date(request.endTime).toISOString(),
      }),
    () => ({ kind: 'success', value: undefined }),
  );
}

async function send<R, T>(
  request: () => Promise<OneSignalApiBaseResponse<R>>,
  onSuccess: (response: OneSignalApiBaseResponse<R> & { ok: true }) => SessionsApiResult<T>,
): Promise<SessionsApiResult<T>> {
  let response: OneSignalApiBaseResponse<R>;
  try {
    response = await request();
  } catch (e) {
    Log._debug('Sessions API request failed:', e);
    // A missing app id, or a RangeError from an invalid time: retrying will not help.
    if (e === AppIDMissingError || e instanceof RangeError) return { kind: 'drop' };
    return { kind: 'retry' };
  }

  if (response.ok) return onSuccess(response);
  const { status, retryAfterSeconds } = response;
  if (status === 408 || status === 429 || status >= 500) {
    return { kind: 'retry', status, retryAfterSeconds };
  }
  return { kind: 'drop', status };
}
