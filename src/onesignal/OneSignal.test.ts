import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { waitForOperations } from '__test__/support/helpers/executors';
import {
  addAliasFn,
  createUserFn,
  deleteAliasFn,
  deleteSubscriptionFn,
  getUserFn,
  mockPageStylesCss,
  mockServerConfig,
  setAddAliasError,
  setAddAliasResponse,
  setCreateUserResponse,
  setDeleteAliasResponse,
  setDeleteSubscriptionResponse,
  setGetUserResponse,
  setSubscriptionFn,
  setSubscriptionResponse,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { ICreateUserSubscription } from 'src/core/types/api';
import Log from 'src/shared/libraries/Log';
import Database, {
  IdentityItem,
  SubscriptionItem,
} from 'src/shared/services/Database';
import LocalStorage from 'src/shared/utils/LocalStorage';

const debugSpy = vi.spyOn(Log, 'debug');

describe('OneSignal', () => {
  beforeAll(async () => {
    server.use(mockServerConfig(), mockPageStylesCss());
    const _onesignal = await TestEnvironment.initialize();
    window.OneSignal = _onesignal;

    await Database.put('identity', {
      modelId: '123',
      onesignal_id: DUMMY_ONESIGNAL_ID,
    });
    await window.OneSignal.init({ appId: APP_ID });
  });

  beforeEach(async () => {
    LocalStorage.setConsentRequired(false);

    // reset the identity model
    const newIdentityModel = new IdentityModel();
    newIdentityModel.onesignalId = DUMMY_ONESIGNAL_ID;
    window.OneSignal.coreDirector
      .getIdentityModel()
      .initializeFromJson(newIdentityModel.toJSON());
  });

  describe('User', () => {
    describe('aliases', () => {
      beforeEach(() => {
        setAddAliasResponse();
        addAliasFn.mockClear();
        deleteAliasFn.mockClear();
      });

      test('can add an alias to the current user', async () => {
        window.OneSignal.User.addAlias('someLabel', 'someId');
        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBe('someId');

        // should make a request to the backend
        await waitForOperations(3);
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel: 'someId',
          },
        });
      });

      test('can add multiple aliases to the current user', async () => {
        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBe('someId');
        expect(identityModel.getProperty('someLabel2')).toBe('someId2');

        await waitForOperations(4);
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel: 'someId',
          },
        });
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel2: 'someId2',
          },
        });
      });

      test('can delete an alias from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        await waitForOperations();
        window.OneSignal.User.removeAlias('someLabel');

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBeUndefined();

        await waitForOperations(3);
        expect(deleteAliasFn).toHaveBeenCalled();
      });

      test('can delete multiple aliases from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');
        await waitForOperations();
        window.OneSignal.User.removeAlias('someLabel');
        window.OneSignal.User.removeAlias('someLabel2');

        await waitForOperations(4);
        expect(deleteAliasFn).toHaveBeenCalledTimes(2);
      });
    });

    describe('email', () => {
      const email = 'test@test.com';

      const getEmailSubscriptionDbItems = async () =>
        (await Database.get<SubscriptionItem[]>('subscriptions')).filter(
          (s) => s.type === 'Email',
        );

      beforeEach(() => {
        // id not returned for sms or email
        setSubscriptionResponse({
          response: {},
        });
        setGetUserResponse({
          onesignalId: DUMMY_ONESIGNAL_ID,
          subscriptions: [
            {
              id: DUMMY_SUBSCRIPTION_ID_2,
              token: 'test@test.com',
              type: 'Email',
              device_os: 56,
              device_model: '',
              sdk: '1',
              enabled: true,
              notification_types: 1,
            },
          ],
        });
      });

      test('can add an email subscription to the current user', async () => {
        window.OneSignal.User.addEmail(email);
        await waitForOperations(3);

        // should make a request to the backend
        const subscription: ICreateUserSubscription = {
          enabled: true,
          notification_types: 1,
          token: email,
          type: 'Email',
        };
        expect(setSubscriptionFn).toHaveBeenCalledWith({
          subscription,
        });

        // should also save the subscription to the IndexedDB
        let dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toEqual([
          {
            modelId: expect.any(String),
            id: expect.any(String),
            ...subscription,
            device_os: 56,
            device_model: '',
            sdk: '1',
          },
        ]);

        // cant add the same email twice
        window.OneSignal.User.addEmail(email);
        expect(setSubscriptionFn).toHaveBeenCalledTimes(1);
        await waitForOperations(1);
        dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toMatchObject([
          {
            modelId: expect.any(String),
            id: DUMMY_SUBSCRIPTION_ID_2,
            ...subscription,
          },
        ]);
      });

      test('can remove an email subscription from the current user', async () => {
        setDeleteSubscriptionResponse({
          subscriptionId: DUMMY_SUBSCRIPTION_ID_2,
        });
        const email = 'test@test.com';
        window.OneSignal.User.addEmail(email);
        let dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(1);

        await waitForOperations(6);
        window.OneSignal.User.removeEmail(email);
        await waitForOperations(4);

        expect(deleteSubscriptionFn).toHaveBeenCalled();
        dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(0);
      });
    });

    describe('sms', () => {
      const sms = '+1234567890';
      const getSmsSubscriptionDbItems = async () =>
        (await Database.get<SubscriptionItem[]>('subscriptions')).filter(
          (s) => s.type === 'SMS',
        );

      beforeEach(() => {
        // id not returned for sms or email
        setSubscriptionResponse({
          response: {},
        });
        setGetUserResponse({
          onesignalId: DUMMY_ONESIGNAL_ID,
          subscriptions: [
            {
              id: DUMMY_SUBSCRIPTION_ID_3,
              token: sms,
              type: 'SMS',
              device_os: 56,
              device_model: '',
              sdk: '1',
            },
          ],
        });
      });

      test('can add an sms subscription to the current user', async () => {
        window.OneSignal.User.addSms(sms);
        await waitForOperations(3);

        // should make a request to the backend
        const subscription: ICreateUserSubscription = {
          enabled: true,
          notification_types: 1,
          token: sms,
          type: 'SMS',
        };
        expect(setSubscriptionFn).toHaveBeenCalledWith({
          subscription,
        });

        // should also save the subscription to the IndexedDB
        let dbSubscriptions = await getSmsSubscriptionDbItems();

        expect(dbSubscriptions).toEqual([
          {
            modelId: expect.any(String),
            id: expect.any(String),
            ...subscription,
            device_os: 56,
            device_model: '',
            sdk: '1',
          },
        ]);

        // cant add the same sms twice
        window.OneSignal.User.addSms(sms);
        expect(setSubscriptionFn).toHaveBeenCalledTimes(1);
        await waitForOperations(1);

        dbSubscriptions = await getSmsSubscriptionDbItems();
        expect(dbSubscriptions).toMatchObject([
          {
            modelId: expect.any(String),
            id: DUMMY_SUBSCRIPTION_ID_3,
            ...subscription,
          },
        ]);
      });

      test('can remove an sms subscription from the current user', async () => {
        setDeleteSubscriptionResponse({
          subscriptionId: DUMMY_SUBSCRIPTION_ID_3,
        });
        window.OneSignal.User.addSms(sms);
        let dbSubscriptions = await getSmsSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(1);

        await waitForOperations(6);
        window.OneSignal.User.removeSms(sms);
        await waitForOperations(4);

        dbSubscriptions = await getSmsSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(0);
      });
    });

    describe('login', () => {
      const externalId = 'jd-1';
      const getIdentityItem = async () =>
        (await Database.get<IdentityItem[]>('identity'))[0];

      beforeEach(() => {
        setAddAliasResponse();
      });

      test('should validate external id', async () => {
        // @ts-expect-error - testing invalid argument
        await expect(window.OneSignal.login()).rejects.toThrowError(
          "Supply a non-empty value to 'externalId'.",
        );

        // @ts-expect-error - testing invalid argument
        await expect(window.OneSignal.login(null)).rejects.toThrowError(
          "The value for 'externalId' was of the wrong type.",
        );

        // @ts-expect-error - testing invalid argument
        await expect(window.OneSignal.login('', 1)).rejects.toThrowError(
          "The value for 'jwtToken' was of the wrong type.",
        );

        // if needing consent required
        LocalStorage.setConsentRequired(true);
        await expect(window.OneSignal.login(externalId)).rejects.toThrowError(
          'Login: Consent required but not given, skipping login',
        );
      });

      test('can login with a new external id', async () => {
        let identityData = await getIdentityItem();
        await window.OneSignal.login(externalId);

        // should not change the identity in the IndexedDB right away
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: DUMMY_ONESIGNAL_ID,
        });

        // wait for login user operation to complete
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            external_id: externalId,
          },
        });

        // should also update the identity in the IndexedDB
        identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: DUMMY_ONESIGNAL_ID,
          external_id: externalId,
        });

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.externalId).toBe(externalId);
      });

      test('Login twice with same user -> only one call to identify user', async () => {
        await window.OneSignal.login(externalId);
        await window.OneSignal.login(externalId);

        expect(addAliasFn).toHaveBeenCalledTimes(1);
        expect(debugSpy).toHaveBeenCalledWith(
          'Login: External ID already set, skipping login',
        );
      });

      test('Login twice with different user -> logs in to second user', async () => {
        const newExternalId = 'jd-2';
        setCreateUserResponse({
          externalId: newExternalId,
        });
        setGetUserResponse({
          externalId: newExternalId,
        });

        await window.OneSignal.login(externalId); // should call set alias
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            external_id: externalId,
          },
        });

        await window.OneSignal.login(newExternalId); // should call create user
        expect(createUserFn).toHaveBeenCalledWith({
          identity: {
            external_id: newExternalId,
          },
          properties: {
            language: 'en',
            timezone_id: 'America/Los_Angeles',
          },
          refresh_device_metadata: true,
          subscriptions: [],
        });

        await waitForOperations(3); // should call refresh user op
        expect(getUserFn).toHaveBeenCalledWith();

        const identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: DUMMY_ONESIGNAL_ID,
          external_id: newExternalId,
        });

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.externalId).toBe(newExternalId);
      });

      test('Login conflict should keep old subscriptions', async () => {
        setAddAliasError({
          status: 409,
        });
        setCreateUserResponse({});
        setGetUserResponse({
          onesignalId: DUMMY_ONESIGNAL_ID,
          newOnesignalId: DUMMY_ONESIGNAL_ID_2,
          externalId,
          subscriptions: [
            {
              id: DUMMY_SUBSCRIPTION_ID_2,
              type: 'ChromePush',
              token: 'def456',
            },
          ],
        });
        await Database.put('subscriptions', {
          modelId: '1234',
          id: DUMMY_SUBSCRIPTION_ID,
          type: 'ChromePush',
          token: 'abc123',
        });

        // calls create user with empty subscriptions
        await window.OneSignal.login(externalId);
        expect(createUserFn).toHaveBeenCalledWith({
          identity: {
            external_id: externalId,
          },
          properties: {
            language: 'en',
            timezone_id: 'America/Los_Angeles',
          },
          refresh_device_metadata: true,
          subscriptions: [],
        });

        // calls refresh user
        await waitForOperations(3);

        // onesignal id should be changed
        const identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: DUMMY_ONESIGNAL_ID_2,
          external_id: externalId,
        });

        // subscriptions should be kept
        const dbSubscriptions = await Database.get('subscriptions');
        expect(dbSubscriptions).toMatchObject([
          { id: DUMMY_SUBSCRIPTION_ID, type: 'ChromePush', token: 'abc123' },
        ]);
      });
    });
  });
});
