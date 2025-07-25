import { SdkInitError, SdkInitErrorKind } from 'src/shared/errors/SdkInitError';
import { type AppConfig } from 'src/shared/models/AppConfig';
import { IS_SERVICE_WORKER } from 'src/shared/utils/EnvVariables';

// The os.tc domain feature is no longer supported in v16, so throw if the
// OneSignal app is still configured this way after they migrated from v15.
export function checkUnsupportedSubdomain(appConfig: AppConfig): void {
  const isHttp = !self.isSecureContext;
  const unsupportedEnv = appConfig.hasUnsupportedSubdomain || isHttp;

  if (unsupportedEnv) {
    if (isHttp) {
      throw new Error(
        'OneSignalSDK: HTTP sites are no longer supported starting with version 16 (User Model), your public site must start with https://.',
      );
    } else {
      throw new Error(
        'OneSignalSDK: The "My site is not fully HTTPS" option is no longer supported starting with version 16 (User Model) of the OneSignal SDK.',
      );
    }
  }
}

export function checkRestrictedOrigin(appConfig: AppConfig) {
  if (!appConfig.restrictedOriginEnabled) return;

  if (IS_SERVICE_WORKER) return;

  if (!doesCurrentOriginMatchConfigOrigin(appConfig.origin)) {
    throw new SdkInitError(SdkInitErrorKind.WrongSiteUrl, {
      siteUrl: appConfig.origin,
    });
  }
}

function doesCurrentOriginMatchConfigOrigin(configOrigin: string): boolean {
  try {
    return location.origin === new URL(configOrigin).origin;
  } catch (e) {
    return false;
  }
}
