import { CoreModule } from "../../core/CoreModule";
import { InvalidArgumentError, InvalidArgumentReason } from "../../shared/errors/InvalidArgumentError";
import { isValidEmail } from "../../shared/utils/utils";
import { PublicApi } from "../PublicApiDecorator";
import FutureSubscription from "../subscriptions/FutureSubscription";
import { SubscriptionType } from "../subscriptions/SubscriptionModel";
import { Subscriptions } from "../temp/Subscriptions";

export default class User {
  private subscriptions?: Subscriptions;

  constructor(private core: CoreModule) {}

  @PublicApi()
  public addAlias(label: string, id: string): void {
    this.addAliases([{ label, id }]);
  }

  @PublicApi()
  public addAliases(aliases: { label: string; id: string; }[]): void {
    aliases.forEach(alias => {
      this.core.modelRepo.identity = { ...this.core.modelRepo.identity, ...alias };
    });
  }

  @PublicApi()
  public removeAlias(label: string): void {
    this.removeAliases([label]);
  }

  @PublicApi()
  public removeAliases(aliases: string[]): void {
    aliases.forEach(alias => {
      if (this.core.modelRepo.identity) {
        delete this.core.modelRepo.identity[alias];
      }
    });
  }

  @PublicApi()
  public async addEmail(email: string): Promise<void> {
    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    if (!isValidEmail(email)) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    }

    const emailSubscription = new FutureSubscription(SubscriptionType.Email, email);
    this.core.modelRepo.subscriptions?.email?.push(emailSubscription);
  }

  @PublicApi()
  public addSms(sms: string): void {

  }

  @PublicApi()
  public removeEmail(email: string): void {

  }

  @PublicApi()
  public removeSms(smsNumber: string): void {

  }

  @PublicApi()
  public addTag(key: string, value: string): void {
    this.addTags({ [key]: value });
  }

  @PublicApi()
  public addTags(tags: {[key: string]: string}): void {
    this.core.modelRepo.properties = { ...this.core.modelRepo.properties, tags };
  }

  @PublicApi()
  public removeTag(tag: string): void {
    this.removeTags([tag]);
  }

  @PublicApi()
  public removeTags(tags: string[]): void {
    tags.forEach(tag => {
      if (this.core.modelRepo.properties?.tags?.[tag]) {
        delete this.core.modelRepo.properties.tags[tag];
      }
    });
  }

  @PublicApi()
  public sendOutcome(outcomeName: string, outcomeWeight?: number | undefined): void {

  }

  @PublicApi()
  public sendUniqueOutcome(outcomeName: string): void {

  }
}