import { downloadServerAppConfig } from 'src/shared/api/page';
import { InvalidAppIdError } from 'src/shared/errors/common';
import { isValidUuid } from 'src/shared/helpers/validators';
import { SESSION_DEFAULTS } from 'src/shared/config/constants';
import { checkUnsupportedSubdomain } from 'src/shared/config/domain';
import {
  getConfigIntegrationKind,
  getUserConfigForConfigIntegrationKind,
  hasUnsupportedSubdomainForConfigIntegrationKind,
} from 'src/shared/config/integration';
import {
  type AppConfig,
  type AppUserConfig,
  type ServerAppConfig,
} from 'src/shared/config/types';
import { upgradeConfigToVersionTwo } from 'src/shared/config/version';

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

/** Throws if the current page origin doesn't match the configured origin. */
function checkRestrictedOrigin(appConfig: AppConfig) {
  if (!appConfig.restrictedOriginEnabled) return;

  let originsMatch = false;
  try {
    originsMatch = location.origin === new URL(appConfig.origin).origin;
  } catch {
    // invalid origin URL — treat as mismatch
  }

  if (!originsMatch) {
    throw new Error(`Can only be used on: ${new URL(appConfig.origin).origin}`);
  }
}

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
    enableOnSession:
      serverConfig.features.enable_on_session ??
      SESSION_DEFAULTS.enableOnSession,
    sessionThreshold:
      serverConfig.features.session_threshold ??
      SESSION_DEFAULTS.sessionThreshold,
    enableSessionDuration:
      serverConfig.features.web_on_focus_enabled ??
      SESSION_DEFAULTS.enableSessionDuration,
  };
}
