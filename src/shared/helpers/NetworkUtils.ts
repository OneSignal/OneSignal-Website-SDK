// Implements logic similar to Android SDK's NetworkUtils
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/common/NetworkUtils.kt
export const ResponseStatusType = {
  INVALID: 'INVALID',
  RETRYABLE: 'RETRYABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  MISSING: 'MISSING',
  CONFLICT: 'CONFLICT',
} as const;

type ResponseStatusValue =
  (typeof ResponseStatusType)[keyof typeof ResponseStatusType];

/**
 * Determines the response status type based on HTTP status code.
 * @param statusCode - The HTTP status code.
 * @returns ResponseStatusType indicating how the system should handle the error.
 */
export function getResponseStatusType(statusCode: number): ResponseStatusValue {
  switch (statusCode) {
    case 400:
    case 402:
      return ResponseStatusType.INVALID;

    case 401:
    case 403:
      return ResponseStatusType.UNAUTHORIZED;

    case 404:
    case 410:
      return ResponseStatusType.MISSING;

    case 409:
      return ResponseStatusType.CONFLICT;

    case 429:
    default:
      return ResponseStatusType.RETRYABLE;
  }
}
