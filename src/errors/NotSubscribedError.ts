import OneSignalError from "./OneSignalError";


export enum NotSubscribedReason {
  Unknown,
  NoDeviceId,
  NoEmailSet,
  OptedOut
}

export class NotSubscribedError extends OneSignalError {
  reason: string;

  constructor(reason: NotSubscribedReason) {
    let errorMessage;
    switch (reason) {
      case NotSubscribedReason.Unknown || NotSubscribedReason.NoDeviceId:
        errorMessage = 'This operation can only be performed after the user is subscribed.';
        break;
      case NotSubscribedReason.NoEmailSet:
        errorMessage = 'No email is currently set.';
        break;
      case NotSubscribedReason.OptedOut:
        errorMessage = `The user has manually opted out of receiving of notifications. ` +
        `This operation can only be performed after the user is fully resubscribed.`;
        break;
    }
    super(errorMessage);
    this.reason = NotSubscribedReason[reason];

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, NotSubscribedError.prototype);
  }
}
