import { ONESIGNAL_ID, PUSH_TOKEN } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { IdentityConstants } from 'src/core/constants';
import { ModelChangeTags } from 'src/core/types/models';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import type { UserChangeEvent } from '../page/models/UserChangeEvent';
import { Subscription } from '../shared/models/Subscription';
import User from './User';
import UserNamespace from './UserNamespace';

const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => '');
const warnSpy = vi.spyOn(Log, '_warn').mockImplementation(() => '');
vi.useFakeTimers();

const setup = () => {
  TestEnvironment.initialize({});
  delete User._singletonInstance;
};

setup();
beforeEach(() => {
  setup();
});

describe('User Identity Properties', () => {
  test('should return correct onesignalId', () => {
    const userNamespace = new UserNamespace(true);

    updateIdentityModel('onesignal_id', undefined);
    expect(userNamespace.onesignalId).toBe(undefined);

    const localId = IDManager._createLocalId();
    updateIdentityModel('onesignal_id', localId);
    expect(userNamespace.onesignalId).toBe(undefined);

    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    expect(userNamespace.onesignalId).toBe(ONESIGNAL_ID);
  });

  test('should return correct externalId', () => {
    const userNamespace = new UserNamespace(true);
    const externalId = 'some-external-id';
    updateIdentityModel('external_id', externalId);

    expect(userNamespace.externalId).toBe(externalId);
  });
});

describe('Alias Management', () => {
  test('can add a single alias', () => {
    const userNamespace = new UserNamespace(true);
    const label = 'some-label';
    const id = 'some-id';

    userNamespace.addAlias(label, id);

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    expect(identityModel._getProperty(label)).toBe(id);
  });

  test('can add multiple aliases', () => {
    const userNamespace = new UserNamespace(true);
    const aliases = {
      someLabel: 'some-id',
      anotherLabel: 'another-id',
    };

    userNamespace.addAliases(aliases);

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    expect(identityModel._getProperty('someLabel')).toBe(aliases.someLabel);
    expect(identityModel._getProperty('anotherLabel')).toBe(
      aliases.anotherLabel,
    );
  });

  test('can remove a single alias', () => {
    const userNamespace = new UserNamespace(true);
    const label = 'some-label';
    const id = 'some-id';
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    // First add the alias
    userNamespace.addAlias(label, id);
    expect(identityModel._getProperty(label)).toBe(id);

    // Then remove it
    userNamespace.removeAlias(label);

    expect(identityModel._getProperty(label)).toBeUndefined();
  });

  test('can remove multiple aliases', () => {
    const userNamespace = new UserNamespace(true);
    const aliases = {
      someLabel: 'some-id',
      anotherLabel: 'another-id',
    };
    const identityModel = OneSignal._coreDirector._getIdentityModel();

    // First add the aliases
    userNamespace.addAliases(aliases);
    expect(identityModel._getProperty('someLabel')).toBe(aliases.someLabel);
    expect(identityModel._getProperty('anotherLabel')).toBe(
      aliases.anotherLabel,
    );

    // Then remove them
    userNamespace.removeAliases(Object.keys(aliases));

    expect(identityModel._getProperty('someLabel')).toBeUndefined();
    expect(identityModel._getProperty('anotherLabel')).toBeUndefined();
  });

  test('can validate add aliases', () => {
    const userNamespace = new UserNamespace(true);
    // wrong types
    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.addAlias(1234, '5678')).toThrowError(
      '"label" is the wrong type',
    );
    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.addAlias('some-label', 1234)).toThrowError(
      '"id" is the wrong type',
    );
    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.addAliases(['some-label'])).toThrowError(
      '"aliases" is the wrong type',
    );
    expect(() =>
      userNamespace.addAliases({
        // @ts-expect-error - mock invalid argument
        'some-label': 1234,
      }),
    ).toThrowError('"key: some-label" is the wrong type');

    // empty values
    expect(() => userNamespace.addAliases({})).toThrowError(
      '"aliases" is empty',
    );
    expect(() => userNamespace.addAlias('', 'some-id')).toThrowError(
      '"label" is empty',
    );
    expect(() => userNamespace.addAlias('some-label', '')).toThrowError(
      '"id" is empty',
    );

    // reserved aliases
    expect(() => userNamespace.addAlias('external_id', 'some-id')).toThrowError(
      '"external_id" is reserved',
    );
    expect(() =>
      userNamespace.addAlias('onesignal_id', 'some-id'),
    ).toThrowError('"onesignal_id" is reserved');
    expect(() =>
      userNamespace.addAliases({
        external_id: 'some-id',
      }),
    ).toThrowError('"external_id" is reserved');
    expect(() =>
      userNamespace.addAliases({
        onesignal_id: 'some-id',
      }),
    ).toThrowError('"onesignal_id" is reserved');
  });

  test('can validate remove aliases', () => {
    const userNamespace = new UserNamespace(true);
    // wrong types
    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.removeAliases(1234)).toThrowError(
      '"aliases" is the wrong type',
    );
    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.removeAlias(1234)).toThrowError(
      '"label" is the wrong type',
    );

    // empty values
    expect(() => userNamespace.removeAliases([])).toThrowError(
      '"aliases" is empty',
    );
    expect(() => userNamespace.removeAlias('')).toThrowError(
      '"label" is empty',
    );
  });
});

