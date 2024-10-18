import {
  OneSignalApiError,
  OneSignalApiErrorKind,
} from '../errors/OneSignalApiError';
import OneSignalError from '../errors/OneSignalError';
import Environment from '../helpers/Environment';
import Log from '../libraries/Log';
import EventHelper from '../helpers/EventHelper';
import SdkEnvironment from '../managers/SdkEnvironment';
import { awaitableTimeout } from '../utils/AwaitableTimeout';
import { isValidUuid } from '../utils/utils';
import OneSignalApiBaseResponse from './OneSignalApiBaseResponse';
import { RETRY_BACKOFF } from './RetryBackoff';

type SupportedMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
const OS_API_VERSION = '1';

export class OneSignalApiBase {
  static get(
    url: string,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.makeRequest('GET', url, undefined, headers);
  }

  static post(
    url: string,
    body?: any,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.makeRequest('POST', url, body, headers);
  }

  static put(
    url: string,
    body?: any,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.makeRequest('PUT', url, body, headers);
  }

  static delete(
    url: string,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.makeRequest('DELETE', url, undefined, headers);
  }

  static patch(
    url: string,
    body?: any,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.makeRequest('PATCH', url, body, headers);
  }

  private static async makeRequest(
    method: SupportedMethods,
    url: string,
    body?: any,
    headers?: Headers,
  ): Promise<OneSignalApiBaseResponse> {
    if (!this.requestHasAppId(url, body)) {
      return Promise.reject(
        new OneSignalApiError(OneSignalApiErrorKind.MissingAppId),
      );
    }

    const requestHeaders = new Headers({
      Origin: SdkEnvironment.getOrigin(),
      'SDK-Version': `onesignal/web/${Environment.version()}`,
      'Content-Type': 'application/json;charset=UTF-8',
    });

    if (headers) {
      headers.forEach((value, key) => {
        requestHeaders.append(key, value);
      });
    }

    const contents: RequestInit = {
      method: method || 'NO_METHOD_SPECIFIED',
      headers: requestHeaders,
      cache: 'no-cache',
    };

    if (body) contents.body = JSON.stringify(body);

    const requestUrl = `${SdkEnvironment.getOneSignalApiUrl(
      undefined,
      url,
    ).toString()}/${url}`;

    return OneSignalApiBase.executeFetch(requestUrl, contents);
  }

  private static async executeFetch(
    url: string,
    contents: RequestInit,
    retry = 5,
  ): Promise<OneSignalApiBaseResponse> {
    if (retry === 0) {
      return Promise.reject(
        new OneSignalApiError(OneSignalApiErrorKind.RetryLimitReached),
      );
    }
    try {
      const response = await fetch(url, contents);
      const { status } = response;
      const json = await response.json();

      return {
        result: json,
        status,
      };
    } catch (e) {
      if (e.name === 'TypeError') {
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

    if (body && typeof body['app_id'] === 'string') {
      return isValidUuid(body['app_id']);
    }
    return false;
  }
}

export default OneSignalApiBase;
