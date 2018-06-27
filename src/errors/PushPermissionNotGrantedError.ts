import OneSignalError from "./OneSignalError";


export enum PushPermissionNotGrantedErrorReason {
  Blocked,
  Dismissed,
  Default
}

export default class PushPermissionNotGrantedError extends OneSignalError {
  reason: PushPermissionNotGrantedErrorReason;

  constructor(reason: PushPermissionNotGrantedErrorReason) {
    switch (reason) {
      case PushPermissionNotGrantedErrorReason.Dismissed:
        super('The user dismissed the permission prompt.');
        break;
      case PushPermissionNotGrantedErrorReason.Blocked:
        super('Notification permissions are blocked.');
        break;
      case PushPermissionNotGrantedErrorReason.Default:
        super('Notification permissions have not been granted yet.');
        break;
    }

    this.reason = reason;

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, PushPermissionNotGrantedError.prototype);
  }
}
