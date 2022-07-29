import { InvalidArgumentError, InvalidArgumentReason } from "../../shared/errors/InvalidArgumentError";
import { awaitOneSignalInitAndSupported, isValidEmail } from "../../shared/utils/utils";
import { PublicApi } from "../PublicApiDecorator";
import { Subscriptions } from "../temp/Subscriptions";

export default class User {
  private subscriptions: Subscriptions;
  constructor() {}

  @PublicApi()
  static addAlias(label: string, id: string): void {

  }
  @PublicApi()
  static addAliases(aliases: { label: string; id: string; }[]): void {

  }
  @PublicApi()
  static removeAlias(label: string, id: string): void {

  }
  @PublicApi()
  static removeAliases(aliases: { label: string; id: string; }[]): void {

  }
  @PublicApi()
  static updateAlias(label: string, id: string, newId: string): void {

  }
  @PublicApi()
  static async addEmail(email: string): Promise<void> {
    await awaitOneSignalInitAndSupported();
    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }
    if (!isValidEmail(email)) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    }

  }
  @PublicApi()
  static addSms(sms: string): void {

  }
  @PublicApi()
  static removeEmail(): void {

  }
  @PublicApi()
  static removeSms(): void {

  }
  @PublicApi()
  static addTag(key: string, value: string | number | boolean): void {

  }
  @PublicApi()
  static addTags(tags: { key: string; value: string | number | boolean; }[]): void {

  }
  @PublicApi()
  static removeTag(tag: string): void {

  }
  @PublicApi()
  static removeTags(tags: string[]): void {

  }
  @PublicApi()
  static sendOutcome(outcomeName: string, outcomeWeight?: number | undefined): void {

  }
  @PublicApi()
  static sendUniqueOutcome(outcomeName: string): void {

  }
}