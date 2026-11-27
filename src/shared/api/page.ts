import type { ServerAppConfig } from '../config/types';
import { enforceAppId } from '../context/helpers';
import * as OneSignalApiBase from './base';

export async function downloadServerAppConfig(appId: string): Promise<ServerAppConfig> {
  enforceAppId(appId);
  const response = await OneSignalApiBase.get<ServerAppConfig>(['sync', appId, 'web'], null);
  const data = response?.result;
  // The endpoint returns 200 for app errors, with success: false and an error code
  if (!data?.success) throw data;
  return data;
}