describe('Email Management', () => {
  const userNamespace = new UserNamespace(true);
  const getEmailSubscription = (email: string) => {
    const subscriptionModels =
      OneSignal._coreDirector._getEmailSubscriptionModels();
    return subscriptionModels.find((model) => model.token === email);
  };

  test('can add an email subscription', async () => {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    identityModel.onesignalId = IDManager._createLocalId();

    const email = 'test@example.com';
    const addSubscriptionSpy = vi.spyOn(
      OneSignal._coreDirector,
      '_addSubscriptionModel',
    );

    await userNamespace.addEmail(email);

    expect(addSubscriptionSpy).toHaveBeenCalled();
    const subscription = getEmailSubscription(email);
    expect(subscription).toBeDefined();
    expect(subscription?.token).toBe(email);
  });

  test('should remove an email subscription', async () => {
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    identityModel.onesignalId = IDManager._createLocalId();

    const email = 'test@example.com';

    // First add the email
    await userNamespace.addEmail(email);
    let subscription = getEmailSubscription(email);
    expect(subscription).toBeDefined();

    // Then remove it
    const removeSubscriptionSpy = vi.spyOn(
      OneSignal._coreDirector,
      '_removeSubscriptionModel',
    );
    userNamespace.removeEmail(email);

    expect(removeSubscriptionSpy).toHaveBeenCalled();
    subscription = getEmailSubscription(email);
    expect(subscription).toBeUndefined();
  });
});

describe('SMS Management', () => {
  const getSmsSubscription = (smsNumber: string) => {
    const subscriptionModels =
      OneSignal._coreDirector._getSmsSubscriptionModels();
    return subscriptionModels.find((model) => model.token === smsNumber);
  };

  test('should add an SMS subscription', async () => {
    const userNamespace = new UserNamespace(true);
    const identityModel = OneSignal._coreDirector._getIdentityModel();
    identityModel.onesignalId = IDManager._createLocalId();

    const smsNumber = '+15551234567';
    const addSubscriptionSpy = vi.spyOn(
      OneSignal._coreDirector,
      '_addSubscriptionModel',
    );

    await userNamespace.addSms(smsNumber);

    expect(addSubscriptionSpy).toHaveBeenCalled();
    const subscription = getSmsSubscription(smsNumber);
    expect(subscription).toBeDefined();
    expect(subscription?.token).toBe(smsNumber);
  });

  test('should remove an SMS subscription', async () => {
    const userNamespace = new UserNamespace(true);
    const smsNumber = '+15551234567';

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    identityModel.onesignalId = IDManager._createLocalId();

    // First add the SMS
    await userNamespace.addSms(smsNumber);
    let subscription = getSmsSubscription(smsNumber);
    expect(subscription).toBeDefined();

    // Then remove it
    const removeSubscriptionSpy = vi.spyOn(
      OneSignal._coreDirector,
      '_removeSubscriptionModel',
    );
    userNamespace.removeSms(smsNumber);

    expect(removeSubscriptionSpy).toHaveBeenCalled();
    subscription = getSmsSubscription(smsNumber);
    expect(subscription).toBeUndefined();
    expect(subscription?.token).toBe(undefined);
  });
});

