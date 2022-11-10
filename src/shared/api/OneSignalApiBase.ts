import Utils from "../context/Utils";
import { OneSignalApiError, OneSignalApiErrorKind } from "../errors/OneSignalApiError";
import Environment from "../helpers/Environment";
import SdkEnvironment from "../managers/SdkEnvironment";
import OneSignalApiBaseResponse from "./OneSignalApiBaseResponse";

type Headers = any[] & {[key: string]: any};
type SupportedMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class OneSignalApiBase {
  static get(action: string, data?: any, headers?: Headers | undefined): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('GET', action, data, headers);
  }

  static post(action: string, data?: any, headers?: Headers | undefined): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('POST', action, data, headers);
  }

  static put(action: string, data?: any, headers?: Headers | undefined): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('PUT', action, data, headers);
  }

  static delete(action: string, data?: any, headers?: Headers | undefined):
    Promise<OneSignalApiBaseResponse> {
      return OneSignalApiBase.call('DELETE', action, data, headers);
  }

  static patch(action: string, data?: any, headers?: Headers | undefined): Promise<OneSignalApiBaseResponse> {
    return OneSignalApiBase.call('PATCH', action, data, headers);
  }

  private static call(method: SupportedMethods, action: string, data: any, headers: Headers | undefined):
    Promise<OneSignalApiBaseResponse> {
      if (method === "GET") {
        if (action.indexOf("players") > -1 && action.indexOf("app_id=") === -1) {
          console.error("Calls to player api are not permitted without app_id");
          return Promise.reject(new OneSignalApiError(OneSignalApiErrorKind.MissingAppId));
        }
      } else {
        if (action.indexOf("players") > -1 && (!data || !data["app_id"])) {
          console.error("Calls to player api are not permitted without app_id");
          return Promise.reject(new OneSignalApiError(OneSignalApiErrorKind.MissingAppId));
        }
      }

      const callHeaders: any = new Headers();
      callHeaders.append("Origin", SdkEnvironment.getOrigin());
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
        cache: 'no-cache'
      };
      if (data)
        contents.body = JSON.stringify(data);

      const url = `${SdkEnvironment.getOneSignalApiUrl(undefined, action).toString()}/${action}`;

      return OneSignalApiBase.executeFetch(url, contents);
  }

  private static async executeFetch(url: string, contents: RequestInit): Promise<OneSignalApiBaseResponse> {
    const response = await fetch(url, contents);
    const { status } = response;
    const json = await response.json();

      return {
        result: json,
        status
      };

    const error = OneSignalApiBase.identifyError(json);
    if (error === 'no-user-id-error') {
      // TODO: This returns undefined
    } else {
      return Promise.reject(json);
    }
  }

  /** TO DO: remove for user model */
  private static identifyError(error: any) {
    if (!error || !error.errors) {
      return 'no-error';
    }
    const errors = error.errors;
    if (Utils.contains(errors, 'No user with this id found') ||
        Utils.contains(errors, 'Could not find app_id for given player id.')) {
      return 'no-user-id-error';
    }
    return 'unknown-error';
  }
}

export default OneSignalApiBase;
