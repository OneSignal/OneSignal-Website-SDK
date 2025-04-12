export const ResponseStatusType = {
  INVALID: 'INVALID',
  RETRYABLE: 'RETRYABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  MISSING: 'MISSING',
  CONFLICT: 'CONFLICT',
} as const;

type ResponseStatusValue =
  (typeof ResponseStatusType)[keyof typeof ResponseStatusType];

export const MAX_NETWORK_REQUEST_ATTEMPT_COUNT = 3;

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
