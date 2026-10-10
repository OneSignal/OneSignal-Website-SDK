import { RETRY_MS } from 'src/core/operationRepo/constants';

import { getOneSignalApiUrl } from '../environment/detect';
import { AppIDMissingError, RetryLimitError } from '../errors/common';
import { delay } from '../helpers/general';
import { isValidUuid } from '../helpers/validators';
import Log from '../libraries/Log';
import type { APIHeaders } from '../models/APIHeaders';
import { encodeRFC3986URIComponent } from '../utils/encode';
import { IS_SERVICE_WORKER, VERSION } from '../utils/env';

type SupportedMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * One entry per URL path segment. `call` percent-encodes each entry on its own,
 * so a `/` inside a value such as an external id stays inside its segment.
 */
export type ApiPath = readonly string[];

export interface OneSignalApiBaseResponse<T = unknown> {
  ok: boolean;
  result: T;
  status: number;
  retryAfterSeconds?: number;
}

export interface RequestOptions {
  headers?: APIHeaders;
  /**
   * Sent as `Authorization: Bearer <jwt>`. Only this path sets the header, so the
   * token never lands in `headers` where a log line could print it.
   */
  jwt?: string;
}

const getOrigin = () => {
  if (IS_SERVICE_WORKER) {
    return self.location.origin;
  }
  return window.location.origin;
};

export function get<T>(
  path: ApiPath,
  data?: any,
  options?: RequestOptions,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('GET', path, data, options);
}

export function post<T>(
  path: ApiPath,
  data?: any,
  options?: RequestOptions,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('POST', path, data, options);
}

export function put<T>(
  path: ApiPath,
  data?: any,
  options?: RequestOptions,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('PUT', path, data, options);
}

function del<T>(
  path: ApiPath,
  data?: any,
  options?: RequestOptions,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('DELETE', path, data, options);
}

// since delete is a keyword, cant name function delete
export { del as delete };

export function patch<T = unknown>(
  path: ApiPath,
  data?: any,
  options?: RequestOptions,
): Promise<OneSignalApiBaseResponse<T>> {
  return call('PATCH', path, data, options);
}

function call<T = unknown>(
  method: SupportedMethods,
  path: ApiPath,
  data: any,
  options: RequestOptions | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  if (!requestHasAppId(path, data)) {
    return Promise.reject(AppIDMissingError);
  }

  const callHeaders = new Headers();
  callHeaders.append('Origin', getOrigin());
  callHeaders.append('SDK-Version', `onesignal/web/${VERSION}`);
  callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
  callHeaders.append('Accept', 'application/vnd.onesignal.v1+json');
  const headers = options?.headers;
  if (headers) {
    for (const key of Object.keys(headers)) {
      callHeaders.append(key, headers[key]);
    }
  }
  if (options?.jwt) {
    callHeaders.append('Authorization', `Bearer ${options.jwt}`);
  }

  const contents: RequestInit = {
    method: method || 'NO_METHOD_SPECIFIED',
    headers: callHeaders,
    cache: 'no-cache',
  };
  if (data) contents.body = JSON.stringify(data);

  const action = path.map(encodeRFC3986URIComponent).join('/');
  const url = `${getOneSignalApiUrl({ action }).toString()}${action}`;

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
      Log._error(`Fetch timeout ${url}, retrying...`);
      return executeFetch(url, contents, retry - 1);
    }
    throw new Error(`Failed to execute HTTP call: ${String(e)}`);
  }
}

// OneSignal's backend requires that all request have a
// have a app_id in the UUID format in the request
function requestHasAppId(path: ApiPath, body?: Record<string, unknown>): boolean {
  if (path[0] === 'apps' || path[0] === 'sync') {
    return isValidUuid(path[1]);
  }

  if (body && typeof body['app_id'] === 'string') {
    return isValidUuid(body['app_id']);
  }
  return false;
}
