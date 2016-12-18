import OneSignalError from "./OneSignalError";
import { PermissionPromptType } from "../models/PermissionPromptType";


export enum InvalidStateReason {
  MissingAppId,
  RedundantPermissionMessage,
  PushPermissionAlreadyGranted,
  UnsupportedEnvironment,
  MissingDomElement
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
        if (extra.permissionPromptType)
          extraInfo = `(${PermissionPromptType[extra.permissionPromptType]})`;
        super(`Another permission message ${extraInfo} is being displayed.`);
        break;
      case InvalidStateReason.PushPermissionAlreadyGranted:
        super(`Push permission has already been granted.`);
        break;
      case InvalidStateReason.UnsupportedEnvironment:
        super(`The current environment does not support this operation.`);
        break;
      case InvalidStateReason.UnsupportedEnvironment:
        super(`A necessary DOM element does not exist on the page.`);
        break;
    }
    this.description = InvalidStateReason[reason];
    this.reason = reason;
  }
}