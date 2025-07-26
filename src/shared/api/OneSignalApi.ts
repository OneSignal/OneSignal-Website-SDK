import JSONP from 'jsonp';
import type { ServerAppConfig } from '../config';
import { getOneSignalApiUrl } from '../helpers/environment';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import OneSignalApiSW from './OneSignalApiSW';

export default class OneSignalApi {
  static jsonpLib(
    url: string,
    fn: (err: Error | null, data: ServerAppConfig) => void,
  ) {
    JSONP(url, undefined, fn);
  }

  static async downloadServerAppConfig(
    appId: string,
  ): Promise<ServerAppConfig> {
    if (!IS_SERVICE_WORKER) {
      return await new Promise<ServerAppConfig>((resolve, reject) => {
        // Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
        OneSignalApi.jsonpLib(
          `${getOneSignalApiUrl().toString()}sync/${appId}/web`,
          (err: Error | null, data: ServerAppConfig) => {
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
