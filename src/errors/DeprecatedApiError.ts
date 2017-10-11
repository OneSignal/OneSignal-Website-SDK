import OneSignalError from "./OneSignalError";

export enum DeprecatedApiReason {
  HttpPermissionRequest,
}

export class DeprecatedApiError extends OneSignalError {

  constructor(reason: DeprecatedApiReason) {
    switch (reason) {
      case DeprecatedApiReason.HttpPermissionRequest:
        super('The HTTP permission request has been deprecated. Please remove any custom popups from your code.');
        break;
    }
  }
}
