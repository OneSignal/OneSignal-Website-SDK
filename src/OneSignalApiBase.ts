import Environment from './Environment';
import SdkEnvironmentHelper from './helpers/SdkEnvironmentHelper';
import { Utils } from "./utils/Utils";

type Headers = any[] & {[key: string]: any};
type SupportedMethods = "GET" | "POST" | "PUT" | "DELETE";

export class OneSignalApiBase {
  static get(action: string, data?: any, headers?: Headers | undefined) {
    return OneSignalApiBase.call('GET', action, data, headers);
  }

  static post(action: string, data?: any, headers?: Headers | undefined) {
    return OneSignalApiBase.call('POST', action, data, headers);
  }

  static put(action: string, data?: any, headers?: Headers | undefined) {
    return OneSignalApiBase.call('PUT', action, data, headers);
  }

  static delete(action: string, data?: any, headers?: Headers | undefined) {
    return OneSignalApiBase.call('DELETE', action, data, headers);
  }

  private static call(method: SupportedMethods, action: string, data: any, headers: Headers | undefined) {
    let callHeaders: any = new Headers();
    callHeaders.append('SDK-Version', `onesignal/web/${Environment.version()}`);
    callHeaders.append('Content-Type', 'application/json;charset=UTF-8');
    if (headers) {
      for (let key of Object.keys(headers)) {
        callHeaders.append(key, headers[key]);
      }
    }

    let contents = {
      method: method || 'NO_METHOD_SPECIFIED',
      headers: callHeaders,
      cache: 'no-cache'
    };
    if (data)
      (contents as any).body = JSON.stringify(data);

    let status: number;
    return fetch(SdkEnvironmentHelper.getOneSignalApiUrl().toString() + '/' + action, contents)
        .then(response => {
          status = response.status;
          return response.json();
        })
        .then(json => {
          if (status >= 200 && status < 300)
            return json;
          else {
            let error = OneSignalApiBase.identifyError(json);
            if (error === 'no-user-id-error') {
              // TODO: This returns undefined
            } else {
              return Promise.reject(json);
            }
          }
        });
  }

  private static identifyError(error: any) {
    if (!error || !error.errors) {
      return 'no-error';
    }
    let errors = error.errors;
    if (Utils.contains(errors, 'No user with this id found') ||
        Utils.contains(errors, 'Could not find app_id for given player id.')) {
      return 'no-user-id-error';
    }
    return 'unknown-error';
  }
}

export default OneSignalApiBase;
