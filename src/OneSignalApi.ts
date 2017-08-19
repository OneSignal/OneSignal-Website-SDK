import * as JSONP from 'jsonp';
import * as log from 'loglevel';
import * as objectAssign from 'object-assign';

import Environment from './Environment';
import SdkEnvironment from './managers/SdkEnvironment';
import { AppConfig, ServerAppConfig } from './models/AppConfig';
import { PushRegistration } from './models/PushRegistration';
import { Uuid } from './models/Uuid';
import { contains, trimUndefined } from './utils';
import { OneSignalApiErrorKind, OneSignalApiError } from './errors/OneSignalApiError';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';


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
  static getUserIdFromSubscriptionIdentifier(appId, deviceType, identifier) {
    // Calling POST /players with an existing identifier returns us that player ID
    return OneSignalApi.post('players', {
      app_id: appId,
      device_type: deviceType,
      identifier: identifier
    }).then(response => {
      if (response && response.id) {
        return response.id;
      } else {
        return null;
      }
    }).catch(e => {
      log.debug('Error getting user ID from subscription identifier:', e);
      return null;
    });
  }

  static getPlayer(appId, playerId) {
    return OneSignalApi.get(`players/${playerId}?app_id=${appId}`);
  }

  static updatePlayer(appId: Uuid, playerId: Uuid, options?: Object) {
    return OneSignalApi.put(`players/${playerId.value}`, objectAssign({app_id: appId.value}, options));
  }

  static sendNotification(appId: Uuid, playerIds: Array<Uuid>, titles, contents, url, icon, data, buttons) {
    var params = {
      app_id: appId.value,
      contents: contents,
      include_player_ids: playerIds.map(x => x.value),
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

  static async getAppConfig(appId: Uuid): Promise<AppConfig> {
    try {
      const serverConfig = await new Promise<ServerAppConfig>((resolve, reject) => {
        if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
          /**
           * Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
           */
          JSONP(`${SdkEnvironment.getOneSignalApiUrl().toString()}/sync/${appId.value}/web`, null, (err, data) => {
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
          resolve(OneSignalApi.get(`sync/${appId.value}/web`, null));
        }
      });
      const config = new AppConfig();
      config.appId = appId;
      if (serverConfig.features) {
        if (serverConfig.features.cookie_sync && serverConfig.features.cookie_sync.enable) {
          config.cookieSyncEnabled = true;
        }
      }
      if (serverConfig.config) {
        if (serverConfig.config.http_use_onesignal_com) {
          config.httpUseOneSignalCom = true;
        }
        if (serverConfig.config.safari_web_id) {
          config.safariWebId = serverConfig.config.safari_web_id
        }
        if (serverConfig.config.subdomain) {
          config.subdomain = serverConfig.config.subdomain
        }
        if (serverConfig.config.vapid_public_key) {
          config.vapidPublicKey = serverConfig.config.vapid_public_key;
        }
        if (serverConfig.config.onesignal_vapid_public_key) {
          config.onesignalVapidPublicKey = serverConfig.config.onesignal_vapid_public_key;
        }
      }
      return config;
    } catch (e) {
      throw e;
    }
  }

  static async createUser(pushRegistration: PushRegistration): Promise<Uuid> {
    const response = await OneSignalApi.post(`players`, pushRegistration.serialize());
    if (response && response.success) {
      return new Uuid(response.id);
    } else {
      return null;
    }
  }

  static async updateUserSession(userId: Uuid, pushRegistration: PushRegistration): Promise<Uuid> {
    try {
      const response = await OneSignalApi.post(`players/${userId.value}/on_session`, pushRegistration.serialize());
      if (response.id) {
        // A new user ID can be returned
        return new Uuid(response.id);
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