describe('Tag Management', () => {
  test('should add a single tag', () => {
    const userNamespace = new UserNamespace(true);
    const key = 'test_tag';
    const value = 'test_value';

    userNamespace.addTag(key, value);

    expect(userNamespace.getTags()).toEqual({ [key]: value });
  });

  test('should add multiple tags', () => {
    const userNamespace = new UserNamespace(true);
    const tags = {
      tag1: 'value1',
      tag2: 'value2',
    };

    userNamespace.addTags(tags);

    expect(userNamespace.getTags()).toEqual(tags);
  });

  test('should remove a single tag', () => {
    const userNamespace = new UserNamespace(true);
    const tags = {
      tag1: 'value1',
      tag2: 'value2',
    };

    // First add tags
    userNamespace.addTags(tags);

    // Then remove one
    userNamespace.removeTag('tag1');

    expect(userNamespace.getTags()).toEqual({ tag1: '', tag2: 'value2' });
  });

  test('should remove multiple tags', () => {
    const userNamespace = new UserNamespace(true);
    const tags = {
      tag1: 'value1',
      tag2: 'value2',
      tag3: 'value3',
    };

    // First add tags
    userNamespace.addTags(tags);

    // Then remove multiple
    userNamespace.removeTags(['tag1', 'tag3']);

    expect(userNamespace.getTags()).toEqual({
      tag1: '',
      tag2: 'value2',
      tag3: '',
    });
  });

  test('should return empty object when no tags exist', () => {
    const userNamespace = new UserNamespace(true);
    expect(userNamespace.getTags()).toEqual({});
  });
});

describe('Language Management', () => {
  test('should set language', () => {
    const userNamespace = new UserNamespace(true);
    const language = 'fr';

    // @ts-expect-error - mock invalid argument
    expect(() => userNamespace.setLanguage(123)).toThrowError(
      '"language" is the wrong type',
    );

    userNamespace.setLanguage(language);
    expect(userNamespace.getLanguage()).toBe(language);
  });

  test('should get language', () => {
    const userNamespace = new UserNamespace(true);
    const language = 'es';
    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    propertiesModel.language = language;

    expect(userNamespace.getLanguage()).toBe(language);
  });

  test('should return empty string if language is not set', () => {
    const userNamespace = new UserNamespace(true);
    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    propertiesModel.language = undefined;

    expect(userNamespace.getLanguage()).toBe('');
  });
});

describe('Event Handling', () => {
  test('should add and trigger event listener', () => {
    const userNamespace = new UserNamespace(true);
    const mockListener = vi.fn();
    const event: UserChangeEvent = {
      current: {
        onesignalId: ONESIGNAL_ID,
        externalId: undefined,
      },
    };

    userNamespace.addEventListener('change', mockListener);
    UserNamespace._emitter.emit('change', event);

    expect(mockListener).toHaveBeenCalledWith(event);
  });

  test('should remove event listener', () => {
    const userNamespace = new UserNamespace(true);
    const mockListener = vi.fn();
    const event: UserChangeEvent = {
      current: {
        onesignalId: ONESIGNAL_ID,
        externalId: undefined,
      },
    };

    userNamespace.addEventListener('change', mockListener);
    userNamespace.removeEventListener('change', mockListener);
    UserNamespace._emitter.emit('change', event);

    expect(mockListener).not.toHaveBeenCalled();
  });
});

