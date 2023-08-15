import OneSignalApi from "../../shared/api/OneSignalApi";
import { ConfigHelper } from "../../shared/helpers/ConfigHelper";
import { AppUserConfig, AppConfig, ServerAppConfig } from "../../shared/models/AppConfig";

/**
 * Handles downloading settings from OneSignal and performing any other initialization-related tasks.
 */
export default class ConfigManager {
  /**
   * Downloads configuration from the OneSignal dashboard, merges it with user-supplied configuration from JavaScript
   * code, and returns Web SDK-specific configuration.
   */
  public async getAppConfig(userConfig: AppUserConfig): Promise<AppConfig> {
    return await ConfigHelper.getAppConfig(userConfig, OneSignalApi.downloadServerAppConfig);
  }

  /**
   * Merges configuration downloaded from the OneSignal dashboard with user-provided JavaScript configuration to produce
   * a final web SDK-specific configuration.
   */
  public getMergedConfig(userConfig: AppUserConfig, serverConfig: ServerAppConfig): AppConfig {
    return ConfigHelper.getMergedConfig(userConfig, serverConfig);
  }
}
