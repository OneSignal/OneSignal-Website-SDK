import { http, HttpResponse } from 'msw';
import { ConfigIntegrationKind } from '../../../src/shared/models/AppConfig';
import TestContext from '../environment/TestContext';
const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

import { ConfigHelper } from '../../../src/shared/helpers/ConfigHelper';
import {
  AppConfig,
  ServerAppConfig,
} from '../../../src/shared/models/AppConfig';

/**
 * Test Helper Function.
 * Used to execute `getAppConfig` codepath which includes key functions like:
 *  1) `getMergedConfig`
 *  2) `convertConfigToVersion2` - the resulting prompt options config should be config schema v2
 * @param fakeUserConfig
 */
export async function getFinalAppConfig(
  fakeUserConfig: any,
): Promise<AppConfig> {
  const fakeServerConfig = TestContext.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
  );
  fakeUserConfig.appId = fakeServerConfig.app_id;
  const getFakeServerConfig = (appId: string) =>
    new Promise<ServerAppConfig>((resolve) => {
      resolve(fakeServerConfig);
    });

  return await ConfigHelper.getAppConfig(fakeUserConfig, getFakeServerConfig);
}

export const mockServerConfig = () => {
  return http.get('**/sync/*/web', ({ request }) => {
    const url = new URL(request.url);
    const callbackParam = url.searchParams.get('callback');
    return new HttpResponse(
      `${callbackParam}(${JSON.stringify(serverConfig)})`,
      {
        headers: {
          'Content-Type': 'application/javascript',
        },
      },
    );
  });
};
