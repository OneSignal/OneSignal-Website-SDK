import { OSModel } from "../core/modelRepo/OSModel";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { CoreModuleDirector } from "../core/CoreModuleDirector";
import { FutureSubscriptionModel, SubscriptionType } from "../core/models/SubscriptionModels";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { isValidEmail, logMethodCall } from "../shared/utils/utils";
import User from "./User";
import OneSignalError from "../shared/errors/OneSignalError";
import PushSubscriptionNamespace from "./PushSubscriptionNamespace";

export default class UserNamespace {
  private _currentUser?: User;
  public userLoaded: Promise<void>;

  readonly PushSubscription = new PushSubscriptionNamespace();

  constructor(private coreDirector: CoreModuleDirector) {
    this.userLoaded = this._loadUser();
  }

  private async _loadUser(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this._currentUser = User.createOrGetInstance(
          await this.coreDirector.getIdentityModel(),
          await this.coreDirector.getPropertiesModel(),
          await this.coreDirector.getPushSubscriptionModel(),
          await this.coreDirector.getSmsSubscriptionModels(),
          await this.coreDirector.getEmailSubscriptionModels(),
        );
        await this._currentUser.setupNewUser(true);

        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  private async _updateModelWithCurrentUserOneSignalId(model: OSModel<SupportedModel>): Promise<void> {
    // silences typescript error below
    if (!this._currentUser) {
      throw new OneSignalError('User not loaded');
    }

    if (!this._currentUser.identity) {
      throw new OneSignalError('User identity not loaded');
    }

    // wait for the user to be loaded
    await this.userLoaded;

    // wait for the user's onesignal id to be loaded
    await this._currentUser.awaitOneSignalIdAvailable;

    const { onesignalId } = this._currentUser.identity;
    model.setOneSignalId(onesignalId);
  }

  /* P U B L I C   A P I  */

  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });

    if (!label) {
      throw new InvalidArgumentError('label', InvalidArgumentReason.Empty,);
    }

    if (!id) {
      throw new InvalidArgumentError('id', InvalidArgumentReason.Empty,);
    }

    this.addAliases([{ label, id }]);
  }

  public addAliases(aliases: { label: string; id: string; }[]): void {
    logMethodCall('addAliases', { aliases });

    if (!aliases || aliases.length === 0) {
      throw new InvalidArgumentError('aliases', InvalidArgumentReason.Empty);
    }

    aliases.forEach(async alias => {
      const identityModel = await this.coreDirector.getIdentityModel();
      identityModel?.set(alias.label, alias.id);
    });
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });

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
      const identityModel = await this.coreDirector.getIdentityModel();
      identityModel?.set(alias, undefined);
    });
  }

  public addEmail(email: string): void {
    logMethodCall('addEmail', { email });
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

    this.coreDirector.add(ModelName.EmailSubscriptions, newSubscription, true).then(() => {
      this._currentUser?.sendUserCreate();
    }).catch(e => {
      throw e;
    });

    this._updateModelWithCurrentUserOneSignalId(newSubscription).catch(e => {
      throw e;
    });
  }

  public addSms(sms: string): void {
    logMethodCall('addSms', { sms });
    if (!sms) {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.Empty);
    }

    const subscription: FutureSubscriptionModel = {
      type: SubscriptionType.SMS,
      token: sms,
    };

    const newSubscription = new OSModel<SupportedModel>(ModelName.SmsSubscriptions, subscription);

    this.coreDirector.add(ModelName.SmsSubscriptions, newSubscription, true).then(() => {
      this._currentUser?.sendUserCreate();
    }).catch(e => {
      throw e;
    });

    this._updateModelWithCurrentUserOneSignalId(newSubscription).catch(e => {
      throw e;
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });

    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    this.coreDirector.getEmailSubscriptionModels().then(emailSubscriptions => {
      const modelIds = Object.keys(emailSubscriptions);
      modelIds.forEach(async modelId => {
        const model = emailSubscriptions[modelId];
        if (model.data?.token === email) {
          this.coreDirector.remove(ModelName.EmailSubscriptions, modelId).catch(e => {
            throw e;
          });
        }
      });
    }).catch(e => {
      throw e;
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });

    if (!smsNumber) {
      throw new InvalidArgumentError('smsNumber', InvalidArgumentReason.Empty);
    }

    this.coreDirector.getSmsSubscriptionModels().then(smsSubscriptions => {
      const modelIds = Object.keys(smsSubscriptions);
      modelIds.forEach(async modelId => {
        const model = smsSubscriptions[modelId];
        if (model.data?.token === smsNumber) {
          this.coreDirector.remove(ModelName.SmsSubscriptions, modelId).catch(e => {
            throw e;
          });
        }
      });
    }).catch(e => {
      throw e;
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });

    if (!key) {
      throw new InvalidArgumentError('key', InvalidArgumentReason.Empty);
    }

    this.addTags({ [key]: value });
  }

  public addTags(tags: {[key: string]: string}): void {
    logMethodCall('addTags', { tags });

    if (!tags) {
      throw new InvalidArgumentError('tags', InvalidArgumentReason.Empty);
    }

    this.coreDirector.getPropertiesModel().then(propertiesModel => {
      propertiesModel?.set('tags', tags);
    }).catch(e => {
      throw e;
    });
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });

    if (!tagKey) {
      throw new InvalidArgumentError('tagKey', InvalidArgumentReason.Empty);
    }

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });

    if (!tagKeys || tagKeys.length === 0) {
      throw new InvalidArgumentError('tagKeys', InvalidArgumentReason.Empty);
    }

    this.coreDirector.getPropertiesModel().then(propertiesModel => {
      const tags = propertiesModel?.data?.tags;

      if (tags) {
        tagKeys.forEach(tagKey => {
          delete tags[tagKey];
        });
        propertiesModel.set('tags', tags);
      }
    }).catch(e => {
      throw e;
    });
  }
}
