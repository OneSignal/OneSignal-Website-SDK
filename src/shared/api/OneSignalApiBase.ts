import {
  OneSignalApiError,
  OneSignalApiErrorKind,
} from '../errors/OneSignalApiError';
import OneSignalError from '../errors/OneSignalError';
import { convertHeadersToPlainObjectForUnitTesting } from '../helpers/ApiBaseHelper';
import Environment from '../helpers/Environment';
import Log from '../libraries/Log';
import SdkEnvironment from '../managers/SdkEnvironment';
import { APIHeaders } from '../models/APIHeaders';
import { TestEnvironmentKind } from '../models/TestEnvironmentKind';
import { awaitableTimeout } from '../utils/AwaitableTimeout';
import { isValidUuid } from '../utils/utils';
import OneSignalApiBaseResponse from './OneSignalApiBaseResponse';
import { RETRY_BACKOFF } from './RetryBackoff';

type SupportedMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export class OneSignalApiBase {
  static get(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('GET', action, data, headers);
  }

  static post(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('POST', action, data, headers);
  }

  static put(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('PUT', action, data, headers);
  }

  static delete(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('DELETE', action, data, headers);
  }

  static patch(
    action: string,
    data?: any,
    headers?: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('PATCH', action, data, headers);
  }

  private static call(
    method: SupportedMethods,
    action: string,
    data: any,
    headers: APIHeaders | undefined,
  ): Promise<OneSignalApiBaseResponse> {
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
      if (
        !!contents.headers &&
        SdkEnvironment.getTestEnv() === TestEnvironmentKind.UnitTesting
      ) {
        contents.headers = convertHeadersToPlainObjectForUnitTesting(
          contents.headers,
        );
      }

      // continue with fetch
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
