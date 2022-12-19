import User from "./User";
import PushSubscriptionNamespace from "./PushSubscriptionNamespace";

export default class UserNamespace {
  private _currentUser?: User;

  readonly PushSubscription = new PushSubscriptionNamespace();

  constructor() {
    this._currentUser = User.createOrGetInstance();
  }

  /* P U B L I C   A P I  */
  public addAlias(label: string, id: string): void {
    this._currentUser?.addAlias(label, id);
  }

  public addAliases(aliases: { [key: string]: string }): void {
    this._currentUser?.addAliases(aliases);
  }

  public removeAlias(label: string): void {
    this._currentUser?.removeAlias(label);
  }

  public removeAliases(labels: string[]): void {
    this._currentUser?.removeAliases(labels);
  }

  public addEmail(email: string): void {
    this._currentUser?.addEmail(email);
  }

  public removeEmail(email: string): void {
    this._currentUser?.removeEmail(email);
  }

  public addSms(smsNumber: string): void {
    this._currentUser?.addSms(smsNumber);
  }

  public removeSms(smsNumber: string): void {
    this._currentUser?.removeSms(smsNumber);
  }

  public addTag(key: string, value: string): void {
    this._currentUser?.addTag(key, value);
  }

  public addTags(tags: { [key: string]: string }): void {
    this._currentUser?.addTags(tags);
  }

  public removeTag(key: string): void {
    this._currentUser?.removeTag(key);
  }

  public removeTags(keys: string[]): void {
    this._currentUser?.removeTags(keys);
  }
}
