import { OSModel } from "../../src/core/modelRepo/OSModel";
import { ModelName, SupportedModel } from "../../src/core/models/SupportedModels";
import { CoreModuleDirector } from "../../src/core/CoreModuleDirector";
import { SubscriptionType } from "../../src/core/models/SubscriptionModels";
import { InvalidArgumentError, InvalidArgumentReason } from "../../src/shared/errors/InvalidArgumentError";
import { isValidEmail } from "../../src/shared/utils/utils";
import User from "./User";

export default class UserNamespace {
  private currentUser?: User;
  public userLoaded: Promise<void>;

  constructor(private coreDirector: CoreModuleDirector) {
    this.userLoaded = new Promise(async (resolve, reject) => {
      try {
        this.currentUser = new User(
          await this.coreDirector.getIdentityModel(),
          await this.coreDirector.getPropertiesModel(),
          await this.coreDirector.getPushSubscriptionModels(),
          await this.coreDirector.getSmsSubscriptionModels(),
          await this.coreDirector.getEmailSubscriptionModels(),
        );
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  public addAlias(label: string, id: string): void {
    this.addAliases([{ label, id }]);
  }

  public addAliases(aliases: { label: string; id: string; }[]): void {
    aliases.forEach(async alias => {
      const identityModel = await this.coreDirector.getIdentityModel();
      identityModel.set(alias.label, alias.id);
    });
  }

  public removeAlias(label: string): void {
    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    aliases.forEach(async alias => {
      const identityModel = await this.coreDirector.getIdentityModel();
      identityModel.set(alias, undefined);
    });
  }

  public addEmail(email: string): void {
    if (!email) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Empty);
    }

    if (!isValidEmail(email)) {
      throw new InvalidArgumentError('email', InvalidArgumentReason.Malformed);
    }

    const newSubscription = new OSModel<SupportedModel>(ModelName.EmailSubscriptions, undefined, {
      type: SubscriptionType.Email,
      token: email,
    });

    this.coreDirector.add(ModelName.EmailSubscriptions, newSubscription).catch(e => {
      throw e;
    });
  }

  public addSms(sms: string): void {
    if (!sms) {
      throw new InvalidArgumentError('sms', InvalidArgumentReason.Empty);
    }

    const newSubscription = new OSModel<SupportedModel>(ModelName.SmsSubscriptions, undefined, {
      type: SubscriptionType.SMS,
      token: sms,
    });

    this.coreDirector.add(ModelName.SmsSubscriptions, newSubscription).catch(e => {
      throw e;
    });
  }

  public removeEmail(email: string): void {
    this.coreDirector.getEmailSubscriptionModels().then(emailSubscriptions => {
      const modelIds = Object.keys(emailSubscriptions);
      modelIds.forEach(async modelId => {
        const model = emailSubscriptions[modelId];
        if (model.data?.token === email) {
          this.coreDirector.remove(ModelName.EmailSubscriptions, modelId);
        }
      });
    }).catch(e => {
      throw e;
    });
  }

  public removeSms(smsNumber: string): void {
    this.coreDirector.getSmsSubscriptionModels().then(smsSubscriptions => {
      const modelIds = Object.keys(smsSubscriptions);
      modelIds.forEach(async modelId => {
        const model = smsSubscriptions[modelId];
        if (model.data?.token === smsNumber) {
          this.coreDirector.remove(ModelName.SmsSubscriptions, modelId);
        }
      });
    }).catch(e => {
      throw e;
    });
  }

  public addTag(key: string, value: string): void {
    this.addTags({ [key]: value });
  }

  public addTags(tags: {[key: string]: string}): void {
    this.coreDirector.getPropertiesModel().then(propertiesModel => {
      propertiesModel.set('tags', tags);
    }).catch(e => {
      throw e;
    });
  }

  public removeTag(tagKey: string): void {
    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    this.coreDirector.getPropertiesModel().then(propertiesModel => {
      const tags = propertiesModel.data?.tags;

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
