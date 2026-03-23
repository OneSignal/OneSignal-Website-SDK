import JSONP from 'jsonp';

import type { ServerAppConfig } from '../config/types';
import { getOneSignalApiUrl } from '../environment/detect';
import { IS_SERVICE_WORKER } from '../utils/env';
import { downloadSWServerAppConfig } from './sw';

export function jsonpLib(url: string, fn: (err: Error | null, data: ServerAppConfig) => void) {
  // Explicit opts prevent prototype pollution
  JSONP(url, { prefix: '__jp', name: undefined, param: 'callback', timeout: 60000 }, fn);
}

export async function downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
  if (!IS_SERVICE_WORKER) {
    return await new Promise<ServerAppConfig>((resolve, reject) => {
      // Due to CloudFlare's algorithms, the .js extension is required for proper caching. Don't remove it!
      jsonpLib(
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
    return await downloadSWServerAppConfig(appId);
  }
}
