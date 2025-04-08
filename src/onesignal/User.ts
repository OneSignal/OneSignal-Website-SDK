import { OSModel } from '../core/modelRepo/OSModel';
import {
  SubscriptionType,
  SupportedSubscription,
} from '../core/models/SubscriptionModels';
import { ModelName } from '../core/models/SupportedModels';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../shared/errors/InvalidArgumentError';
import { isValidEmail, logMethodCall } from '../shared/utils/utils';
import UserDirector from './UserDirector';

export default class User {
  hasOneSignalId = false;
  onesignalId?: string;
  awaitOneSignalIdAvailable?: Promise<string>;
  isCreatingUser = false;

  static singletonInstance?: User = undefined;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static createOrGetInstance(): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User();
      UserDirector.initializeUser(true)
        .then(() => {
          UserDirector.copyOneSignalIdPromiseFromIdentityModel().catch(
            (e: Error) => {
              console.error(e);
            },
          );
        })
        .catch((e: Error) => {
          console.error(e);
        });
    }

    return User.singletonInstance;
  }

  /* PUBLIC API METHODS */

  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });

    if (typeof label !== 'string') {
      throw new InvalidArgumentError('label', InvalidArgumentReason.WrongType);
    }

    if (typeof id !== 'string') {
      throw new InvalidArgumentError('id', InvalidArgumentReason.WrongType);
    }

    if (!label) {
      throw new InvalidArgumentError('label', InvalidArgumentReason.Empty);
    }

    if (!id) {
      throw new InvalidArgumentError('id', InvalidArgumentReason.Empty);
    }

    this.addAliases({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });

    if (!aliases || Object.keys(aliases).length === 0) {
      throw new InvalidArgumentError('aliases', InvalidArgumentReason.Empty);
    }

    Object.keys(aliases).forEach(async (label) => {
      if (typeof label !== 'string') {
        throw new InvalidArgumentError(
          'label',
          InvalidArgumentReason.WrongType,
        );
      }
    });

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    identityModel?.setApplyToRecordId(identityModel?.onesignalId);

    Object.keys(aliases).forEach(async (label) => {
      identityModel?.set(label, aliases[label]);
    });
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });

    if (typeof label !== 'string') {
      throw new InvalidArgumentError('label', InvalidArgumentReason.WrongType);
    }

    if (!label) {
      throw new InvalidArgumentError('label', InvalidArgumentReason.Empty);
    }

    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    logMethodCall('removeAliases', { aliases });

    if (!aliases || aliases.length === 0) {
      throw new InvalidArgumentError('aliases', InvalidArgumentReason.Empty);
    }

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    identityModel?.setApplyToRecordId(identityModel?.onesignalId);

    aliases.forEach(async (alias) => {
      identityModel?.set(alias, undefined);
    });
  }

  public async addEmail(email: string): Promise<void> {
    logMethodCall('addEmail', { email });

    if (typeof email !== 'string') {
      throw new InvalidArgumentError('email', InvalidArgumentReason.WrongType);
    }

    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    if (!isValidEmail(email)) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    }

    const onesignalId = User.singletonInstance?.onesignalId;
    const subscription = this.getSubscriptionModel(
      SubscriptionType.Email,
      email,
      onesignalId,
    );

    if (
      User.singletonInstance?.isCreatingUser ||
      User.singletonInstance?.hasOneSignalId
    ) {
      // existing user
      subscription.setOneSignalId(onesignalId);
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      if (identityModel.data.external_id) {
        subscription.setExternalId(identityModel.data.external_id);
      }
      OneSignal.coreDirector.add(ModelName.Subscriptions, subscription, true);
    } else {
      // new user
      OneSignal.coreDirector.add(ModelName.Subscriptions, subscription, false);
      await UserDirector.createAndHydrateUser();
    }

    UserDirector.updateModelWithCurrentUserOneSignalId(subscription).catch(
      (e) => {
        throw e;
      },
    );
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    if (identityModel.data.external_id) {
      subscription.setExternalId(identityModel.data.external_id);
    }
  }

  public async addSms(sms: string): Promise<void> {
    logMethodCall('addSms', { sms });

    if (typeof sms !== 'string') {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.WrongType);
    }

    if (!sms) {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.Empty);
    }

    const onesignalId = User.singletonInstance?.onesignalId;
    const subscription = this.getSubscriptionModel(
      SubscriptionType.SMS,
      sms,
      onesignalId,
    );

    if (
      User.singletonInstance?.isCreatingUser ||
      User.singletonInstance?.hasOneSignalId
    ) {
      // existing user
      subscription.setOneSignalId(User.singletonInstance?.onesignalId);
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      if (identityModel.data.external_id) {
        subscription.setExternalId(identityModel.data.external_id);
      }
      OneSignal.coreDirector.add(ModelName.Subscriptions, subscription, true);
    } else {
      // new user
      OneSignal.coreDirector.add(ModelName.Subscriptions, subscription, false);
      await UserDirector.createAndHydrateUser();
    }

    UserDirector.updateModelWithCurrentUserOneSignalId(subscription).catch(
      (e) => {
        throw e;
      },
    );

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    if (identityModel.data.external_id) {
      subscription.setExternalId(identityModel.data.external_id);
    }
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });

    if (typeof email !== 'string') {
      throw new InvalidArgumentError('email', InvalidArgumentReason.WrongType);
    }

    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    const emailSubscriptions =
      OneSignal.coreDirector.getEmailSubscriptionModels();
    const modelIds = Object.keys(emailSubscriptions);
    modelIds.forEach(async (modelId) => {
      const model = emailSubscriptions[modelId];
      if (model.data?.token === email) {
        OneSignal.coreDirector.remove(ModelName.Subscriptions, modelId);
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
    const modelIds = Object.keys(smsSubscriptions);
    modelIds.forEach(async (modelId) => {
      const model = smsSubscriptions[modelId];
      if (model.data?.token === smsNumber) {
        OneSignal.coreDirector.remove(ModelName.Subscriptions, modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });

    if (typeof key !== 'string') {
      throw new InvalidArgumentError('key', InvalidArgumentReason.WrongType);
    }

    if (typeof value !== 'string') {
      throw new InvalidArgumentError('value', InvalidArgumentReason.WrongType);
    }

    if (!key) {
      throw new InvalidArgumentError('key', InvalidArgumentReason.Empty);
    }

    if (!value) {
      throw new InvalidArgumentError(
        'value',
        InvalidArgumentReason.Empty,
        'Did you mean to call removeTag?',
      );
    }

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    logMethodCall('addTags', { tags });

    if (typeof tags !== 'object') {
      throw new InvalidArgumentError('tags', InvalidArgumentReason.WrongType);
    }

    if (!tags) {
      throw new InvalidArgumentError('tags', InvalidArgumentReason.Empty);
    }

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    tags = { ...propertiesModel?.data?.tags, ...tags };
    propertiesModel?.set('tags', tags);
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });

    if (typeof tagKey !== 'string') {
      throw new InvalidArgumentError('tagKey', InvalidArgumentReason.WrongType);
    }

    if (typeof tagKey === 'undefined') {
      throw new InvalidArgumentError('tagKey', InvalidArgumentReason.Empty);
    }

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });

    if (!tagKeys || tagKeys.length === 0) {
      throw new InvalidArgumentError('tagKeys', InvalidArgumentReason.Empty);
    }

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const tagsCopy = JSON.parse(JSON.stringify(propertiesModel?.data?.tags));

    if (tagsCopy) {
      tagKeys.forEach((tagKey) => {
        tagsCopy[tagKey] = '';
      });
      propertiesModel?.setApplyToRecordId(propertiesModel?.onesignalId);
      propertiesModel?.set('tags', tagsCopy);
    }
  }

  public getTags(): { [key: string]: string } {
    logMethodCall('getTags');

    return OneSignal.coreDirector.getPropertiesModel()?.data?.tags || {};
  }

  public setLanguage(language: string): void {
    logMethodCall('setLanguage', { language });

    if (typeof language !== 'string') {
      throw new InvalidArgumentError(
        'language',
        InvalidArgumentReason.WrongType,
      );
    }

    if (!language) {
      throw new InvalidArgumentError('language', InvalidArgumentReason.Empty);
    }

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    propertiesModel?.set('language', language);
  }

  public getLanguage(): string {
    logMethodCall('getLanguage');
    return OneSignal.coreDirector.getPropertiesModel()?.data?.language || '';
  }

  /**
   * Retrieves subscription models that match the given token and optionally OneSignal ID
   * @param token - The token to search for in subscriptions
   * @param onesignalId - Optional OneSignal ID to filter by
   * @returns matching getSubscriptionModel and deletes duplicate subscriptions
   */
  public getSubscriptionModel(
    type: Extract<SubscriptionType, 'Email' | 'SMS'>,
    token: string,
    onesignalId?: string,
  ): OSModel<SupportedSubscription> {
    logMethodCall('getSubscriptionModels', { token, onesignalId });

    let subscriptions: { [key: string]: OSModel<SupportedSubscription> } = {};
    switch (type) {
      case SubscriptionType.Email:
        subscriptions = OneSignal.coreDirector.getEmailSubscriptionModels();
        break;
      case SubscriptionType.SMS:
        subscriptions = OneSignal.coreDirector.getSmsSubscriptionModels();
        break;
    }

    const matchingSubscriptions = Object.values(subscriptions);

    // No matching subscriptions so return new subscription
    if (matchingSubscriptions.length === 0) {
      return new OSModel<SupportedSubscription>(ModelName.Subscriptions, {
        type,
        token,
      });
    }

    // Remove duplicate subscriptions
    for (const subscription of matchingSubscriptions.slice(1)) {
      if (subscription.data?.token === token) {
        OneSignal.coreDirector.remove(
          ModelName.Subscriptions,
          subscription.modelId,
        );
      }
    }

    // Return the first matching subscription
    return matchingSubscriptions[0];
  }
}
