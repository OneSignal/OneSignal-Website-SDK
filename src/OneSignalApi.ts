import * as log from "loglevel";
import {contains, trimUndefined} from "./utils";
import {Uuid} from "./models/Uuid";
import * as objectAssign from "object-assign";
import Environment from "./Environment";
import { AppConfig, ServerAppConfig } from './models/AppConfig';
import SdkEnvironment from './managers/SdkEnvironment';
import * as JSONP from 'jsonp';
import { SdkInitErrorKind, SdkInitError } from './errors/SdkInitError';


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
    return fetch(SdkEnvironment.getOneSignalApiUrl().toString() + action, contents)
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
    return OneSignalApi.put(`players/${playerId}`, objectAssign({app_id: appId}, options));
  }

  static sendNotification(appId, playerIds, titles, contents, url, icon, data, buttons) {
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

  static async getAppConfig(appId: Uuid): Promise<AppConfig> {
    try {
      const serverConfig = await new Promise<ServerAppConfig>((resolve, reject) => {
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
      });
      const config = new AppConfig();
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
      }
      return config;
    } catch (e) {
      throw e;
    }
  }
}
