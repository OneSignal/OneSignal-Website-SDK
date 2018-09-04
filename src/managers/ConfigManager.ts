import { AppUserConfig, AppConfig, ServerAppConfig } from '../models/AppConfig';
import OneSignalApi from '../OneSignalApi';
import { ConfigHelper } from "../helpers/ConfigHelper";

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
    const configIntegrationKind = ConfigHelper.getConfigIntegrationKind(serverConfig);
    return {
      appId: serverConfig.app_id,
      subdomain: ConfigHelper.getSubdomainForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
      origin: serverConfig.config.origin,
      httpUseOneSignalCom: serverConfig.config.http_use_onesignal_com,
      cookieSyncEnabled: serverConfig.features.cookie_sync.enable,
      restrictedOriginEnabled: serverConfig.features.restrict_origin && serverConfig.features.restrict_origin.enable,
      metrics: {
        enable: serverConfig.features.metrics.enable,
        mixpanelReportingToken: serverConfig.features.metrics.mixpanel_reporting_token
      },
      safariWebId: serverConfig.config.safari_web_id,
      vapidPublicKey: serverConfig.config.vapid_public_key,
      onesignalVapidPublicKey: serverConfig.config.onesignal_vapid_public_key,
      emailAuthRequired: serverConfig.features.email && serverConfig.features.email.require_auth,
      userConfig: ConfigHelper.getUserConfigForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
    };
  }
}
