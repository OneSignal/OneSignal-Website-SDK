import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { isObject, isValidEmail } from 'src/shared/helpers/general';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import {
  NotificationType,
  SubscriptionType,
  type SubscriptionTypeValue,
} from 'src/shared/subscriptions';
import {
  InvalidArgumentError,
  InvalidArgumentReason,
} from '../shared/errors/InvalidArgumentError';
import { logMethodCall } from '../shared/utils/utils';

export default class User {
  static singletonInstance?: User = undefined;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static createOrGetInstance(): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User();
    }

    return User.singletonInstance;
  }

  get onesignalId(): string | undefined {
    const oneSignalId = OneSignal.coreDirector.getIdentityModel().onesignalId;
    return !IDManager.isLocalId(oneSignalId) ? oneSignalId : undefined;
  }

  private validateStringLabel(label: string, labelName: string): void {
    if (typeof label !== 'string')
      throw new InvalidArgumentError(
        labelName,
        InvalidArgumentReason.WrongType,
      );

    if (!label)
      throw new InvalidArgumentError(labelName, InvalidArgumentReason.Empty);
  }

  private validateArray(array: string[], arrayName: string): void {
    if (!Array.isArray(array))
      throw new InvalidArgumentError(
        arrayName,
        InvalidArgumentReason.WrongType,
      );

    if (array.length === 0)
      throw new InvalidArgumentError(arrayName, InvalidArgumentReason.Empty);

    for (const label of array) {
      this.validateLabel(label, 'label');
    }
  }

  private validateObject(object: unknown, objectName: string): void {
    if (!isObject(object))
      throw new InvalidArgumentError(
        objectName,
        InvalidArgumentReason.WrongType,
      );

    if (!object || Object.keys(object).length === 0)
      throw new InvalidArgumentError(objectName, InvalidArgumentReason.Empty);
  }

  private validateLabel(label: string, labelName: string): void {
    this.validateStringLabel(label, labelName);

    if (label === 'external_id' || label === 'onesignal_id') {
      throw new InvalidArgumentError(label, InvalidArgumentReason.Reserved);
    }
  }

  private updateIdentityModel(aliases: {
    [key: string]: string | undefined;
  }): void {
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    Object.keys(aliases).forEach((label) => {
      identityModel.setProperty(label, aliases[label]);
    });
  }

  /* PUBLIC API METHODS */
  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });

    this.validateStringLabel(label, 'label');
    this.validateStringLabel(id, 'id');

    this.addAliases({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });
    this.validateObject(aliases, 'aliases');

    for (const label of Object.keys(aliases)) {
      this.validateStringLabel(aliases[label], `key: ${label}`);
      this.validateLabel(label, `key: ${label}`);
    }

    this.updateIdentityModel(aliases);
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });
    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    logMethodCall('removeAliases', { aliases });
    this.validateArray(aliases, 'aliases');

    const newAliases = Object.fromEntries(
      aliases.map((key) => [key, undefined]),
    );
    this.updateIdentityModel(newAliases);
  }

  private async addSubscriptionToModels({
    type,
    token,
  }: {
    type: SubscriptionTypeValue;
    token: string;
  }): Promise<void> {
    const hasSubscription = OneSignal.coreDirector.subscriptionModelStore
      .list()
      .find((model) => model.token === token && model.type === type);
    if (hasSubscription) return;

    const subscription = {
      id: IDManager.createLocalId(),
      enabled: true,
      notification_types: NotificationType.Subscribed,
      onesignalId: OneSignal.coreDirector.getIdentityModel().onesignalId,
      token,
      type,
    };

    const newSubscription = new SubscriptionModel();
    newSubscription.mergeData(subscription);
    OneSignal.coreDirector.addSubscriptionModel(newSubscription);
  }

  /**
   * Temporary fix, for now we expect the user to call login before adding an email/sms subscription
   */
  private validateUserExists(): boolean {
    const hasOneSignalId =
      !!OneSignal.coreDirector.getIdentityModel().onesignalId;
    if (!hasOneSignalId) {
      Log.error('User must be logged in first.');
    }
    return hasOneSignalId;
  }

  public async addEmail(email: string): Promise<void> {
    if (!this.validateUserExists()) return;
    logMethodCall('addEmail', { email });

    this.validateStringLabel(email, 'email');

    if (!isValidEmail(email))
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);

    this.addSubscriptionToModels({
      type: SubscriptionType.Email,
      token: email,
    });
  }

  public async addSms(sms: string): Promise<void> {
    if (!this.validateUserExists()) return;
    logMethodCall('addSms', { sms });

    this.validateStringLabel(sms, 'sms');

    this.addSubscriptionToModels({
      type: SubscriptionType.SMS,
      token: sms,
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });

    this.validateStringLabel(email, 'email');

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

    this.validateStringLabel(smsNumber, 'smsNumber');

    const smsSubscriptions = OneSignal.coreDirector.getSmsSubscriptionModels();
    smsSubscriptions.forEach((model) => {
      if (model.token === smsNumber) {
        OneSignal.coreDirector.removeSubscriptionModel(model.modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });

    this.validateStringLabel(key, 'key');
    this.validateStringLabel(value, 'value');

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    logMethodCall('addTags', { tags });

    this.validateObject(tags, 'tags');

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const newTags = { ...propertiesModel.tags, ...tags };
    propertiesModel.tags = newTags;
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });

    this.validateStringLabel(tagKey, 'tagKey');

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });

    this.validateArray(tagKeys, 'tagKeys');

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    const newTags = { ...propertiesModel.tags };

    // need to set the tag to an empty string to remove it
    tagKeys.forEach((tagKey) => {
      newTags[tagKey] = '';
    });
    propertiesModel.tags = newTags;
  }

  public getTags(): { [key: string]: string } {
    logMethodCall('getTags');
    return OneSignal.coreDirector.getPropertiesModel().tags;
  }

  public setLanguage(language: string): void {
    logMethodCall('setLanguage', { language });

    this.validateStringLabel(language, 'language');

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    propertiesModel.language = language;
  }

  public getLanguage(): string | undefined {
    logMethodCall('getLanguage');
    return OneSignal.coreDirector.getPropertiesModel().language;
  }

  public trackEvent(name: string, properties: Record<string, unknown> = {}) {
    if (!this.validateUserExists()) return;
    if (!isObjectSerializable(properties)) {
      return Log.error(
        'Custom event properties must be a JSON-serializable object',
      );
    }

    logMethodCall('trackEvent', { name, properties });
    OneSignal.coreDirector.customEventController.sendCustomEvent({
      name,
      properties,
    });
  }
}

/**
 * Returns true if the value is a JSON-serializable object.
 */
function isObjectSerializable(value: unknown): boolean {
  if (!isObject(value)) return false;
  try {
    JSON.stringify(value);
    return true;
  } catch (e) {
    return false;
  }
}
