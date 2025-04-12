import OneSignalError from './OneSignalError';

// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/main/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/exceptions/BackendException.kt
/**
 * Raised when a backend service request has failed.
 */
export class BackendError extends OneSignalError {
  public readonly statusCode: number;
  public readonly response?: string;
  public readonly retryAfterSeconds?: number;

  constructor(
    statusCode: number,
    response?: string,
    retryAfterSeconds?: number,
  ) {
    super(`Backend request failed with status ${statusCode}`);
    this.name = 'BackendError';
    this.statusCode = statusCode;
    this.response = response;
    this.retryAfterSeconds = retryAfterSeconds;

    // Required for extending built-in classes in ES5+
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
