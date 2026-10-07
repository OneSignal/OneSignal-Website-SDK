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
import { hasMissingEntries, hasMissingItems, isMissing } from 'src/shared/helpers/inputGuard';
import { getAppId } from 'src/shared/helpers/main';
import { isObject, isValidEmail } from 'src/shared/helpers/validators';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { NotificationType, SubscriptionType } from 'src/shared/subscriptions/constants';
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

      const onesignalId = identityModel._onesignalId ?? IDManager._createLocalId();
      if (!identityModel._onesignalId) {
        identityModel._setProperty(
          IdentityConstants._OneSignalID,
          onesignalId,
          ModelChangeTags._NoPropogate,
        );
      }

      if (!propertiesModel._onesignalId) {
        propertiesModel._setProperty('onesignalId', onesignalId, ModelChangeTags._NoPropogate);
      }
    }

    return User._singletonInstance;
  }

  private _updateIdentityModel(aliases: { [key: string]: string | undefined }): void {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    Object.keys(aliases).forEach((label) => {
      identityModel._setProperty(label, aliases[label]);
    });
  }

  /* PUBLIC API METHODS */
  get onesignalId(): string | undefined {
    const onesignalId = OneSignal._coreDirector._getIdentityModel()._onesignalId;
    return IDManager._isLocalId(onesignalId) ? undefined : onesignalId;
  }

  get externalId(): string | undefined {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    return identityModel?._externalId;
  }

  public addAlias(label: string, id: string): void {
    logMethodCall('addAlias', { label, id });
    if (isConsentRequiredButNotGiven()) return;

    if (
      !isValidAlias(label, 'label', 'addAlias: label', true) ||
      !isValidAlias(id, 'id', 'addAlias: id')
    ) {
      return;
    }

    this._updateIdentityModel({ [label]: id });
  }

  public addAliases(aliases: { [key: string]: string }): void {
    logMethodCall('addAliases', { aliases });
    if (isConsentRequiredButNotGiven()) return;

    validateObject(aliases, 'aliases');

    for (const label in aliases) {
      const name = `key: ${label}`;
      if (
        !isValidAlias(aliases[label], name, 'addAliases: value') ||
        !isValidAlias(label, name, 'addAliases: key', true)
      ) {
        return;
      }
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

    validateArray(aliases, 'aliases', 'label');
    for (const label of aliases) {
      if (!isValidAlias(label, 'label', 'removeAliases: label', true)) return;
    }

    const newAliases = Object.fromEntries(aliases.map((key) => [key, undefined]));
    this._updateIdentityModel(newAliases);
  }

  public addEmail(email: string): void {
    logMethodCall('addEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    validateString(email, 'email');
    if (isMissing(email, 'addEmail: email')) return;

    if (!isValidEmail(email)) throw MalformedArgumentError('email');

    addSubscriptionToModels({
      type: SubscriptionType._Email,
      token: email,
    });
  }

  public addSms(sms: string): void {
    logMethodCall('addSms', { sms });
    if (isConsentRequiredButNotGiven()) return;

    validateString(sms, 'sms');
    if (isMissing(sms, 'addSms: sms')) return;

    addSubscriptionToModels({
      type: SubscriptionType._SMS,
      token: sms,
    });
  }

  public removeEmail(email: string): void {
    logMethodCall('removeEmail', { email });
    if (isConsentRequiredButNotGiven()) return;

    validateString(email, 'email');
    if (isMissing(email, 'removeEmail: email')) return;

    const emailSubscriptions = OneSignal._coreDirector._getEmailSubscriptionModels();

    emailSubscriptions.forEach((model) => {
      if (model.token === email) {
        OneSignal._coreDirector._removeSubscriptionModel(model._modelId);
      }
    });
  }

  public removeSms(smsNumber: string): void {
    logMethodCall('removeSms', { smsNumber });
    if (isConsentRequiredButNotGiven()) return;

    validateString(smsNumber, 'smsNumber');
    if (isMissing(smsNumber, 'removeSms: smsNumber')) return;

    const smsSubscriptions = OneSignal._coreDirector._getSmsSubscriptionModels();
    smsSubscriptions.forEach((model) => {
      if (model.token === smsNumber) {
        OneSignal._coreDirector._removeSubscriptionModel(model._modelId);
      }
    });
  }

  public addTag(key: string, value: string): void {
    logMethodCall('addTag', { key, value });
    if (isConsentRequiredButNotGiven()) return;

    validateString(key, 'key');
    validateString(value, 'value');

    this.addTags({ [key]: value });
  }

  public addTags(tags: { [key: string]: string }): void {
    if (isConsentRequiredButNotGiven()) return;
    if (hasMissingEntries(tags, 'addTags', true)) return;

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    const newTags = { ...propertiesModel._tags, ...tags };
    propertiesModel._tags = newTags;
  }

  public removeTag(tagKey: string): void {
    logMethodCall('removeTag', { tagKey });
    if (isConsentRequiredButNotGiven()) return;

    this.removeTags([tagKey]);
  }

  public removeTags(tagKeys: string[]): void {
    logMethodCall('removeTags', { tagKeys });
    if (isConsentRequiredButNotGiven()) return;

    validateArray(tagKeys, 'tagKeys', 'tagKey');
    if (hasMissingItems(tagKeys, 'removeTags', 'key')) return;

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

    validateString(language, 'language');
    if (isMissing(language, 'setLanguage: language')) return;

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    propertiesModel._language = language;
  }

  public getLanguage(): string | undefined {
    logMethodCall('getLanguage');
    return OneSignal._coreDirector._getPropertiesModel()._language;
  }

  public trackEvent(name: string, properties: Record<string, unknown> = {}) {
    if (isConsentRequiredButNotGiven()) return;
    validateString(name, 'name');
    if (isMissing(name, 'trackEvent: name')) return;

    // login operation / non-local onesignalId is needed to send custom events
    const onesignalId = OneSignal._coreDirector._getIdentityModel()._onesignalId;
    if (IDManager._isLocalId(onesignalId) && !hasLoginOp(onesignalId)) {
      Log._error('User not logged in');
      return;
    }

    if (!isObjectSerializable(properties)) {
      Log._error('Properties not serializable');
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
    (op) => op.operation instanceof LoginUserOperation && op.operation._onesignalId === onesignalId,
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
    ._list()
    .find((model) => model.token === token && model.type === type);
  if (hasSubscription) return;

  const identityModel = OneSignal._coreDirector._getIdentityModel();
  const onesignalId = identityModel._onesignalId;

  // Check if we need to enqueue a login operation for local IDs
  if (IDManager._isLocalId(onesignalId)) {
    const appId = getAppId();

    if (!hasLoginOp(onesignalId)) {
      OneSignal._coreDirector._operationRepo._enqueue(
        new LoginUserOperation(appId, onesignalId, identityModel._externalId),
      );
    }
  }

  const subscription = {
    id: IDManager._createLocalId(),
    enabled: true,
    notification_types: NotificationType._Subscribed,
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
  } catch {
    return false;
  }
}

function validateString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw WrongTypeArgumentError(name);
}

function validateArray(array: unknown, name: string, itemName: string): asserts array is string[] {
  if (!Array.isArray(array)) throw WrongTypeArgumentError(name);
  if (array.length === 0) throw EmptyArgumentError(name);
  for (const item of array) validateString(item, itemName);
}

function validateObject(object: unknown, objectName: string): void {
  if (!isObject(object)) throw WrongTypeArgumentError(objectName);

  if (!object || Object.keys(object).length === 0) throw EmptyArgumentError(objectName);
}

// eslint-disable-next-line no-control-regex
const INVALID_ALIAS_PATTERN = /[/?#&=\s\x00-\x1F\x7F]|\.\./;

/**
 * Throws when [value] is not a string, is malformed, or is a reserved label.
 * Logs and returns false when it is missing, per [isMissing].
 */
function isValidAlias(value: unknown, name: string, api: string, isLabel = false): boolean {
  validateString(value, name);
  if (isMissing(value, api)) return false;
  if (value.length > 128 || INVALID_ALIAS_PATTERN.test(value)) throw MalformedArgumentError(name);
  if (isLabel && (value === 'external_id' || value === 'onesignal_id')) {
    throw ReservedArgumentError(value);
  }
  return true;
}
