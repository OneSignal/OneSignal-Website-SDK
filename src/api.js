import { API_URL } from './vars.js'
import log from 'loglevel';

export function apiCall(action, method, data) {
  let headers = new Headers();
  headers.append('Content-Type', 'application/json;charset=UTF-8');

  let contents = {
    method: method || 'NO_METHOD_SPECIFIED',
    headers: headers,
    cache: 'no-cache',
    body: JSON.stringify(data)
  };

  return new Promise((resolve, reject) => {
    fetch(API_URL + action, contents)
      .then(function status(response) {
        if (response.status >= 200 && response.status < 300)
          resolve(response.json());
        else
          reject(new Error(response.statusText));
      })
      .catch(function (e) {
        reject(e);
      });
  });
}

export function sendNotification(appId, playerIds, titles, contents) {
  var params = {
    'app_id': appId,
    'headings': titles,
    'contents': contents,
    'include_player_ids': playerIds,
    'isAnyWeb': true,
    'url': 'javascript:void(0);'
  };
  return apiCall('notifications', 'POST', params);
}