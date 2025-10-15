import { getServerAppConfig } from 'src/shared/config/app';
import { ConfigIntegrationKind } from 'src/shared/config/constants';
import type { AppConfig, ServerAppConfig } from 'src/shared/config/types';
import TestContext from '../environment/TestContext';

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
    ConfigIntegrationKind._Custom,
  );
  fakeUserConfig.appId = fakeServerConfig.app_id;
  const getFakeServerConfig = () =>
    new Promise<ServerAppConfig>((resolve) => {
      resolve(fakeServerConfig);
    });

  return await getServerAppConfig(fakeUserConfig, getFakeServerConfig);
}
