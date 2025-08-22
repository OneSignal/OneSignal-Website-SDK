import { IS_SERVICE_WORKER } from 'src/shared/utils/EnvVariables';
import { type AppConfig } from './types';

// The os.tc domain feature is no longer supported in v16, so throw if the
// OneSignal app is still configured this way after they migrated from v15.
export function checkUnsupportedSubdomain(appConfig: AppConfig): void {
  const isHttp = !self.isSecureContext;
  const unsupportedEnv = appConfig.hasUnsupportedSubdomain || isHttp;

  if (unsupportedEnv) {
    if (isHttp) {
      throw new Error('HTTP sites are no longer supported; use HTTPS');
    } else {
      throw new Error(
        '"My site is not fully HTTPS" option is no longer supported',
      );
    }
  }
}

export function checkRestrictedOrigin(appConfig: AppConfig) {
  if (!appConfig.restrictedOriginEnabled) return;

  if (IS_SERVICE_WORKER) return;

  if (!doesCurrentOriginMatchConfigOrigin(appConfig.origin)) {
    throw new Error(`Can only be used on:${new URL(appConfig.origin).origin}`);
  }
}

function doesCurrentOriginMatchConfigOrigin(configOrigin: string): boolean {
  try {
    return location.origin === new URL(configOrigin).origin;
  } catch (e) {
    return false;
  }
}
