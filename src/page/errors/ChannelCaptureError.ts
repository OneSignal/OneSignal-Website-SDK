import OneSignalError from '../../shared/errors/OneSignalError';

export enum InvalidChannelInputField {
  InvalidSms,
  InvalidEmail,
  InvalidEmailAndSms,
}

export class ChannelCaptureError extends OneSignalError {
  description: string;
  reason: InvalidChannelInputField;

  constructor(reason: InvalidChannelInputField) {
    let errorMessage;
    switch (reason) {
      case InvalidChannelInputField.InvalidEmail:
        errorMessage = `Invalid email`;
        break;
      case InvalidChannelInputField.InvalidSms:
        errorMessage = `Invalid sms`;
        break;
      case InvalidChannelInputField.InvalidEmailAndSms:
        errorMessage = `Invalid email & sms`;
        break;
      default:
        break;
    }

    super(errorMessage);
    this.description = InvalidChannelInputField[reason];
    this.reason = reason;

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, ChannelCaptureError.prototype);
  }
}
