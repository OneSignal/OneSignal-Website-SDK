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
  }
}
