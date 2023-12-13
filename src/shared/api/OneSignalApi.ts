import JSONP from 'jsonp';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import OneSignalApiSW from './OneSignalApiSW';
import OneSignalApiShared from './OneSignalApiShared';
import { ServerAppConfig } from '../models/AppConfig';

export default class OneSignalApi {
  static sendNotification(
    appId: string,
    playerIds: Array<string>,
    titles,
    contents,
    url,
    icon,
    data,
    buttons,
  ) {
    return OneSignalApiShared.sendNotification(
      appId,
      playerIds,
      titles,
      contents,
      url,
      icon,
      data,
      buttons,
    );
  }

  static jsonpLib(
    url: string,
    fn: (err: Error, data: ServerAppConfig) => void,
  ) {
    JSONP(url, null, fn);
  }

  static async downloadServerAppConfig(
    appId: string,
  ): Promise<ServerAppConfig> {
    if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.Host) {
      return await new Promise<ServerAppConfig>((resolve, reject) => {
        // Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
        OneSignalApi.jsonpLib(
          `${SdkEnvironment.getOneSignalApiUrl().toString()}/sync/${appId}/web`,
          (err: Error, data: ServerAppConfig) => {
            if (err) reject(err);
            else {
              if (data.success) resolve(data);
              // For JSONP, we return a 200 even for errors, there's a success: false param
              else reject(data);
            }
          },
        );
      });
    } else {
      return await OneSignalApiSW.downloadServerAppConfig(appId);
    }
  }
}
