import { PermissionPromptType } from '../models/PermissionPromptType';
import OneSignalError from './OneSignalError';

export const InvalidStateReason = {
  MissingAppId: 0,
  RedundantPermissionMessage: 1,
  PushPermissionAlreadyGranted: 2,
  UnsupportedEnvironment: 3,
  MissingDomElement: 4,
  ServiceWorkerNotActivated: 5,
} as const;

export type InvalidStateReasonValue =
  (typeof InvalidStateReason)[keyof typeof InvalidStateReason];

const reverseInvalidStateReason = Object.fromEntries(
  Object.entries(InvalidStateReason).map(([key, value]) => [value, key]),
);

export class InvalidStateError extends OneSignalError {
  description: string;
  reason: InvalidStateReasonValue;

  constructor(
    reason: InvalidStateReasonValue,
    extra?: {
      permissionPromptType: keyof typeof PermissionPromptType;
    },
  ) {
    let errorMessage;
    switch (reason) {
      case InvalidStateReason.MissingAppId:
        errorMessage = `Missing required app ID.`;
        break;
      case InvalidStateReason.RedundantPermissionMessage: {
        let extraInfo = '';
        if (extra && extra.permissionPromptType)
          extraInfo = `(${PermissionPromptType[extra.permissionPromptType]})`;
        errorMessage = `Another permission message ${extraInfo} is being displayed.`;
        break;
      }
      case InvalidStateReason.PushPermissionAlreadyGranted:
        errorMessage = `Push permission has already been granted.`;
        break;
      case InvalidStateReason.UnsupportedEnvironment:
        errorMessage = `The current environment does not support this operation.`;
        break;
      case InvalidStateReason.ServiceWorkerNotActivated:
        errorMessage = `The service worker must be activated first.`;
        break;
    }

    super(errorMessage);
    this.description = reverseInvalidStateReason[reason];
    this.reason = reason;

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, InvalidStateError.prototype);
  }
}
