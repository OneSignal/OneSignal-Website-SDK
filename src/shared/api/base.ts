import { getOneSignalApiUrl } from '../environment/detect';
import { AppIDMissingError, RetryLimitError } from '../errors/common';
import { isValidUuid } from '../helpers/validators';
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

/**
 * Sends once, with no retry; callers own retry and backoff. Resolves with the status
 * even when the body is empty or not JSON (`result` is then `undefined`), and rejects
 * with `RetryLimitError` when there is no response.
 */
async function call<T = unknown>(
  method: SupportedMethods,
  path: ApiPath,
  data: any,
  options: RequestOptions | undefined,
): Promise<OneSignalApiBaseResponse<T>> {
  if (!requestHasAppId(path, data)) throw AppIDMissingError;

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
    method,
    headers: callHeaders,
    cache: 'no-cache',
  };
  if (data) contents.body = JSON.stringify(data);

  const action = path.map(encodeRFC3986URIComponent).join('/');
  // getOneSignalApiUrl picks the API origin from the encoded path.
  const url = `${getOneSignalApiUrl({ action }).toString()}${action}`;

  const response = await fetch(url, contents).catch(() => {
    throw RetryLimitError;
  });
  const retryAfter = parseInt(response.headers.get('Retry-After') ?? '');
  return {
    ok: response.ok,
    result: await response.json().catch(() => undefined),
    status: response.status,
    retryAfterSeconds: retryAfter >= 0 ? retryAfter : undefined,
  };
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
