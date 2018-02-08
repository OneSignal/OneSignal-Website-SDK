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
    switch (reason) {
      case NotSubscribedReason.Unknown || NotSubscribedReason.NoDeviceId:
        super('This operation can only be performed after the user is subscribed.');
        break;
      case NotSubscribedReason.NoEmailSet:
        super('No email is currently set.');
        break;
      case NotSubscribedReason.OptedOut:
        super('The user has manually opted out of receiving of notifications. This operation can only be performed after the user is fully resubscribed.');
        break;
    }
    this.reason = NotSubscribedReason[reason];
  }
}
