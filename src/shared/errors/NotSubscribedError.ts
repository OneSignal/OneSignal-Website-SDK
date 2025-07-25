import OneSignalError from './OneSignalError';

export const NotSubscribedReason = {
  Unknown: 0,
  NoDeviceId: 1,
  NoEmailSet: 2,
  NoSMSSet: 3,
  OptedOut: 4,
} as const;

export type NotSubscribedReasonValue =
  (typeof NotSubscribedReason)[keyof typeof NotSubscribedReason];

const reverseNotSubscribedReason = Object.fromEntries(
  Object.entries(NotSubscribedReason).map(([key, value]) => [value, key]),
);

export class NotSubscribedError extends OneSignalError {
  reason: string;

  constructor(reason: NotSubscribedReasonValue) {
    let errorMessage;
    switch (reason) {
      case NotSubscribedReason.Unknown || NotSubscribedReason.NoDeviceId:
        errorMessage =
          'This operation can only be performed after the user is subscribed.';
        break;
      case NotSubscribedReason.NoEmailSet:
        errorMessage = 'No email is currently set.';
        break;
      case NotSubscribedReason.NoSMSSet:
        errorMessage = 'No sms is currently set.';
        break;
      case NotSubscribedReason.OptedOut:
        errorMessage =
          `The user has manually opted out of receiving of notifications. ` +
          `This operation can only be performed after the user is fully resubscribed.`;
        break;
    }
    super(errorMessage);
    this.reason = reverseNotSubscribedReason[reason];

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, NotSubscribedError.prototype);
  }
}
