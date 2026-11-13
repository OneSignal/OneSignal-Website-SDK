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

export async function createSession(
  appId: string,
  request: CreateSessionRequest,
): Promise<SessionsApiResult<string>> {
  const startTime = toIsoString(request.startTime);
  if (startTime === undefined) return dropInvalidTime(request.startTime);

  const body = {
    onesignal_id: request.onesignalId,
    subscription_id: request.subscriptionId,
    subscription_type: request.subscriptionType,
    start_time: startTime,
    idempotency_key: request.idempotencyKey,
    direct_attribution_id: request.directAttributionId,
  };

  return send(
    // Single attempt: the queue owns retry and backoff.
    () =>
      OneSignalApiBase.callOnce<CreateSessionResponse>('POST', ['apps', appId, 'sessions'], body),
    (response) => {
      const sessionId = response.result?.data?.session_id;
      if (typeof sessionId === 'string' && sessionId) {
        return { kind: 'success', value: sessionId };
      }
      // Retrying with the same idempotency key returns the session the backend already created.
      Log._warn('Sessions API: create response has no session id');
      return { kind: 'retry', status: response.status, retryAfterSeconds: retryAfter(response) };
    },
  );
}

export async function updateSession(
  appId: string,
  sessionId: string,
  request: UpdateSessionRequest,
): Promise<SessionsApiResult> {
  const endTime = request.endTime === undefined ? undefined : toIsoString(request.endTime);
  if (request.endTime !== undefined && endTime === undefined) {
    return dropInvalidTime(request.endTime);
  }

  const body = {
    onesignal_id: request.onesignalId,
    subscription_id: request.subscriptionId,
    duration_seconds: request.durationSeconds,
    idempotency_key: request.idempotencyKey,
    end_time: endTime,
  };

  return send(
    () => OneSignalApiBase.callOnce('PATCH', ['apps', appId, 'sessions', sessionId], body),
    () => ({ kind: 'success', value: undefined }),
  );
}

async function send<R, T>(
  request: () => Promise<OneSignalApiBaseResponse<R>>,
  onSuccess: (response: OneSignalApiBaseResponse<R>) => SessionsApiResult<T>,
): Promise<SessionsApiResult<T>> {
  let response: OneSignalApiBaseResponse<R>;
  try {
    response = await request();
  } catch (e) {
    if (e === AppIDMissingError) return { kind: 'drop' };
    Log._debug('Sessions API request failed:', e);
    return { kind: 'retry' };
  }

  const { ok, status } = response;
  if (ok) return onSuccess(response);
  if (status === 408 || status === 429 || status >= 500) {
    return { kind: 'retry', status, retryAfterSeconds: retryAfter(response) };
  }
  return { kind: 'drop', status };
}

function retryAfter({ retryAfterSeconds }: OneSignalApiBaseResponse<unknown>): number | undefined {
  return retryAfterSeconds !== undefined && retryAfterSeconds >= 0 ? retryAfterSeconds : undefined;
}

function toIsoString(epochMs: number): string | undefined {
  const date = new Date(epochMs);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dropInvalidTime(epochMs: number): SessionsApiResult<never> {
  Log._warn('Sessions API: invalid time', epochMs);
  return { kind: 'drop' };
}
