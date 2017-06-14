import OneSignalError from './OneSignalError';


export default class AlreadySubscribedError extends OneSignalError {
  constructor() {
    super('This operation can only be performed when the user is not subscribed.');
  }
}