describe('Initialization', () => {
  test('should initialize PushSubscription when initialize is true', () => {
    const userNamespace = new UserNamespace(true);

    expect(userNamespace.PushSubscription).toBeDefined();
    expect(userNamespace['_currentUser']).toBeDefined();
  });

  test('should not initialize user when initialize is false', () => {
    const userNamespace = new UserNamespace(false);

    expect(userNamespace['_currentUser']).toBeUndefined();
  });

  test('should use provided subscription and permission when initializing', () => {
    const subscription = new Subscription();
    subscription.deviceId = 'device-123';
    subscription.subscriptionToken = PUSH_TOKEN;
    subscription.optedOut = false;
    subscription.createdAt = Date.now();

    const permission: NotificationPermission = 'granted';

    const customNamespace = new UserNamespace(true, subscription, permission);

    expect(customNamespace.PushSubscription).toBeDefined();
  });

  test('properties model should have onesignalId for existing user', () => {
    // with an existing onesignalId
    updateIdentityModel('onesignal_id', ONESIGNAL_ID);
    const user = new UserNamespace(true);
    expect(IDManager._isLocalId(user.onesignalId)).toBe(false);

    // identity and properties models should have the same onesignalId
    const onesignalId = user.onesignalId;

    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    expect(propertiesModel.onesignalId).toBe(onesignalId);
  });

  test('properties model should have onesignalId for new user', () => {
    // without an existing onesignalId
    updateIdentityModel(IdentityConstants.ONESIGNAL_ID, undefined);

    const user = new UserNamespace(true);
    expect(user.onesignalId).toBe(undefined); // since its local
    const onesignalId = OneSignal._coreDirector._getIdentityModel().onesignalId;
    expect(IDManager._isLocalId(onesignalId)).toBe(true);

    // identity and properties models should have the same onesignalId
    const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
    expect(propertiesModel.onesignalId).toBe(onesignalId);
  });
});

describe('Custom Events', () => {
  test('should call track event', () => {
    const userNamespace = new UserNamespace(true);
    const trackEventSpy = vi.spyOn(User.prototype, 'trackEvent');
    const name = 'test_event';
    const properties = {
      test_property: 'test_value',
    };

    updateIdentityModel('onesignal_id', IDManager._createLocalId());
    userNamespace.trackEvent(name, {});
    expect(errorSpy).toHaveBeenCalledWith('User must be logged in first.');
    errorSpy.mockClear();

    const identityModel = OneSignal._coreDirector._getIdentityModel();
    identityModel._setProperty(
      'onesignal_id',
      ONESIGNAL_ID,
      ModelChangeTags.NO_PROPAGATE,
    );

    // should validate properties
    // @ts-expect-error - mock invalid argument
    userNamespace.trackEvent(name, 123);
    expect(errorSpy).toHaveBeenCalledWith(
      'Properties must be JSON-serializable',
    );

    // big ints can't be serialized
    userNamespace.trackEvent(name, {
      data: 10n,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Properties must be JSON-serializable',
    );

    userNamespace.trackEvent(name, properties);
    expect(trackEventSpy).toHaveBeenCalledWith(name, properties);
  });
});

describe('Consent Required', () => {
  beforeEach(async () => {
    OneSignal.setConsentRequired(true);
    await OneSignal.setConsentGiven(false);
  });

  const expectConsentRequired = () => {
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
  };

  test('should not add/remove email if consent is required but not given', () => {
    const email = 'mail@mail.com';
    const user = new UserNamespace(true);
    user.addEmail(email);
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeEmail(email);
    expectConsentRequired();
  });

  test('should not add/remove SMS if consent is required but not given', () => {
    const smsNumber = '+15551234567';
    const user = new UserNamespace(true);

    user.addSms(smsNumber);
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeSms(smsNumber);
    expectConsentRequired();
  });

  test('should not add/remove tag(s) if consent is required but not given', () => {
    const user = new UserNamespace(true);
    user.addTag('test_tag', 'test_value');
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeTag('test_tag');
    expectConsentRequired();

    warnSpy.mockClear();
    user.addTags({ tag1: 'value1', tag2: 'value2' });
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeTags(['tag1', 'tag2']);
    expectConsentRequired();
  });

  test('should not set language if consent is required but not given', () => {
    const user = new UserNamespace(true);
    user.setLanguage('fr');
    expectConsentRequired();
  });

  test('should not add/remove alias if consent is required but not given', () => {
    const user = new UserNamespace(true);
    user.addAlias('test_label', 'test_value');
    expectConsentRequired();

    warnSpy.mockClear();
    user.addAliases({ test_label: 'test_value' });
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeAlias('test_label');
    expectConsentRequired();

    warnSpy.mockClear();
    user.removeAliases(['test_label']);
    expectConsentRequired();
  });

  test('should not track event if consent is required but not given', () => {
    const user = new UserNamespace(true);
    user.trackEvent('test_event');
    expectConsentRequired();
  });
});
