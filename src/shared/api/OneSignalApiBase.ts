import {
  OneSignalApiError,
  OneSignalApiErrorKind,
} from '../errors/OneSignalApiError';
import OneSignalError from '../errors/OneSignalError';
import Environment from '../helpers/Environment';
import Log from '../libraries/Log';
import SdkEnvironment from '../managers/SdkEnvironment';
import { APIHeaders } from '../models/APIHeaders';
import { awaitableTimeout } from '../utils/AwaitableTimeout';
import { isValidUuid } from '../utils/utils';
import OneSignalApiBaseResponse from './OneSignalApiBaseResponse';
import { RETRY_BACKOFF } from './RetryBackoff';

type SupportedMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export class OneSignalApiBase {
  static get<T = unknown>(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse<T>> {
    return OneSignalApiBase.call('GET', action, data, headers);
  }

  static post<T = unknown>(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse<T>> {
    return OneSignalApiBase.call('POST', action, data, headers);
  }

  static put(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('PUT', action, data, headers);
  }

  static delete<T = unknown>(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse<T>> {
    return OneSignalApiBase.call('DELETE', action, data, headers);
  }

  static patch<T = unknown>(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse<T>> {
    return OneSignalApiBase.call('PATCH', action, data, headers);
  }

  private static call<T = unknown>(
    method: SupportedMethods,
    action: string,
    data: any,
    headers: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse<T>> {
    if (!this.requestHasAppId(action, data)) {
      return Promise.reject(
        new OneSignalApiError(OneSignalApiErrorKind.MissingAppId),
      );
    }

    const callHeaders = new Headers();
    callHeaders.append('Origin', SdkEnvironment.getOrigin());
    callHeaders.append('SDK-Version', `onesignal/web/${Environment.version()}`);
    callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
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

    const url = `${SdkEnvironment.getOneSignalApiUrl(
      undefined,
      action,
    ).toString()}/${action}`;

    return OneSignalApiBase.executeFetch(url, contents);
  }

  private static async executeFetch<T = unknown>(
    url: string,
    contents: RequestInit,
    retry = 5,
  ): Promise<OneSignalApiBaseResponse<T>> {
    if (retry === 0) {
      return Promise.reject(
        new OneSignalApiError(OneSignalApiErrorKind.RetryLimitReached),
      );
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
        await awaitableTimeout(RETRY_BACKOFF[retry]);
        Log.error(
          `OneSignal: Network timed out while calling ${url}. Retrying...`,
        );
        return OneSignalApiBase.executeFetch(url, contents, retry - 1);
      }
      throw new OneSignalError(
        `OneSignalApiBase: failed to execute HTTP call: ${e}`,
      );
    }
  }

  // OneSignal's backend requires that all request have a
  // have a app_id in the UUID format in the request
  private static requestHasAppId(
    url: string,
    body?: Record<string, unknown>,
  ): boolean {
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
}

export default OneSignalApiBase;
