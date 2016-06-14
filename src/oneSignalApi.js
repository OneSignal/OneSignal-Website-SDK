import { API_URL } from './vars.js'
import log from 'loglevel';
import { contains, trimUndefined, wipeIndexedDb, unsubscribeFromPush, wait } from './utils.js'


export default class OneSignalApi {

  static get(action, data, headers) {
    return OneSignalApi.call('GET', action, data, headers);
  }

  static post(action, data, headers) {
    return OneSignalApi.call('POST', action, data, headers);
  }

  static put(action, data, headers) {
    return OneSignalApi.call('PUT', action, data, headers);
  }

  static delete(action, data, headers) {
    return OneSignalApi.call('DELETE', action, data, headers);
  }

  static call(method, action, data, headers) {
    let callHeaders = new Headers();
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
      contents.body = JSON.stringify(data);

    var status;
    return fetch(API_URL + action, contents)
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
              if (OneSignal.isUsingSubscriptionWorkaround()) {
                return wipeIndexedDb()
                    .then(() => Promise.reject(json));
              } else {
                return wipeIndexedDb()
                    .then(() => unsubscribeFromPush())
                    .then(() => Promise.reject(json));
              }
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

  static sendNotification(appId, playerIds, titles, contents, url, icon, data) {
    var params = {
      app_id: appId,
      contents: contents,
      include_player_ids: playerIds,
      isAnyWeb: true,
      data: data
    };
    if (titles) {
      params.headings = titles;
    }
    if (url) {
      params.url = url;
    }
    if (icon) {
      params.chrome_web_icon = icon;
      params.firefox_icon = icon;
    }
    trimUndefined(params);
    return OneSignalApi.post('notifications', params)
        .catch(e => {
          if (e.warnings) {
            for (let warning of e.warnings) {
              if (contains(warning, 'Received ERROR 401 (Unauthorized, check your App auth_key.)')) {
                log.error("OneSignal: Your Google Server API Key is either invalid, is missing the required 'Google Cloud Messaging for Android' API, or is only accepting requests from certain IPs. (See: https://documentation.onesignal.com/docs/website-push-common-problems#received-error-401-unauthorized-check-your-app-aut)")
              }
            }
          }
          log.error('Failed to send notification:', e);
        });
  }
}