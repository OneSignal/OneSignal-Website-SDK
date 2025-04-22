import { Model } from './Model';

type Config = {
  pushSubscriptionId: string | undefined;
};

export class ConfigModel extends Model<Config> {
  get pushSubscriptionId(): string | undefined {
    return this.getProperty('pushSubscriptionId');
  }
  set pushSubscriptionId(value: string | undefined) {
    this.setProperty('pushSubscriptionId', value);
  }
}
