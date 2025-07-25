import OneSignalError from './OneSignalError';

export const OneSignalApiErrorKind = {
  MissingAppId: 0,
  RetryLimitReached: 1,
} as const;

export type OneSignalApiErrorKindValue =
  (typeof OneSignalApiErrorKind)[keyof typeof OneSignalApiErrorKind];

export class OneSignalApiError extends OneSignalError {
  reason!: string;

  constructor(reason: OneSignalApiErrorKindValue) {
    let errorMessage;
    switch (reason) {
      case OneSignalApiErrorKind.MissingAppId:
        errorMessage = 'The API call is missing an app ID.';
        break;
      case OneSignalApiErrorKind.RetryLimitReached:
        errorMessage = 'The API call has reached the retry limit.';
        break;
    }

    super(errorMessage);
    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, OneSignalApiError.prototype);
  }
}
