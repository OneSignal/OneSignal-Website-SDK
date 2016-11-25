import OneSignalError from "./OneSignalError";

export enum InvalidStateReason {
  NotSubscribed
}

export class InvalidStateError extends OneSignalError {
  constructor(reason: InvalidStateReason) {
    switch (reason) {
      case InvalidStateReason.NotSubscribed:
        super(`This operation can only be performed after the user is subscribed.`);
        break;
    }
  }
}