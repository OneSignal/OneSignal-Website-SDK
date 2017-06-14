import OneSignalError from "./OneSignalError";


export enum OneSignalApiErrorKind {
  MissingAppId
}

export class OneSignalApiError extends OneSignalError {
  reason: string;

  constructor(reason: OneSignalApiErrorKind) {
    switch (reason) {
      case OneSignalApiErrorKind.MissingAppId:
        super('The API call is missing an app ID.');
        break;
    }
  }
}
