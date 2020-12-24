import OneSignalError from "./OneSignalError";


export enum SubscriptionErrorReason {
  InvalidSafariSetup,
  Blocked,
  Dismissed
}

export default class SubscriptionError extends OneSignalError {
  constructor(reason: SubscriptionErrorReason) {
    let errorMessage;
    switch (reason) {
      case SubscriptionErrorReason.InvalidSafariSetup:
        errorMessage = `The Safari site URL, icon size, or push certificate ` +
        `is invalid, or Safari is in a private session.`;
        break;
      case SubscriptionErrorReason.Blocked:
        errorMessage = 'Notification permissions are blocked.';
        break;
      case SubscriptionErrorReason.Dismissed:
        errorMessage = 'The notification permission prompt was dismissed.';
        break;
    }

    super(errorMessage);
    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }
}
