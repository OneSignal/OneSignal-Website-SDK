import { ISubscription } from '../types/api';

export class SubscriptionObject {
  public readonly id?: ISubscription['id'];
  public readonly type?: ISubscription['type'];
  public readonly token?: ISubscription['token'];
  public readonly enabled?: ISubscription['enabled'];
  public readonly notification_types?: ISubscription['notification_types'];
  public readonly sdk?: ISubscription['sdk'];
  public readonly device_model?: ISubscription['device_model'];
  public readonly device_os?: ISubscription['device_os'];
  public readonly web_auth?: ISubscription['web_auth'];
  public readonly web_p256?: ISubscription['web_p256'];

  constructor(subscription?: Partial<ISubscription>) {
    if (subscription) {
      this.id = subscription.id;
      this.type = subscription.type;
      this.token = subscription.token;
      this.enabled = subscription.enabled;
      this.notification_types = subscription.notification_types;
      this.sdk = subscription.sdk;
      this.device_model = subscription.device_model;
      this.device_os = subscription.device_os;
      this.web_auth = subscription.web_auth;
      this.web_p256 = subscription.web_p256;
    }
  }
}
