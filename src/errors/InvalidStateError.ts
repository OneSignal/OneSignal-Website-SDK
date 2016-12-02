import OneSignalError from "./OneSignalError";

export enum InvalidStateReason {
  NotSubscribed,
  MissingAppId
}

export class InvalidStateError extends OneSignalError {
  reason: string;

  constructor(reason: InvalidStateReason) {
    switch (reason) {
      case InvalidStateReason.MissingAppId:
        super(`Missing required app ID.`);
        break;
      case InvalidStateReason.NotSubscribed:
        super(`This operation can only be performed after the user is subscribed.`);
        break;
    }
    this.reason = InvalidStateReason[reason];
  }
}