import { API_URL } from './vars.js'
import log from 'loglevel';
import { contains, trimUndefined } from './utils.js'

export function apiCall(action, method, data) {
  let headers = new Headers();
  headers.append('Content-Type', 'application/json;charset=UTF-8');

  let contents = {
    method: method || 'NO_METHOD_SPECIFIED',
    headers: headers,
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
      else
        return Promise.reject(json);
    });
}

export function sendNotification(appId, playerIds, titles, contents, url, data) {
  var params = {
    app_id: appId,
    contents: contents,
    include_player_ids: playerIds,
    isAnyWeb: true,
    data: data
  };
  trimUndefined(params);
  if (titles) {
    params.headings = titles;
  }
  if (url) {
    params.url = url;
  }
  return apiCall('notifications', 'POST', params)
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