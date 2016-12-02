import OneSignalError from "./OneSignalError";
import { PermissionPromptType } from "../models/PermissionPromptType";


export enum InvalidStateReason {
  MissingAppId,
  RedundantPermissionMessage,
  PushPermissionAlreadyGranted
}

export class InvalidStateError extends OneSignalError {
  reason: string;

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
        super(`Another permission message ${extraInfo} is being displayed instead.`);
        break;
      case InvalidStateReason.PushPermissionAlreadyGranted:
        super(`Push permission has already been granted.`);
        break;
    }
    this.reason = InvalidStateReason[reason];
  }
}