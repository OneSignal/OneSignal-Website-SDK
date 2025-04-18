import { Model } from './Model';

export class ConfigModel extends Model {
  get pushSubscriptionId(): string | undefined {
    return this.getProperty<string | undefined>('pushSubscriptionId');
  }
  set pushSubscriptionId(value: string | undefined) {
    this.setProperty('pushSubscriptionId', value);
  }
}
