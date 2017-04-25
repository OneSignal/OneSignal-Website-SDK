import PushSubscription from './PushSubscription';

// https://developer.mozilla.org/en-US/docs/Web/API/PushManager
export default class PushManager {
  constructor() {
    this.subscription = new PushSubscription();
  }

  getSubscription() {
    return Promise.resolve(this.subscription);
  }

  permissionState() {
    return Promise.resolve('granted');
  }

  subscribe() {
    return Promise.resolve(this.subscription);
  }
}
