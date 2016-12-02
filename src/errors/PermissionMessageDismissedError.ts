import OneSignalError from "./OneSignalError";


export default class PermissionMessageDismissedError extends OneSignalError {
  constructor() {
    super('The permission message was previously dismissed.');
  }
}