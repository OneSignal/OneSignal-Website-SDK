import {
  ConfigIntegrationKind,
  getServerAppConfig,
  type AppConfig,
  type ServerAppConfig,
} from 'src/shared/config';
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
    ConfigIntegrationKind.Custom,
  );
  fakeUserConfig.appId = fakeServerConfig.app_id;
  const getFakeServerConfig = () =>
    new Promise<ServerAppConfig>((resolve) => {
      resolve(fakeServerConfig);
    });

  return await getServerAppConfig(fakeUserConfig, getFakeServerConfig);
}
