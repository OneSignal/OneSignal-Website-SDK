import OneSignalError from "./OneSignalError";


export enum SubscriptionErrorReason {
  InvalidSafariSetup,
  Blocked,
  Dismissed
}

export default class SubscriptionError extends OneSignalError {
  constructor(reason: SubscriptionErrorReason) {
    switch (reason) {
      case SubscriptionErrorReason.InvalidSafariSetup:
        super('The Safari site URL, icon size, or push certificate is invalid, or Safari is in a private session.');
        break;
      case SubscriptionErrorReason.Blocked:
        super('Notification permissions are blocked.');
        break;
      case SubscriptionErrorReason.Dismissed:
        super('The notification permission prompt was dismissed.');
        break;
    }

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }
}
