import OneSignalError from './OneSignalError';

export const PushPermissionNotGrantedErrorReason = {
  Blocked: 0,
  Dismissed: 1,
  Default: 2,
} as const;

export type PushPermissionNotGrantedErrorReasonValue =
  (typeof PushPermissionNotGrantedErrorReason)[keyof typeof PushPermissionNotGrantedErrorReason];

export default class PushPermissionNotGrantedError extends OneSignalError {
  reason!: PushPermissionNotGrantedErrorReasonValue;

  constructor(reason: PushPermissionNotGrantedErrorReasonValue) {
    let errorMessage;
    switch (reason) {
      case PushPermissionNotGrantedErrorReason.Dismissed:
        errorMessage = 'The user dismissed the permission prompt.';
        break;
      case PushPermissionNotGrantedErrorReason.Blocked:
        errorMessage = 'Notification permissions are blocked.';
        break;
      case PushPermissionNotGrantedErrorReason.Default:
        errorMessage = 'Notification permissions have not been granted yet.';
        break;
    }
    super(errorMessage);

    this.reason = reason;

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, PushPermissionNotGrantedError.prototype);
  }
}
