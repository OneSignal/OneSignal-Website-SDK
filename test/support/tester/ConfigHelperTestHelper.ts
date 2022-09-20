import { ConfigHelper } from "../../../src/helpers/ConfigHelper";
import { AppConfig, ConfigIntegrationKind, ServerAppConfig } from "../../../src/models/AppConfig";
import { TestEnvironment } from "../sdk/TestEnvironment";

/**
 * Test Helper Function.
 * Used to execute `getAppConfig` codepath which includes key functions like:
 *  1) `getMergedConfig`
 *  2) `convertConfigToVersion2` - the resulting prompt options config should be config schema v2
 * @param fakeUserConfig
 */
export async function getFinalAppConfig(fakeUserConfig: any):
    Promise<AppConfig>{
        const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
        fakeUserConfig.appId = fakeServerConfig.app_id;
        const getFakeServerConfig = (appId: string) => new Promise<ServerAppConfig>(resolve => {
            resolve(fakeServerConfig);
        });

        return await ConfigHelper.getAppConfig(fakeUserConfig, getFakeServerConfig);
}