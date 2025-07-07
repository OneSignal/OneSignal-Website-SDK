import UserChangeEvent from '../page/models/UserChangeEvent';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import Emitter from '../shared/libraries/Emitter';
import { Subscription } from '../shared/models/Subscription';
import PushSubscriptionNamespace from './PushSubscriptionNamespace';
import User from './User';

export default class UserNamespace extends EventListenerBase {
  private _currentUser?: User;

  readonly PushSubscription = new PushSubscriptionNamespace(false);

  static emitter = new Emitter();

  constructor(
    initialize: boolean,
    subscription?: Subscription,
    permission?: NotificationPermission,
  ) {
    super();
    if (initialize) {
      this._currentUser = User.createOrGetInstance();
      this.PushSubscription = new PushSubscriptionNamespace(
        true,
        subscription,
        permission,
      );
    }
  }

  /* P U B L I C   A P I  */

  get onesignalId(): string | undefined {
    return this._currentUser?.onesignalId;
  }

  get externalId(): string | undefined {
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    return identityModel?.externalId;
  }

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

  public getTags(): { [key: string]: string } {
    return this._currentUser?.getTags() || {};
  }

  public trackEvent(name: string, properties?: Record<string, unknown>): void {
    return this._currentUser?.trackEvent(name, properties);
  }

  public setLanguage(language: string): void {
    this._currentUser?.setLanguage(language);
  }

  public getLanguage(): string {
    return this._currentUser?.getLanguage() || '';
  }

  addEventListener(
    event: 'change',
    listener: (userChange: UserChangeEvent) => void,
  ): void {
    UserNamespace.emitter.on(event, listener);
  }

  removeEventListener(
    event: 'change',
    listener: (userChange: UserChangeEvent) => void,
  ): void {
    UserNamespace.emitter.off(event, listener);
  }
}
