import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/core/types/subscription';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../shared/errors/InvalidArgumentError';
import { isValidEmail, logMethodCall } from '../shared/utils/utils';
import UserDirector from './UserDirector';

export default class User {
  hasOneSignalId = false;
  onesignalId?: string;
  isCreatingUser = false;

  static singletonInstance?: User = undefined;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static createOrGetInstance(): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User();
      UserDirector.initializeUser(true).catch((e: Error) => {
        console.error(e);
      });
    }

    return User.singletonInstance;
  }

  /* PUBLIC API METHODS */

  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });

    if (typeof label !== 'string')
      throw new InvalidArgumentError('label', InvalidArgumentReason.WrongType);

    if (typeof id !== 'string')
      throw new InvalidArgumentError('id', InvalidArgumentReason.WrongType);

    if (!label)
      throw new InvalidArgumentError('label', InvalidArgumentReason.Empty);

    if (!id) throw new InvalidArgumentError('id', InvalidArgumentReason.Empty);

    this.addAliases({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });

    if (!aliases || Object.keys(aliases).length === 0)
      throw new InvalidArgumentError('aliases', InvalidArgumentReason.Empty);

    Object.keys(aliases).forEach(async (label) => {
      if (typeof label !== 'string') {
        throw new InvalidArgumentError(
          'label',
          InvalidArgumentReason.WrongType,
        );
      }
    });

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    Object.keys(aliases).forEach(async (label) => {
      identityModel.setProperty(label, aliases[label]);
    });
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });

    if (typeof label !== 'string')
      throw new InvalidArgumentError('label', InvalidArgumentReason.WrongType);

    if (!label)
      throw new InvalidArgumentError('label', InvalidArgumentReason.Empty);

    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    logMethodCall('removeAliases', { aliases });

    if (!aliases || aliases.length === 0) {
      throw new InvalidArgumentError('aliases', InvalidArgumentReason.Empty);
    }

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    aliases.forEach(async (alias) => {
      identityModel.setProperty(alias, undefined);
    });
  }

  public async addEmail(email: string): Promise<void> {
    logMethodCall('addEmail', { email });

    if (typeof email !== 'string')
      throw new InvalidArgumentError('email', InvalidArgumentReason.WrongType);

    if (!email)
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);

    if (!isValidEmail(email))
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);

    const subscription = {
      type: SubscriptionType.Email,
      token: email,
    };
    const newSubscription = new SubscriptionModel();
    newSubscription.mergeData(subscription);
    OneSignal.coreDirector.addSubscriptionModel(newSubscription);

    if (
      !(
        User.singletonInstance?.isCreatingUser ||
        User.singletonInstance?.hasOneSignalId
      )
    ) {
      await UserDirector.createAndHydrateUser();
    }
  }

  public async addSms(sms: string): Promise<void> {
    logMethodCall('addSms', { sms });

    if (typeof sms !== 'string')
      throw new InvalidArgumentError('sms', InvalidArgumentReason.WrongType);

    if (!sms)
      throw new InvalidArgumentError('sms', InvalidArgumentReason.Empty);

    const subscription = {
      type: SubscriptionType.SMS,
      token: sms,
    };

    const newSubscription = new SubscriptionModel();
    newSubscription.mergeData(subscription);

    OneSignal.coreDirector.addSubscriptionModel(newSubscription);

    if (
      !(
        User.singletonInstance?.isCreatingUser ||
        User.singletonInstance?.hasOneSignalId
      )
    ) {
      await UserDirector.createAndHydrateUser();
    }
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });

    if (typeof email !== 'string')
      throw new InvalidArgumentError('email', InvalidArgumentReason.WrongType);

    if (!email)
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);

    const emailSubscriptions =
      OneSignal.coreDirector.getEmailSubscriptionModels();

    emailSubscriptions.forEach((model) => {
      if (model.token === email) {
        OneSignal.coreDirector.removeSubscriptionModel(model.modelId);
      }
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });

    if (typeof smsNumber !== 'string') {
      throw new InvalidArgumentError(
        'smsNumber',
        InvalidArgumentReason.WrongType,
      );
    }

    if (!smsNumber) {
      throw new InvalidArgumentError('smsNumber', InvalidArgumentReason.Empty);
    }

    const smsSubscriptions = OneSignal.coreDirector.getSmsSubscriptionModels();
    smsSubscriptions.forEach((model) => {
      if (model.token === smsNumber) {
        OneSignal.coreDirector.removeSubscriptionModel(model.modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });

    if (typeof key !== 'string')
      throw new InvalidArgumentError('key', InvalidArgumentReason.WrongType);

    if (typeof value !== 'string')
      throw new InvalidArgumentError('value', InvalidArgumentReason.WrongType);

    if (!key)
      throw new InvalidArgumentError('key', InvalidArgumentReason.Empty);

    if (!value)
      throw new InvalidArgumentError(
        'value',
        InvalidArgumentReason.Empty,
        'Did you mean to call removeTag?',
      );

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    logMethodCall('addTags', { tags });

    if (typeof tags !== 'object')
      throw new InvalidArgumentError('tags', InvalidArgumentReason.WrongType);

    if (!tags)
      throw new InvalidArgumentError('tags', InvalidArgumentReason.Empty);

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const newTags = { ...propertiesModel.tags, ...tags };
    propertiesModel.tags = newTags;
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });

    if (typeof tagKey !== 'string')
      throw new InvalidArgumentError('tagKey', InvalidArgumentReason.WrongType);

    if (!tagKey)
      throw new InvalidArgumentError('tagKey', InvalidArgumentReason.Empty);

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });

    if (!tagKeys || tagKeys.length === 0)
      throw new InvalidArgumentError('tagKeys', InvalidArgumentReason.Empty);

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const newTags = { ...propertiesModel.tags };

    tagKeys.forEach((tagKey) => {
      delete newTags[tagKey];
    });
    propertiesModel.tags = newTags;
  }

  public getTags(): { [key: string]: string } {
    logMethodCall('getTags');
    return OneSignal.coreDirector.getPropertiesModel().tags;
  }

  public setLanguage(language: string): void {
    logMethodCall('setLanguage', { language });

    if (typeof language !== 'string')
      throw new InvalidArgumentError(
        'language',
        InvalidArgumentReason.WrongType,
      );

    if (!language)
      throw new InvalidArgumentError('language', InvalidArgumentReason.Empty);

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    propertiesModel.language = language;
  }

  public getLanguage(): string | undefined {
    logMethodCall('getLanguage');
    return OneSignal.coreDirector.getPropertiesModel().language;
  }
}
