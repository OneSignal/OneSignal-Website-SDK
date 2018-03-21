import JSONP from 'jsonp';
import Environment from './Environment';
import SdkEnvironment from './managers/SdkEnvironment';
import { AppConfig, ServerAppConfig } from './models/AppConfig';
import { DeviceRecord } from './models/DeviceRecord';
import { contains, trimUndefined } from './utils';
import { OneSignalApiErrorKind, OneSignalApiError } from './errors/OneSignalApiError';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import { EmailProfile } from './models/EmailProfile';
import { SubscriptionStateKind } from './models/SubscriptionStateKind';
import Log from './libraries/Log';


export default class OneSignalApi {

  static get(action, data?, headers?) {
    return OneSignalApi.call('GET', action, data, headers);
  }

  static post(action, data?, headers?) {
    return OneSignalApi.call('POST', action, data, headers);
  }

  static put(action, data?, headers?) {
    return OneSignalApi.call('PUT', action, data, headers);
  }

  static delete(action, data?, headers?) {
    return OneSignalApi.call('DELETE', action, data, headers);
  }

  static call(method, action, data, headers) {
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

    var status;
    return fetch(SdkEnvironment.getOneSignalApiUrl().toString() + '/' + action, contents)
        .then(response => {
          status = response.status;
          return response.json();
        })
        .then(json => {
          if (status >= 200 && status < 300)
            return json;
          else {
            let error = OneSignalApi.identifyError(json);
            if (error === 'no-user-id-error') {
              // TODO: This returns undefined
            } else {
              return Promise.reject(json);
            }
          }
        });
  }

  static identifyError(error) {
    if (!error || !error.errors) {
      return 'no-error';
    }
    let errors = error.errors;
    if (contains(errors, 'No user with this id found') ||
        contains(errors, 'Could not find app_id for given player id.')) {
      return 'no-user-id-error';
    }
    return 'unknown-error';
  }

  /**
   * Given a GCM or Firefox subscription endpoint or Safari device token, returns the user ID from OneSignal's server.
   * Used if the user clears his or her IndexedDB database and we need the user ID again.
   */
  static getUserIdFromSubscriptionIdentifier(appId: string, deviceType: number, identifier: string): Promise<string> {
    // Calling POST /players with an existing identifier returns us that player ID
    return OneSignalApi.post('players', {
      app_id: appId,
      device_type: deviceType,
      identifier: identifier,
      notification_types: SubscriptionStateKind.TemporaryWebRecord,
    }).then(response => {
      if (response && response.id) {
        return response.id;
      } else {
        return null;
      }
    }).catch(e => {
      Log.debug('Error getting user ID from subscription identifier:', e);
      return null;
    });
  }

  static getPlayer(appId, playerId) {
    return OneSignalApi.get(`players/${playerId}?app_id=${appId}`);
  }

  static updatePlayer(appId: string, playerId: string, options?: Object) {
    return OneSignalApi.put(`players/${playerId}`, {app_id: appId, ...options});
  }

  static sendNotification(appId: string, playerIds: Array<string>, titles, contents, url, icon, data, buttons) {
    var params = {
      app_id: appId,
      contents: contents,
      include_player_ids: playerIds,
      isAnyWeb: true,
      data: data,
      web_buttons: buttons
    };
    if (titles) {
      (params as any).headings = titles;
    }
    if (url) {
      (params as any).url = url;
    }
    if (icon) {
      (params as any).chrome_web_icon = icon;
      (params as any).firefox_icon = icon;
    }
    trimUndefined(params);
    return OneSignalApi.post('notifications', params);
  }

  static async downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
    try {
      const serverConfig = await new Promise<ServerAppConfig>((resolve, reject) => {
        if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
          /**
           * Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
           */
          JSONP(`${SdkEnvironment.getOneSignalApiUrl().toString()}/sync/${appId}/web`, null, (err, data) => {
            if (err) {
              reject(err);
            } else {
              if (data.success) {
                resolve(data);
              } else {
                // For JSONP, we return a 200 even for errors, there's a success: false param
                reject(data);
              }
            }
          });
        } else {
          resolve(OneSignalApi.get(`sync/${appId}/web`, null));
        }
      });
      return serverConfig;
    } catch (e) {
      throw e;
    }
  }

  static async createUser(deviceRecord: DeviceRecord): Promise<string> {
    const response = await OneSignalApi.post(`players`, deviceRecord.serialize());
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async createEmailRecord(
    appConfig: AppConfig,
    emailProfile: EmailProfile,
    pushId?: string
  ): Promise<string> {
    const response = await OneSignalApi.post(`players`, {
      app_id: appConfig.appId,
      device_type: 11,
      identifier: emailProfile.emailAddress,
      device_player_id: (pushId && pushId) ? pushId : undefined,
      email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
    });
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async updateEmailRecord(
    appConfig: AppConfig,
    emailProfile: EmailProfile,
    deviceId?: string
  ): Promise<string> {
    const response = await OneSignalApi.put(`players/${emailProfile.emailId}`, {
      app_id: appConfig.appId,
      identifier: emailProfile.emailAddress,
      device_player_id: (deviceId && deviceId) ? deviceId : undefined,
      email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
    });
    if (response && response.success) {
      return response.id;
    } else {
      return null;
    }
  }

  static async logoutEmail(appConfig: AppConfig, emailProfile: EmailProfile, deviceId: string): Promise<boolean> {
    const response = await OneSignalApi.post(`players/${deviceId}/email_logout`, {
      app_id: appConfig.appId,
      parent_player_id: emailProfile.emailId,
      email_auth_hash: emailProfile.emailAuthHash ? emailProfile.emailAuthHash : undefined
    });
    if (response && response.success) {
      return true;
    } else {
      return false;
    }
  }

  static async updateUserSession(
    userId: string,
    deviceRecord: DeviceRecord,
  ): Promise<string> {
    try {
      const response = await OneSignalApi.post(`players/${userId}/on_session`, deviceRecord.serialize());
      if (response.id) {
        // A new user ID can be returned
        return response.id;
      } else {
        return userId;
      }
    } catch (e) {
      if (e && Array.isArray(e.errors) && e.errors.length > 0 && contains(e.errors[0], 'app_id not found')) {
        throw new OneSignalApiError(OneSignalApiErrorKind.MissingAppId);
      } else throw e;
    }
  }
}
