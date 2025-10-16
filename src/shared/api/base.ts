import { RETRY_MS } from 'src/core/operationRepo/constants';
import { getOneSignalApiUrl } from '../environment/detect';
import { AppIDMissingError, RetryLimitError } from '../errors/common';
import { delay } from '../helpers/general';
import { isValidUuid } from '../helpers/validators';
import { error } from '../libraries/log';
import type { APIHeaders } from '../models/APIHeaders';
import { IS_SERVICE_WORKER, VERSION } from '../utils/env';

type SupportedMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface OneSignalApiBaseResponse<T = unknown> {
  ok: boolean;
  result: T;
  status: number;
  retryAfterSeconds?: number;
}

const getOrigin = () => {
  if (IS_SERVICE_WORKER) {
    return self.location.origin;
  }
  return window.location.origin;
};

export function get<T>(
  action: string,
  data?: any,
  headers?: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('GET', action, data, headers);
}

export function post<T>(
  action: string,
  data?: any,
  headers?: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('POST', action, data, headers);
}

export function put<T>(
  action: string,
  data?: any,
  headers?: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('PUT', action, data, headers);
}

function del<T>(
  action: string,
  data?: any,
  headers?: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('DELETE', action, data, headers);
}

// since delete is a keyword, cant name function delete
export { del as delete };

export function patch<T = unknown>(
  action: string,
  data?: any,
  headers?: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('PATCH', action, data, headers);
}

function call<T = unknown>(
  method: SupportedMethods,
  action: string,
  data: any,
  headers: APIHeaders | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  if (!requestHasAppId(action, data)) {
    return Promise.reject(AppIDMissingError);
  }

  const callHeaders = new Headers();
  callHeaders.append('Origin', getOrigin());
  callHeaders.append('SDK-Version', `onesignal/web/${VERSION}`);
  callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
  callHeaders.append('Accept', 'application/vnd.onesignal.v1+json');
  if (headers) {
    for (const key of Object.keys(headers)) {
      callHeaders.append(key, headers[key]);
    }
  }

  const contents: RequestInit = {
    method: method || 'NO_METHOD_SPECIFIED',
    headers: callHeaders,
    cache: 'no-cache',
  };
  if (data) contents.body = JSON.stringify(data);

  const url = `${getOneSignalApiUrl({
    action,
  }).toString()}${action}`;

  return executeFetch(url, contents);
}

async function executeFetch<T = unknown>(
  url: string,
  contents: RequestInit,
  retry = 5,
): Promise<OneSignalApiBaseResponse<T>> {
  if (retry === 0) {
    return Promise.reject(RetryLimitError);
  }
  try {
    const response = await fetch(url, contents);
    const { status, headers } = response;
    const json = await response.json();
    const retryAfter = headers?.get('Retry-After');
    return {
      ok: response.ok,
      result: json,
      status,
      retryAfterSeconds: retryAfter ? parseInt(retryAfter) : undefined,
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'TypeError') {
      // start with 10 seconds, then 20 seconds, then 30 seconds
      await delay(retry > 3 ? (6 - retry) * RETRY_MS : 3 * RETRY_MS);
      error(`OneSignal: Network timed out while calling ${url}. Retrying...`);
      return executeFetch(url, contents, retry - 1);
    }
    throw new Error(`Failed to execute HTTP call: ${e}`);
  }
}

// OneSignal's backend requires that all request have a
// have a app_id in the UUID format in the request
function requestHasAppId(url: string, body?: Record<string, unknown>): boolean {
  if (url.startsWith('apps/')) {
    const parts = url.split('/');
    return isValidUuid(parts[1]);
  }

  // special case for sync
  if (url.startsWith('sync/')) {
    const parts = url.split('/');
    return isValidUuid(parts[1]);
  }

  if (body && typeof body['app_id'] === 'string') {
    return isValidUuid(body['app_id']);
  }
  return false;
}
