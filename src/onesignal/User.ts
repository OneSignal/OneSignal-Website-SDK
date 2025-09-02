import { IdentityConstants } from 'src/core/constants';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { ModelChangeTags } from 'src/core/types/models';
import { isConsentRequiredButNotGiven } from 'src/shared/database/config';
import {
  EmptyArgumentError,
  MalformedArgumentError,
  ReservedArgumentError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import MainHelper from 'src/shared/helpers/MainHelper';
import { isObject, isValidEmail } from 'src/shared/helpers/validators';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import {
  NotificationType,
  SubscriptionType,
} from 'src/shared/subscriptions/constants';
import type { SubscriptionTypeValue } from 'src/shared/subscriptions/types';
import { logMethodCall } from 'src/shared/utils/utils';

export default class User {
  static singletonInstance?: User;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static createOrGetInstance(): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User();
      const identityModel = OneSignal._coreDirector._getIdentityModel();
      const propertiesModel = OneSignal._coreDirector._getPropertiesModel();

      const onesignalId =
        identityModel.onesignalId ?? IDManager._createLocalId();
      if (!identityModel.onesignalId) {
        identityModel.setProperty(
          IdentityConstants.ONESIGNAL_ID,
          onesignalId,
          ModelChangeTags.NO_PROPAGATE,
        );
      }

      if (!propertiesModel.onesignalId) {
        propertiesModel.setProperty(
          'onesignalId',
          onesignalId,
          ModelChangeTags.NO_PROPAGATE,
        );
      }
    }

    return User.singletonInstance;
  }

  get onesignalId(): string | undefined {
    const onesignalId = OneSignal._coreDirector._getIdentityModel().onesignalId;
    return IDManager._isLocalId(onesignalId) ? undefined : onesignalId;
  }

  private validateStringLabel(label: string, labelName: string): void {
    if (typeof label !== 'string') throw WrongTypeArgumentError(labelName);

    if (!label) throw EmptyArgumentError(labelName);
  }

  private validateArray(array: string[], arrayName: string): void {
    if (!Array.isArray(array)) throw WrongTypeArgumentError(arrayName);

    if (array.length === 0) throw EmptyArgumentError(arrayName);

    for (const label of array) {
      this.validateLabel(label, 'label');
    }
  }

  private validateObject(object: unknown, objectName: string): void {
    if (!isObject(object)) throw WrongTypeArgumentError(objectName);

    if (!object || Object.keys(object).length === 0)
      throw EmptyArgumentError(objectName);
  }

  private validateLabel(label: string, labelName: string): void {
    this.validateStringLabel(label, labelName);

    if (label === 'external_id' || label === 'onesignal_id') {
      throw ReservedArgumentError(label);
    }
  }

  private updateIdentityModel(aliases: {
    [key: string]: string | undefined;
  }): void {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    Object.keys(aliases).forEach((label) => {
      identityModel.setProperty(label, aliases[label]);
    });
  }

  /* PUBLIC API METHODS */
  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(label, 'label');
    this.validateStringLabel(id, 'id');

    this.addAliases({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });
    if (isConsentRequiredButNotGiven()) return;

    this.validateObject(aliases, 'aliases');

    for (const label of Object.keys(aliases)) {
      this.validateStringLabel(aliases[label], `key: ${label}`);
      this.validateLabel(label, `key: ${label}`);
    }

    this.updateIdentityModel(aliases);
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });
    if (isConsentRequiredButNotGiven()) return;

    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    logMethodCall('removeAliases', { aliases });
    if (isConsentRequiredButNotGiven()) return;

    this.validateArray(aliases, 'aliases');

    const newAliases = Object.fromEntries(
      aliases.map((key) => [key, undefined]),
    );
    this.updateIdentityModel(newAliases);
  }

  public addEmail(email: string): void {
    logMethodCall('addEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(email, 'email');

    if (!isValidEmail(email)) throw MalformedArgumentError('email');

    addSubscriptionToModels({
      type: SubscriptionType.Email,
      token: email,
    });
  }

  public addSms(sms: string): void {
    logMethodCall('addSms', { sms });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(sms, 'sms');

    addSubscriptionToModels({
      type: SubscriptionType.SMS,
      token: sms,
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(email, 'email');

    const emailSubscriptions =
      OneSignal._coreDirector.getEmailSubscriptionModels();

    emailSubscriptions.forEach((model) => {
      if (model.token === email) {
        OneSignal._coreDirector.removeSubscriptionModel(model.modelId);
      }
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(smsNumber, 'smsNumber');

    const smsSubscriptions = OneSignal._coreDirector.getSmsSubscriptionModels();
    smsSubscriptions.forEach((model) => {
      if (model.token === smsNumber) {
        OneSignal._coreDirector.removeSubscriptionModel(model.modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(key, 'key');
    this.validateStringLabel(value, 'value');

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    if (isConsentRequiredButNotGiven()) return;

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    const newTags = { ...propertiesModel.tags, ...tags };
    propertiesModel.tags = newTags;
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(tagKey, 'tagKey');

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });
    if (isConsentRequiredButNotGiven()) return;

    this.validateArray(tagKeys, 'tagKeys');

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    const newTags = { ...propertiesModel.tags };

    // need to set the tag to an empty string to remove it
    tagKeys.forEach((tagKey) => {
      newTags[tagKey] = '';
    });
    propertiesModel.tags = newTags;
  }

  public getTags(): { [key: string]: string } {
    logMethodCall('getTags');
    return OneSignal._coreDirector._getPropertiesModel().tags;
  }

  public setLanguage(language: string): void {
    logMethodCall('setLanguage', { language });
    if (isConsentRequiredButNotGiven()) return;

    this.validateStringLabel(language, 'language');

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    propertiesModel.language = language;
  }

  public getLanguage(): string | undefined {
    logMethodCall('getLanguage');
    return OneSignal._coreDirector._getPropertiesModel().language;
  }

  public trackEvent(name: string, properties: Record<string, unknown> = {}) {
    if (isConsentRequiredButNotGiven()) return;

    // login operation / non-local onesignalId is needed to send custom events
    const onesignalId = OneSignal._coreDirector._getIdentityModel().onesignalId;
    if (IDManager._isLocalId(onesignalId) && !hasLoginOp(onesignalId)) {
      Log.error('User must be logged in first.');
      return;
    }

    if (!isObjectSerializable(properties)) {
      Log.error('Properties must be JSON-serializable');
      return;
    }
    logMethodCall('trackEvent', { name, properties });

    OneSignal._coreDirector.customEventController.sendCustomEvent({
      name,
      properties,
    });
  }
}

function hasLoginOp(onesignalId: string) {
  return OneSignal._coreDirector.operationRepo.queue.find(
    (op) =>
      op.operation instanceof LoginUserOperation &&
      op.operation.onesignalId === onesignalId,
  );
}

function addSubscriptionToModels({
  type,
  token,
}: {
  type: SubscriptionTypeValue;
  token: string;
}): void {
  const hasSubscription = OneSignal._coreDirector.subscriptionModelStore
    .list()
    .find((model) => model.token === token && model.type === type);
  if (hasSubscription) return;

  const identityModel = OneSignal._coreDirector._getIdentityModel();
  const onesignalId = identityModel.onesignalId;

  // Check if we need to enqueue a login operation for local IDs
  if (IDManager._isLocalId(onesignalId)) {
    const appId = MainHelper.getAppId();

    if (!hasLoginOp(onesignalId)) {
      OneSignal._coreDirector.operationRepo.enqueue(
        new LoginUserOperation(appId, onesignalId, identityModel.externalId),
      );
    }
  }

  const subscription = {
    id: IDManager._createLocalId(),
    enabled: true,
    notification_types: NotificationType.Subscribed,
    onesignalId,
    token,
    type,
  };

  const newSubscription = new SubscriptionModel();
  newSubscription.mergeData(subscription);
  OneSignal._coreDirector.addSubscriptionModel(newSubscription);
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
