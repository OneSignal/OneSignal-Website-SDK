import { InvalidArgumentError, InvalidArgumentReason } from "../../shared/errors/InvalidArgumentError";
import { awaitOneSignalInitAndSupported, isValidEmail } from "../../shared/utils/utils";
import { PublicApi } from "../PublicApiDecorator";
import IUser from "../temp/IUser";
import { Subscriptions } from "../temp/Subscriptions";

export default class User implements IUser {
  private subscriptions: Subscriptions;
  constructor() {}

  @PublicApi()
  public addAlias(label: string, id: string): void {

  }
  @PublicApi()
  public addAliases(aliases: { label: string; id: string; }[]): void {

  }
  @PublicApi()
  public removeAlias(label: string, id: string): void {

  }
  @PublicApi()
  public removeAliases(aliases: { label: string; id: string; }[]): void {

  }
  @PublicApi()
  public updateAlias(label: string, id: string, newId: string): void {

  }
  @PublicApi()
  public async addEmail(email: string): Promise<void> {
    await awaitOneSignalInitAndSupported();
    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }
    if (!isValidEmail(email)) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    }

  }
  @PublicApi()
  public addSms(sms: string): void {

  }
  @PublicApi()
  public removeEmail(): void {

  }
  @PublicApi()
  public removeSms(): void {

  }
  @PublicApi()
  public addTag(key: string, value: string | number | boolean): void {

  }
  @PublicApi()
  public addTags(tags: { key: string; value: string | number | boolean; }[]): void {

  }
  @PublicApi()
  public removeTag(tag: string): void {

  }
  @PublicApi()
  public removeTags(tags: string[]): void {

  }
  @PublicApi()
  public sendOutcome(outcomeName: string, outcomeWeight?: number | undefined): void {

  }
  @PublicApi()
  public sendUniqueOutcome(outcomeName: string): void {

  }
}