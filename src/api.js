import { API_URL } from './vars.js'
import log from 'loglevel';

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

  return new Promise((resolve, reject) => {
    fetch(API_URL + action, contents)
      .then(function status(response) {
        if (response.status >= 200 && response.status < 300)
          return response.json();
        else
          reject(new Error(response.statusText));
      })
      .then(jsonResponse => {
        resolve(jsonResponse);
      })
      .catch(function (e) {
        reject(e);
      });
  });
}

export function sendNotification(appId, playerIds, titles, contents, url) {
  var params = {
    app_id: appId,
    contents: contents,
    include_player_ids: playerIds,
    isAnyWeb: true
  };
  if (titles) {
    params.headings = titles;
  }
  if (url) {
    params.url = url;
  }
  return apiCall('notifications', 'POST', params);
}