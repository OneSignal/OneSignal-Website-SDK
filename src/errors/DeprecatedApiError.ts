import OneSignalError from './OneSignalError';
import { ApiUsageMetricEvent, ApiUsageMetricKind } from '../managers/MetricsManager';

export enum DeprecatedApiReason {
  HttpPermissionRequest,
  SyncHashedEmail,
}

export class DeprecatedApiError extends OneSignalError {
  constructor(reason: DeprecatedApiReason) {
    switch (reason) {
      case DeprecatedApiReason.HttpPermissionRequest:
        super('The HTTP permission request has been deprecated. Please remove any custom popups from your code.');
        this.reportUsage(ApiUsageMetricKind.HttpPermissionRequest);
        break;
      case DeprecatedApiReason.SyncHashedEmail:
        super('API syncHashedEmail() has been deprecated and will be removed in a future SDK release.' +
          ' Please remove any usages from your code.');
        this.reportUsage(ApiUsageMetricKind.SyncHashedEmail);
        break;
    }

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, DeprecatedApiError.prototype);
  }

  reportUsage(apiKind: ApiUsageMetricKind) {
    if (typeof OneSignal !== 'undefined' && OneSignal.context && OneSignal.context.metricsManager) {
      OneSignal.context.metricsManager.reportEvent(new ApiUsageMetricEvent(apiKind));
    }
  }
}
