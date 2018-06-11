import OneSignalError from "./OneSignalError";
import { PermissionPromptType } from "../models/PermissionPromptType";


export enum InvalidStateReason {
  MissingAppId,
  RedundantPermissionMessage,
  PushPermissionAlreadyGranted,
  UnsupportedEnvironment,
  MissingDomElement,
  ServiceWorkerNotActivated,
  NoProxyFrame,
}

export class InvalidStateError extends OneSignalError {
  description: string;
  reason: InvalidStateReason;

  constructor(reason: InvalidStateReason, extra?: {
    permissionPromptType: PermissionPromptType
  }) {
    switch (reason) {
      case InvalidStateReason.MissingAppId:
        super(`Missing required app ID.`);
        break;
      case InvalidStateReason.RedundantPermissionMessage:
        let extraInfo = '';
        if (extra && extra.permissionPromptType)
          extraInfo = `(${PermissionPromptType[extra.permissionPromptType]})`;
        super(`Another permission message ${extraInfo} is being displayed.`);
        break;
      case InvalidStateReason.PushPermissionAlreadyGranted:
        super(`Push permission has already been granted.`);
        break;
      case InvalidStateReason.UnsupportedEnvironment:
        super(`The current environment does not support this operation.`);
        break;
      case InvalidStateReason.ServiceWorkerNotActivated:
        super(`The service worker must be activated first.`);
        break;
      case InvalidStateReason.NoProxyFrame:
        super(`No proxy frame.`);
        break;
    }
    this.description = InvalidStateReason[reason];
    this.reason = reason;

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, InvalidStateError.prototype);
  }
}
