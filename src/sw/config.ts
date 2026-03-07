import { SESSION_DEFAULTS } from 'src/shared/config/constants';
import { InvalidAppIdError } from 'src/shared/errors/common';
import { isValidUuid } from 'src/shared/helpers/validators';
import { checkUnsupportedSubdomain } from 'src/shared/config/domain';
import type { AppConfig, ServerAppConfig } from 'src/shared/config/types';

/**
 * Lightweight alternative to getServerAppConfig for the service worker.
 * Builds a minimal AppConfig directly from the server response, bypassing
 * the full integration/prompt/version pipeline that only the page needs.
 */
export async function getServerAppConfigSW(
  appId: string,
  downloadConfig: (appId: string) => Promise<ServerAppConfig>,
): Promise<AppConfig> {
  try {
    if (!appId || !isValidUuid(appId)) throw InvalidAppIdError;

    const serverConfig = await downloadConfig(appId);

    const kind = serverConfig.config.integration?.kind ?? 'custom';
    const hasUnsupportedSubdomain =
      kind === 'custom' || kind === 'wordpress'
        ? false
        : serverConfig.config.siteInfo.proxyOriginEnabled;

    const appConfig: AppConfig = {
      appId: serverConfig.app_id,
      hasUnsupportedSubdomain,
      siteName: serverConfig.config.siteInfo.name,
      origin: serverConfig.config.origin,
      safariWebId: serverConfig.config.safari_web_id,
      vapidPublicKey: serverConfig.config.vapid_public_key,
      onesignalVapidPublicKey: serverConfig.config.onesignal_vapid_public_key,
      enableOnSession:
        serverConfig.features.enable_on_session ??
        SESSION_DEFAULTS.enableOnSession,
      sessionThreshold:
        serverConfig.features.session_threshold ??
        SESSION_DEFAULTS.sessionThreshold,
      enableSessionDuration:
        serverConfig.features.web_on_focus_enabled ??
        SESSION_DEFAULTS.enableSessionDuration,
      userConfig: {
        appId: serverConfig.app_id,
        outcomes: {
          direct: serverConfig.config.outcomes.direct,
          indirect: {
            enabled: serverConfig.config.outcomes.indirect.enabled,
            influencedTimePeriodMin:
              serverConfig.config.outcomes.indirect.notification_attribution
                .minutes_since_displayed,
            influencedNotificationsLimit:
              serverConfig.config.outcomes.indirect.notification_attribution
                .limit,
          },
          unattributed: serverConfig.config.outcomes.unattributed,
        },
      },
    };

    checkUnsupportedSubdomain(appConfig);
    return appConfig;
  } catch (e) {
    if (e instanceof Object && 'code' in e) {
      if (e.code === 1) throw InvalidAppIdError;
      else if (e.code === 2) throw new Error('App not configured for web push');
    }
    throw e;
  }
}
