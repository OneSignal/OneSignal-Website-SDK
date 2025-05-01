import {
  DUMMY_ONESIGNAL_ID,
  DUMMY_PUSH_TOKEN,
} from '__test__/support/constants';
import { TestEnvironment } from '../../__test__/support/environment/TestEnvironment';
import UserChangeEvent from '../page/models/UserChangeEvent';
import { Subscription } from '../shared/models/Subscription';
import User from './User';
import UserNamespace from './UserNamespace';

vi.mock('../shared/libraries/Log');

describe('UserNamespace', () => {
  let userNamespace: UserNamespace;

  beforeEach(async () => {
    await TestEnvironment.initialize({});

    userNamespace = new UserNamespace(true);
  });

  describe('User Identity Properties', () => {
    test('should return correct onesignalId', () => {
      const user = new User();
      user.onesignalId = DUMMY_ONESIGNAL_ID;

      vi.spyOn(User, 'createOrGetInstance').mockReturnValue(user);

      userNamespace = new UserNamespace(true);
      expect(userNamespace.onesignalId).toBe(DUMMY_ONESIGNAL_ID);
    });

    test('should return correct externalId', () => {
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      const externalId = 'some-external-id';
      identityModel.setProperty('external_id', externalId);

      expect(userNamespace.externalId).toBe(externalId);
    });
  });

  describe('Alias Management', () => {
    test('can add a single alias', () => {
      const label = 'some-label';
      const id = 'some-id';

      userNamespace.addAlias(label, id);

      const identityModel = OneSignal.coreDirector.getIdentityModel();
      expect(identityModel.getProperty(label)).toBe(id);
    });

    test('can add multiple aliases', () => {
      const aliases = {
        someLabel: 'some-id',
        anotherLabel: 'another-id',
      };

      userNamespace.addAliases(aliases);

      const identityModel = OneSignal.coreDirector.getIdentityModel();
      expect(identityModel.getProperty('someLabel')).toBe(aliases.someLabel);
      expect(identityModel.getProperty('anotherLabel')).toBe(
        aliases.anotherLabel,
      );
    });

    test('can remove a single alias', () => {
      const label = 'some-label';
      const id = 'some-id';
      const identityModel = OneSignal.coreDirector.getIdentityModel();

      // First add the alias
      userNamespace.addAlias(label, id);
      expect(identityModel.getProperty(label)).toBe(id);

      // Then remove it
      userNamespace.removeAlias(label);

      expect(identityModel.getProperty(label)).toBeUndefined();
    });

    test('can remove multiple aliases', () => {
      const aliases = {
        someLabel: 'some-id',
        anotherLabel: 'another-id',
      };
      const identityModel = OneSignal.coreDirector.getIdentityModel();

      // First add the aliases
      userNamespace.addAliases(aliases);
      expect(identityModel.getProperty('someLabel')).toBe(aliases.someLabel);
      expect(identityModel.getProperty('anotherLabel')).toBe(
        aliases.anotherLabel,
      );

      // Then remove them
      userNamespace.removeAliases(Object.keys(aliases));

      expect(identityModel.getProperty('someLabel')).toBeUndefined();
      expect(identityModel.getProperty('anotherLabel')).toBeUndefined();
    });
  });

  describe('Email Management', () => {
    const getEmailSubscription = (email: string) => {
      const subscriptionModels =
        OneSignal.coreDirector.getEmailSubscriptionModels();
      return subscriptionModels.find((model) => model.token === email);
    };

    test('can add an email subscription', async () => {
      const email = 'test@example.com';
      const addSubscriptionSpy = vi.spyOn(
        OneSignal.coreDirector,
        'addSubscriptionModel',
      );

      await userNamespace.addEmail(email);

      expect(addSubscriptionSpy).toHaveBeenCalled();
      const subscription = getEmailSubscription(email);
      expect(subscription).toBeDefined();
      expect(subscription?.token).toBe(email);
    });

    test('should remove an email subscription', async () => {
      const email = 'test@example.com';

      // First add the email
      await userNamespace.addEmail(email);
      let subscription = getEmailSubscription(email);
      expect(subscription).toBeDefined();

      // Then remove it
      const removeSubscriptionSpy = vi.spyOn(
        OneSignal.coreDirector,
        'removeSubscriptionModel',
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
        OneSignal.coreDirector.getSmsSubscriptionModels();
      return subscriptionModels.find((model) => model.token === smsNumber);
    };

    test('should add an SMS subscription', async () => {
      const smsNumber = '+15551234567';
      const addSubscriptionSpy = vi.spyOn(
        OneSignal.coreDirector,
        'addSubscriptionModel',
      );

      await userNamespace.addSms(smsNumber);

      expect(addSubscriptionSpy).toHaveBeenCalled();
      const subscription = getSmsSubscription(smsNumber);
      expect(subscription).toBeDefined();
      expect(subscription?.token).toBe(smsNumber);
    });

    test('should remove an SMS subscription', async () => {
      const smsNumber = '+15551234567';

      // First add the SMS
      await userNamespace.addSms(smsNumber);
      let subscription = getSmsSubscription(smsNumber);
      expect(subscription).toBeDefined();

      // Then remove it
      const removeSubscriptionSpy = vi.spyOn(
        OneSignal.coreDirector,
        'removeSubscriptionModel',
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
      const key = 'test_tag';
      const value = 'test_value';

      userNamespace.addTag(key, value);

      expect(userNamespace.getTags()).toEqual({ [key]: value });
    });

    test('should add multiple tags', () => {
      const tags = {
        tag1: 'value1',
        tag2: 'value2',
      };

      userNamespace.addTags(tags);

      expect(userNamespace.getTags()).toEqual(tags);
    });

    test('should remove a single tag', () => {
      const tags = {
        tag1: 'value1',
        tag2: 'value2',
      };

      // First add tags
      userNamespace.addTags(tags);

      // Then remove one
      userNamespace.removeTag('tag1');

      expect(userNamespace.getTags()).toEqual({ tag2: 'value2' });
    });

    test('should remove multiple tags', () => {
      const tags = {
        tag1: 'value1',
        tag2: 'value2',
        tag3: 'value3',
      };

      // First add tags
      userNamespace.addTags(tags);

      // Then remove multiple
      userNamespace.removeTags(['tag1', 'tag3']);

      expect(userNamespace.getTags()).toEqual({ tag2: 'value2' });
    });

    test('should return empty object when no tags exist', () => {
      expect(userNamespace.getTags()).toEqual({});
    });
  });

  describe('Language Management', () => {
    test('should set language', () => {
      const language = 'fr';

      userNamespace.setLanguage(language);

      expect(userNamespace.getLanguage()).toBe(language);
    });

    test('should get language', () => {
      const language = 'es';
      const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
      propertiesModel.language = language;

      expect(userNamespace.getLanguage()).toBe(language);
    });

    test('should return empty string if language is not set', () => {
      const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
      propertiesModel.language = undefined;

      expect(userNamespace.getLanguage()).toBe('');
    });
  });

  describe('Event Handling', () => {
    test('should add and trigger event listener', () => {
      const mockListener = vi.fn();
      const event: UserChangeEvent = {
        current: {
          onesignalId: DUMMY_ONESIGNAL_ID,
          externalId: undefined,
        },
      };

      userNamespace.addEventListener('change', mockListener);
      UserNamespace.emitter.emit('change', event);

      expect(mockListener).toHaveBeenCalledWith(event);
    });

    test('should remove event listener', () => {
      const mockListener = vi.fn();
      const event: UserChangeEvent = {
        current: {
          onesignalId: DUMMY_ONESIGNAL_ID,
          externalId: undefined,
        },
      };

      userNamespace.addEventListener('change', mockListener);
      userNamespace.removeEventListener('change', mockListener);
      UserNamespace.emitter.emit('change', event);

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Initialization', () => {
    test('should initialize PushSubscription when initialize is true', () => {
      const initializedNamespace = new UserNamespace(true);

      expect(initializedNamespace.PushSubscription).toBeDefined();
      expect(initializedNamespace['_currentUser']).toBeDefined();
    });

    test('should not initialize user when initialize is false', () => {
      const uninitializedNamespace = new UserNamespace(false);

      expect(uninitializedNamespace['_currentUser']).toBeUndefined();
    });

    test('should use provided subscription and permission when initializing', () => {
      const subscription = new Subscription();
      subscription.deviceId = 'device-123';
      subscription.subscriptionToken = DUMMY_PUSH_TOKEN;
      subscription.optedOut = false;
      subscription.createdAt = Date.now();

      const permission: NotificationPermission = 'granted';

      const customNamespace = new UserNamespace(true, subscription, permission);

      expect(customNamespace.PushSubscription).toBeDefined();
    });
  });
});
