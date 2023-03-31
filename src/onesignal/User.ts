import { OSModel } from "../core/modelRepo/OSModel";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { FutureSubscriptionModel, SubscriptionType } from "../core/models/SubscriptionModels";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { logMethodCall, isValidEmail } from "../shared/utils/utils";
import UserDirector from "./UserDirector";

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
          UserDirector.copyOneSignalIdPromiseFromIdentityModel()
            .catch((e: Error) => {
              console.error(e);
            });
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

    Object.keys(aliases).forEach(async label => {
      if (typeof label !== 'string') {
        throw new InvalidArgumentError('label', InvalidArgumentReason.WrongType);
      }
    });

    Object.keys(aliases).forEach(async label => {
      const identityModel = OneSignal.coreDirector.getIdentityModel();
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

    aliases.forEach(async alias => {
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      identityModel?.set(alias, undefined);
    });
  }

  public addEmail(email: string): void {
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

    const subscription: FutureSubscriptionModel = {
      type: SubscriptionType.Email,
      token: email,
    };
    const newSubscription = new OSModel<SupportedModel>(ModelName.EmailSubscriptions, subscription);

    if (User.singletonInstance?.isCreatingUser || User.singletonInstance?.hasOneSignalId) {
      // existing user
      newSubscription.setOneSignalId(User.singletonInstance?.onesignalId);
      OneSignal.coreDirector.add(ModelName.EmailSubscriptions, newSubscription, true);
    } else {
      // new user
      OneSignal.coreDirector.add(ModelName.EmailSubscriptions, newSubscription, false);
      UserDirector.createUserOnServer();
    }

    UserDirector.updateModelWithCurrentUserOneSignalId(newSubscription).catch(e => {
      throw e;
    });
  }

  public addSms(sms: string): void {
    logMethodCall('addSms', { sms });

    if (typeof sms !== 'string') {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.WrongType);
    }

    if (!sms) {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.Empty);
    }

    const subscription: FutureSubscriptionModel = {
      type: SubscriptionType.SMS,
      token: sms,
    };

    const newSubscription = new OSModel<SupportedModel>(ModelName.SmsSubscriptions, subscription);

    if (User.singletonInstance?.isCreatingUser || User.singletonInstance?.hasOneSignalId) {
      // existing user
      newSubscription.setOneSignalId(User.singletonInstance?.onesignalId);
      OneSignal.coreDirector.add(ModelName.SmsSubscriptions, newSubscription, true);
    } else {
      // new user
      OneSignal.coreDirector.add(ModelName.SmsSubscriptions, newSubscription, false);
      UserDirector.createUserOnServer();
    }

    UserDirector.updateModelWithCurrentUserOneSignalId(newSubscription).catch(e => {
      throw e;
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });

    if (typeof email !== 'string') {
      throw new InvalidArgumentError('email', InvalidArgumentReason.WrongType);
    }

    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    const emailSubscriptions = OneSignal.coreDirector.getEmailSubscriptionModels();
    const modelIds = Object.keys(emailSubscriptions);
    modelIds.forEach(async modelId => {
      const model = emailSubscriptions[modelId];
      if (model.data?.token === email) {
        OneSignal.coreDirector.remove(ModelName.EmailSubscriptions, modelId);
      }
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });

    if (typeof smsNumber !== 'string') {
      throw new InvalidArgumentError('smsNumber', InvalidArgumentReason.WrongType);
    }

    if (!smsNumber) {
      throw new InvalidArgumentError('smsNumber', InvalidArgumentReason.Empty);
    }

    const smsSubscriptions = OneSignal.coreDirector.getSmsSubscriptionModels();
    const modelIds = Object.keys(smsSubscriptions);
    modelIds.forEach(async modelId => {
      const model = smsSubscriptions[modelId];
      if (model.data?.token === smsNumber) {
        OneSignal.coreDirector.remove(ModelName.SmsSubscriptions, modelId);
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
      throw new InvalidArgumentError('value', InvalidArgumentReason.Empty, "Did you mean to call removeTag?");
    }

    this.addTags({ [key]: value });
  }

  public addTags(tags: {[key: string]: string}): void {
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
      tagKeys.forEach(tagKey => {
        tagsCopy[tagKey] = "";
      });
      propertiesModel?.set('tags', tagsCopy);
    }
  }
}
