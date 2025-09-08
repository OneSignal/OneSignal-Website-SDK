import { downloadServerAppConfig } from '../api/page';
import { InvalidAppIdError } from '../errors/common';
import { getValueOrDefault } from '../helpers/general';
import { isValidUuid } from '../helpers/validators';
import { checkRestrictedOrigin, checkUnsupportedSubdomain } from './domain';
import {
  getConfigIntegrationKind,
  getUserConfigForConfigIntegrationKind,
  hasUnsupportedSubdomainForConfigIntegrationKind,
} from './integration';
import {
  type AppConfig,
  type AppUserConfig,
  type ServerAppConfig,
} from './types';
import { upgradeConfigToVersionTwo } from './version';

// local constants
const SERVER_CONFIG_DEFAULTS_SESSION = {
  reportingThreshold: 30,
  enableOnSessionForUnsubcribed: false,
  enableOnFocus: true,
};

// helpers
export async function getAppConfig(
  userConfig: AppUserConfig,
): Promise<AppConfig> {
  return getServerAppConfig(userConfig, downloadServerAppConfig);
}

export async function getServerAppConfig(
  userConfig: AppUserConfig,
  downloadConfig: (appId: string) => Promise<ServerAppConfig>,
): Promise<AppConfig> {
  try {
    if (!userConfig || !userConfig.appId || !isValidUuid(userConfig.appId))
      throw InvalidAppIdError;

    const serverConfig = await downloadConfig(userConfig.appId);
    upgradeConfigToVersionTwo(userConfig);
    const appConfig = getMergedConfig(userConfig, serverConfig);

    checkUnsupportedSubdomain(appConfig);
    checkRestrictedOrigin(appConfig);
    return appConfig;
  } catch (e) {
    if (e instanceof Object && 'code' in e) {
      if (e.code === 1) throw InvalidAppIdError;
      else if (e.code === 2) throw new Error('App not configured for web push');
    }
    throw e;
  }
}

/**
 * Merges configuration downloaded from the OneSignal dashboard with user-provided JavaScript configuration to produce
 * a final web SDK-specific configuration.
 */
export function getMergedConfig(
  userConfig: AppUserConfig,
  serverConfig: ServerAppConfig,
): AppConfig {
  const configIntegrationKind = getConfigIntegrationKind(serverConfig);

  const hasUnsupportedSubdomain =
    hasUnsupportedSubdomainForConfigIntegrationKind(
      configIntegrationKind,
      userConfig,
      serverConfig,
    );

  const mergedUserConfig = getUserConfigForConfigIntegrationKind(
    configIntegrationKind,
    userConfig,
    serverConfig,
  );

  return {
    appId: serverConfig.app_id,
    hasUnsupportedSubdomain,
    siteName: serverConfig.config.siteInfo.name,
    origin: serverConfig.config.origin,
    restrictedOriginEnabled:
      serverConfig.features.restrict_origin &&
      serverConfig.features.restrict_origin.enable,
    safariWebId: serverConfig.config.safari_web_id,
    vapidPublicKey: serverConfig.config.vapid_public_key,
    onesignalVapidPublicKey: serverConfig.config.onesignal_vapid_public_key,
    userConfig: mergedUserConfig,
    enableOnSession: getValueOrDefault(
      serverConfig.features.enable_on_session,
      SERVER_CONFIG_DEFAULTS_SESSION.enableOnSessionForUnsubcribed,
    ),
    sessionThreshold: getValueOrDefault(
      serverConfig.features.session_threshold,
      SERVER_CONFIG_DEFAULTS_SESSION.reportingThreshold,
    ),
    enableSessionDuration: getValueOrDefault(
      serverConfig.features.web_on_focus_enabled,
      SERVER_CONFIG_DEFAULTS_SESSION.enableOnFocus,
    ),
  };
}
