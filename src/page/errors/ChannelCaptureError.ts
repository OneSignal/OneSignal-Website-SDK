import OneSignalError from '../../shared/errors/OneSignalError';

export const InvalidChannelInputField = {
  InvalidSms: 0,
  InvalidEmail: 1,
  InvalidEmailAndSms: 2,
} as const;

const reverseInvalidChannelInputField = Object.fromEntries(
  Object.entries(InvalidChannelInputField).map(([key, value]) => [value, key]),
);

export type InvalidChannelInputFieldValue =
  (typeof InvalidChannelInputField)[keyof typeof InvalidChannelInputField];

export class ChannelCaptureError extends OneSignalError {
  description: string;
  reason: InvalidChannelInputFieldValue;

  constructor(reason: InvalidChannelInputFieldValue) {
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
    this.description = reverseInvalidChannelInputField[reason];
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
