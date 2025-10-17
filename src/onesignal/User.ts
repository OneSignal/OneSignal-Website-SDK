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
  static _singletonInstance?: User;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static _createOrGetInstance(): User {
    if (!User._singletonInstance) {
      User._singletonInstance = new User();
      const identityModel = OneSignal._coreDirector._getIdentityModel();
      const propertiesModel = OneSignal._coreDirector._getPropertiesModel();

      const onesignalId =
        identityModel._onesignalId ?? IDManager._createLocalId();
      if (!identityModel._onesignalId) {
        identityModel._setProperty(
          IdentityConstants.ONESIGNAL_ID,
          onesignalId,
          ModelChangeTags.NO_PROPAGATE,
        );
      }

      if (!propertiesModel._onesignalId) {
        propertiesModel._setProperty(
          'onesignalId',
          onesignalId,
          ModelChangeTags.NO_PROPAGATE,
        );
      }
    }

    return User._singletonInstance;
  }

  private _updateIdentityModel(aliases: {
    [key: string]: string | undefined;
  }): void {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    Object.keys(aliases).forEach((label) => {
      identityModel._setProperty(label, aliases[label]);
    });
  }

  /* PUBLIC API METHODS */
  get onesignalId(): string | undefined {
    const onesignalId =
      OneSignal._coreDirector._getIdentityModel()._onesignalId;
    return IDManager._isLocalId(onesignalId) ? undefined : onesignalId;
  }

  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(label, 'label');
    validateStringLabel(id, 'id');

    this.addAliases({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });
    if (isConsentRequiredButNotGiven()) return;

    validateObject(aliases, 'aliases');

    for (const label of Object.keys(aliases)) {
      validateStringLabel(aliases[label], `key: ${label}`);
      validateLabel(label, `key: ${label}`);
    }

    this._updateIdentityModel(aliases);
  }

  public removeAlias(label: string): void {
    logMethodCall('removeAlias', { label });
    if (isConsentRequiredButNotGiven()) return;

    this.removeAliases([label]);
  }

  public removeAliases(aliases: string[]): void {
    logMethodCall('removeAliases', { aliases });
    if (isConsentRequiredButNotGiven()) return;

    validateArray(aliases, 'aliases');

    const newAliases = Object.fromEntries(
      aliases.map((key) => [key, undefined]),
    );
    this._updateIdentityModel(newAliases);
  }

  public addEmail(email: string): void {
    logMethodCall('addEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(email, 'email');

    if (!isValidEmail(email)) throw MalformedArgumentError('email');

    addSubscriptionToModels({
      type: SubscriptionType.Email,
      token: email,
    });
  }

  public addSms(sms: string): void {
    logMethodCall('addSms', { sms });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(sms, 'sms');

    addSubscriptionToModels({
      type: SubscriptionType.SMS,
      token: sms,
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(email, 'email');

    const emailSubscriptions =
      OneSignal._coreDirector._getEmailSubscriptionModels();

    emailSubscriptions.forEach((model) => {
      if (model.token === email) {
        OneSignal._coreDirector._removeSubscriptionModel(model._modelId);
      }
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(smsNumber, 'smsNumber');

    const smsSubscriptions =
      OneSignal._coreDirector._getSmsSubscriptionModels();
    smsSubscriptions.forEach((model) => {
      if (model.token === smsNumber) {
        OneSignal._coreDirector._removeSubscriptionModel(model._modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(key, 'key');
    validateStringLabel(value, 'value');

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    if (isConsentRequiredButNotGiven()) return;

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    const newTags = { ...propertiesModel._tags, ...tags };
    propertiesModel._tags = newTags;
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(tagKey, 'tagKey');

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });
    if (isConsentRequiredButNotGiven()) return;

    validateArray(tagKeys, 'tagKeys');

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    const newTags = { ...propertiesModel._tags };

    // need to set the tag to an empty string to remove it
    tagKeys.forEach((tagKey) => {
      newTags[tagKey] = '';
    });
    propertiesModel._tags = newTags;
  }

  public getTags(): { [key: string]: string } {
    logMethodCall('getTags');
    return OneSignal._coreDirector._getPropertiesModel()._tags;
  }

  public setLanguage(language: string): void {
    logMethodCall('setLanguage', { language });
    if (isConsentRequiredButNotGiven()) return;

    validateStringLabel(language, 'language');

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    propertiesModel._language = language;
  }

  public getLanguage(): string | undefined {
    logMethodCall('getLanguage');
    return OneSignal._coreDirector._getPropertiesModel()._language;
  }

  public trackEvent(name: string, properties: Record<string, unknown> = {}) {
    if (isConsentRequiredButNotGiven()) return;

    // login operation / non-local onesignalId is needed to send custom events
    const onesignalId =
      OneSignal._coreDirector._getIdentityModel()._onesignalId;
    if (IDManager._isLocalId(onesignalId) && !hasLoginOp(onesignalId)) {
      Log._error('User must be logged in first.');
      return;
    }

    if (!isObjectSerializable(properties)) {
      Log._error('Properties must be JSON-serializable');
      return;
    }
    logMethodCall('trackEvent', { name, properties });

    OneSignal._coreDirector._customEventController._sendCustomEvent({
      name,
      properties,
    });
  }
}

function hasLoginOp(onesignalId: string) {
  return OneSignal._coreDirector._operationRepo._queue.find(
    (op) =>
      op.operation instanceof LoginUserOperation &&
      op.operation._onesignalId === onesignalId,
  );
}

function addSubscriptionToModels({
  type,
  token,
}: {
  type: SubscriptionTypeValue;
  token: string;
}): void {
  const hasSubscription = OneSignal._coreDirector._subscriptionModelStore
    .list()
    .find((model) => model.token === token && model.type === type);
  if (hasSubscription) return;

  const identityModel = OneSignal._coreDirector._getIdentityModel();
  const onesignalId = identityModel._onesignalId;

  // Check if we need to enqueue a login operation for local IDs
  if (IDManager._isLocalId(onesignalId)) {
    const appId = MainHelper._getAppId();

    if (!hasLoginOp(onesignalId)) {
      OneSignal._coreDirector._operationRepo._enqueue(
        new LoginUserOperation(appId, onesignalId, identityModel._externalId),
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
  newSubscription._mergeData(subscription);
  OneSignal._coreDirector._addSubscriptionModel(newSubscription);
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

function validateStringLabel(label: string, labelName: string): void {
  if (typeof label !== 'string') throw WrongTypeArgumentError(labelName);

  if (!label) throw EmptyArgumentError(labelName);
}

function validateArray(array: string[], arrayName: string): void {
  if (!Array.isArray(array)) throw WrongTypeArgumentError(arrayName);

  if (array.length === 0) throw EmptyArgumentError(arrayName);

  for (const label of array) {
    validateLabel(label, 'label');
  }
}

function validateObject(object: unknown, objectName: string): void {
  if (!isObject(object)) throw WrongTypeArgumentError(objectName);

  if (!object || Object.keys(object).length === 0)
    throw EmptyArgumentError(objectName);
}

function validateLabel(label: string, labelName: string): void {
  validateStringLabel(label, labelName);

  if (label === 'external_id' || label === 'onesignal_id') {
    throw ReservedArgumentError(label);
  }
}
