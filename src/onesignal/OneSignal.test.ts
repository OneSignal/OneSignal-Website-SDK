import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import { waitForOperations } from '__test__/support/helpers/executors';
import {
  addAliasFn,
  createSubscriptionFn,
  createUserFn,
  deleteAliasFn,
  deleteSubscriptionFn,
  getUserFn,
  mockPageStylesCss,
  mockServerConfig,
  setAddAliasError,
  setAddAliasResponse,
  setCreateSubscriptionResponse,
  setCreateUserResponse,
  setDeleteAliasResponse,
  setDeleteSubscriptionResponse,
  setGetUserResponse,
  setTransferSubscriptionResponse,
  setUpdateUserResponse,
  transferSubscriptionFn,
  updateUserFn,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { OperationQueueItem } from 'src/core/operationRepo/OperationRepo';
import { ICreateUserSubscription } from 'src/core/types/api';
import { ModelChangeTags } from 'src/core/types/models';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import Database, {
  IdentityItem,
  PropertiesItem,
  SubscriptionItem,
} from 'src/shared/services/Database';
import LocalStorage from 'src/shared/utils/LocalStorage';

const errorSpy = vi.spyOn(Log, 'error').mockImplementation(() => '');
const debugSpy = vi.spyOn(Log, 'debug');

const getIdentityItem = async () =>
  (await Database.get<IdentityItem[]>('identity'))[0];

const getPropertiesItem = async () =>
  (await Database.get<PropertiesItem[]>('properties'))[0];

const setupIdentity = async () => {
  await Database.put('identity', {
    modelId: '123',
    modelName: 'identity',
    onesignal_id: DUMMY_ONESIGNAL_ID,
  });
};

describe('OneSignal', () => {
  beforeAll(async () => {
    server.use(mockServerConfig(), mockPageStylesCss());
    const _onesignal = await TestEnvironment.initialize();
    window.OneSignal = _onesignal;

    await setupIdentity();

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

    const newPropertiesModel = new PropertiesModel();
    newPropertiesModel.onesignalId = DUMMY_ONESIGNAL_ID;
    window.OneSignal.coreDirector
      .getPropertiesModel()
      .initializeFromJson(newPropertiesModel.toJSON());
  });

  afterEach(async () => {
    await waitForOperations(); // flush operations
    await setupIdentity();
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

        await vi.waitUntil(() => deleteAliasFn.mock.calls.length === 1);
      });

      test('can delete multiple aliases from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');

        let identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBe('someId');
        expect(identityModel.getProperty('someLabel2')).toBe('someId2');

        await vi.waitUntil(async () => addAliasFn.mock.calls.length === 2);

        window.OneSignal.User.removeAlias('someLabel');
        window.OneSignal.User.removeAlias('someLabel2');

        await vi.waitUntil(async () => deleteAliasFn.mock.calls.length === 2);

        identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBeUndefined();
        expect(identityModel.getProperty('someLabel2')).toBeUndefined();
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
        setCreateSubscriptionResponse({
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
          sdk: '1',
          token: email,
          type: 'Email',
        };
        expect(createSubscriptionFn).toHaveBeenCalledWith({
          subscription,
        });

        // should also save the subscription to the IndexedDB
        let dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toEqual([
          {
            ...subscription,
            device_model: '',
            device_os: 56,
            id: expect.any(String),
            modelId: expect.any(String),
            modelName: 'subscriptions',
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: '1',
          },
        ]);

        // cant add the same email twice
        window.OneSignal.User.addEmail(email);
        expect(createSubscriptionFn).toHaveBeenCalledTimes(1);
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
        setCreateSubscriptionResponse({
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
          sdk: '1',
          token: sms,
          type: 'SMS',
        };
        expect(createSubscriptionFn).toHaveBeenCalledWith({
          subscription,
        });

        // should also save the subscription to the IndexedDB
        let dbSubscriptions = await getSmsSubscriptionDbItems();

        expect(dbSubscriptions).toEqual([
          {
            ...subscription,
            device_model: '',
            device_os: 56,
            id: expect.any(String),
            modelId: expect.any(String),
            modelName: 'subscriptions',
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: '1',
          },
        ]);

        // cant add the same sms twice
        window.OneSignal.User.addSms(sms);
        expect(createSubscriptionFn).toHaveBeenCalledTimes(1);
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

      beforeEach(async () => {
        setAddAliasResponse();
        addAliasFn.mockClear();

        await setupSubModelStore({
          id: DUMMY_SUBSCRIPTION_ID,
          token: 'abc123',
        });
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

        // TODO: add consent required test
        // if needing consent required
        LocalStorage.setConsentRequired(true);
        await window.OneSignal.login(externalId);
        await vi.waitUntil(() => errorSpy.mock.calls.length === 1);

        const error = errorSpy.mock.calls[0][1] as Error;
        expect(error.message).toBe(
          'Login: Consent required but not given, skipping login',
        );
      });

      test('can login with a new external id', async () => {
        setTransferSubscriptionResponse();
        let identityData = await getIdentityItem();
        await window.OneSignal.login(externalId);

        // should not change the identity in the IndexedDB right away
        expect(identityData).toEqual({
          modelId: expect.any(String),
          modelName: 'identity',
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
          external_id: externalId,
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: DUMMY_ONESIGNAL_ID,
        });

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.externalId).toBe(externalId);

        await waitForOperations();
        expect(transferSubscriptionFn).toHaveBeenCalled();
      });

      test('Login twice with same user -> only one call to identify user', async () => {
        setTransferSubscriptionResponse();
        await window.OneSignal.login(externalId);
        await window.OneSignal.login(externalId);

        expect(addAliasFn).toHaveBeenCalledTimes(1);
        expect(debugSpy).toHaveBeenCalledWith(
          'Login: External ID already set, skipping login',
        );
        await waitForOperations();
        expect(transferSubscriptionFn).toHaveBeenCalledTimes(1);
      });

      test('Login twice with different user -> logs in to second user', async () => {
        const newExternalId = 'jd-2';
        setCreateUserResponse({
          externalId: newExternalId,
        });
        setGetUserResponse({
          externalId: newExternalId,
        });
        setTransferSubscriptionResponse();

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
          subscriptions: [
            {
              id: DUMMY_SUBSCRIPTION_ID,
            },
          ],
        });

        await waitForOperations(3); // should call refresh user op
        expect(getUserFn).toHaveBeenCalledWith();

        const identityData = await getIdentityItem();
        expect(identityData).toEqual({
          external_id: newExternalId,
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: DUMMY_ONESIGNAL_ID,
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
          subscriptions: [
            {
              id: DUMMY_SUBSCRIPTION_ID,
            },
          ],
        });

        // calls refresh user
        await waitForOperations(4);

        // onesignal id should be changed
        const identityData = await getIdentityItem();
        expect(identityData).toEqual({
          external_id: externalId,
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: DUMMY_ONESIGNAL_ID_2,
        });

        // subscriptions should be kept
      });

      describe('subscription creation after login', () => {
        const email = 'test@example.com';
        const sms = '+1234567890';

        beforeEach(async () => {
          await Database.remove('subscriptions', DUMMY_SUBSCRIPTION_ID);

          setCreateSubscriptionResponse({
            response: {
              id: DUMMY_SUBSCRIPTION_ID_2,
              type: 'Email',
              token: email,
            },
          });

          setCreateUserResponse({
            onesignalId: DUMMY_ONESIGNAL_ID,
            externalId,
          });

          setGetUserResponse({
            onesignalId: DUMMY_ONESIGNAL_ID,
            externalId,
          });
        });

        test('login before adding email and sms - it should create subscriptions with the external ID', async () => {
          setTransferSubscriptionResponse();
          setGetUserResponse({
            onesignalId: DUMMY_ONESIGNAL_ID,
            externalId,
            subscriptions: [
              {
                id: DUMMY_SUBSCRIPTION_ID_2,
                type: 'Email',
                token: email,
              },
              {
                id: DUMMY_SUBSCRIPTION_ID_3,
                type: 'SMS',
                token: sms,
              },
            ],
          });

          await window.OneSignal.login(externalId);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: DUMMY_ONESIGNAL_ID,
          });

          window.OneSignal.User.addEmail(email);
          window.OneSignal.User.addSms(sms);

          await vi.waitUntil(
            () => createSubscriptionFn.mock.calls.length === 2,
          );

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: '1',
              token: email,
              type: 'Email',
            },
          });

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: '1',
              token: sms,
              type: 'SMS',
            },
          });

          const dbSubscriptions = (await Database.get(
            'subscriptions',
          )) as any[];
          expect(dbSubscriptions).toHaveLength(3);

          const emailSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'Email',
          );
          const smsSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'SMS',
          );

          expect(emailSubscriptions).toHaveLength(1);
          expect(emailSubscriptions[0].token).toBe(email);
          expect(emailSubscriptions[0].onesignalId).toBe(DUMMY_ONESIGNAL_ID);

          expect(smsSubscriptions).toHaveLength(1);
          expect(smsSubscriptions[0].token).toBe(sms);
          expect(smsSubscriptions[0].onesignalId).toBe(DUMMY_ONESIGNAL_ID);
        });

        test('login without accepting web push permissions - it should create a new user without any subscriptions', async () => {
          setCreateSubscriptionResponse({
            response: {
              id: DUMMY_SUBSCRIPTION_ID,
              type: 'ChromePush',
              token: DUMMY_PUSH_TOKEN,
            },
          });

          await Database.remove('subscriptions');

          const identityModel = OneSignal.coreDirector.getIdentityModel();
          identityModel.setProperty(
            'external_id',
            '',
            ModelChangeTags.NO_PROPOGATE,
          );
          identityModel.setProperty(
            'onesignal_id',
            '',
            ModelChangeTags.NO_PROPOGATE,
          );

          window.OneSignal.coreDirector.subscriptionModelStore.replaceAll(
            [],
            ModelChangeTags.NO_PROPOGATE,
          );
          await window.OneSignal.login(externalId);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: DUMMY_ONESIGNAL_ID,
          });

          await window.OneSignal.User.PushSubscription.optIn();

          expect(createUserFn).toHaveBeenCalledTimes(1);
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
        });

        test('login then add email, sms, and web push - all subscriptions should be created with the external ID', async () => {
          setTransferSubscriptionResponse();
          setGetUserResponse({
            onesignalId: DUMMY_ONESIGNAL_ID,
            externalId,
            subscriptions: [
              {
                id: DUMMY_SUBSCRIPTION_ID,
                type: 'ChromePush',
                token: DUMMY_PUSH_TOKEN,
              },
              {
                id: DUMMY_SUBSCRIPTION_ID_2,
                type: 'Email',
                token: email,
              },
              {
                id: DUMMY_SUBSCRIPTION_ID_3,
                type: 'SMS',
                token: sms,
              },
            ],
          });

          await window.OneSignal.login(externalId);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: DUMMY_ONESIGNAL_ID,
          });

          window.OneSignal.User.addEmail(email);
          window.OneSignal.User.addSms(sms);

          await vi.waitUntil(
            () => createSubscriptionFn.mock.calls.length === 2,
          );

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: '1',
              token: email,
              type: 'Email',
            },
          });

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: '1',
              token: sms,
              type: 'SMS',
            },
          });

          const dbSubscriptions = (await Database.get(
            'subscriptions',
          )) as any[];

          expect(dbSubscriptions).toHaveLength(3);

          const emailSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'Email',
          );
          const smsSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'SMS',
          );

          expect(emailSubscriptions).toHaveLength(1);
          expect(emailSubscriptions[0].token).toBe(email);
          expect(emailSubscriptions[0].onesignalId).toBe(DUMMY_ONESIGNAL_ID);

          expect(smsSubscriptions).toHaveLength(1);
          expect(smsSubscriptions[0].token).toBe(sms);
          expect(smsSubscriptions[0].onesignalId).toBe(DUMMY_ONESIGNAL_ID);
        });

        test('login with a prior web push subscription - it should transfer the subscription', async () => {
          const identityModel = OneSignal.coreDirector.getIdentityModel();
          identityModel.setProperty(
            'onesignal_id',
            '',
            ModelChangeTags.NO_PROPOGATE,
          );

          const dbSubscriptions = (await Database.get(
            'subscriptions',
          )) as any[];
          expect(dbSubscriptions).toHaveLength(1);

          await window.OneSignal.login(externalId);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: DUMMY_ONESIGNAL_ID,
          });

          expect(createUserFn).toHaveBeenCalledTimes(1);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            properties: {
              language: 'en',
              timezone_id: 'America/Los_Angeles',
            },
            refresh_device_metadata: true,
            subscriptions: [
              {
                id: DUMMY_SUBSCRIPTION_ID,
              },
            ],
          });
        });
      });
    });

    describe('logout', () => {
      test('should not do anything if user has no external id', async () => {
        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.externalId).toBeUndefined();

        window.OneSignal.logout();
        expect(debugSpy).toHaveBeenCalledWith(
          'Logout: User is not logged in, skipping logout',
        );
      });

      test('can logout the user with existing external id and subscription', async () => {
        const pushSub = await setupSubModelStore({
          id: DUMMY_SUBSCRIPTION_ID,
          token: 'abc123',
        });

        // existing user
        let identityModel = window.OneSignal.coreDirector.getIdentityModel();
        identityModel.setProperty(
          'external_id',
          'jd-1',
          ModelChangeTags.NO_PROPOGATE,
        );

        setCreateUserResponse({});

        window.OneSignal.logout();

        // identity model should be reset
        identityModel = window.OneSignal.coreDirector.getIdentityModel();
        const onesignalId = identityModel.onesignalId;
        expect(identityModel.toJSON()).toEqual({
          onesignal_id: expect.any(String),
        });
        expect(IDManager.isLocalId(onesignalId)).toBe(true);

        let identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: onesignalId,
          modelName: 'identity',
        });

        // properties model should be reset
        const propertiesModel =
          window.OneSignal.coreDirector.getPropertiesModel();
        expect(propertiesModel.toJSON()).toEqual({
          onesignalId,
        });

        let propertiesData = await getPropertiesItem();
        expect(propertiesData).toEqual({
          modelId: expect.any(String),
          modelName: 'properties',
          onesignalId,
        });

        await waitForOperations(3);

        // should update models and db
        identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.toJSON()).toEqual({
          onesignal_id: DUMMY_ONESIGNAL_ID,
        });

        identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: DUMMY_ONESIGNAL_ID,
        });

        propertiesData = await getPropertiesItem();
        expect(propertiesData).toEqual({
          modelId: expect.any(String),
          modelName: 'properties',
          onesignalId: DUMMY_ONESIGNAL_ID,
        });

        const subscriptions =
          await Database.get<SubscriptionItem[]>('subscriptions');
        expect(subscriptions).toEqual([
          {
            device_model: '',
            device_os: 56,
            enabled: true,
            id: pushSub.id,
            modelId: expect.any(String),
            modelName: 'subscriptions',
            notification_types: 1,
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: '1',
            token: pushSub.token,
            type: 'ChromePush',
          },
        ]);
      });
    });
  });

  test('should preserve operations order without needing await', async () => {
    await setupSubModelStore({
      id: DUMMY_SUBSCRIPTION_ID,
      token: 'def456',
    });
    setAddAliasResponse();
    setTransferSubscriptionResponse();
    setUpdateUserResponse();

    window.OneSignal.login('some-id');
    window.OneSignal.User.addTag('some-tag', 'some-value');
    const tags = window.OneSignal.User.getTags();

    let queue: OperationQueueItem[] = [];
    await vi.waitUntil(
      () => {
        queue = window.OneSignal.coreDirector.operationRepo.queue;
        return queue.length === 3;
      },
      { interval: 1 },
    );

    // its fine if login op is last since its the only one that can be executed
    const setPropertyOp = queue[0];
    expect(setPropertyOp.operation.name).toBe('set-property');
    const loginOp = queue[2];
    expect(loginOp.operation.name).toBe('login-user');

    // tags should still be sync
    expect(tags).toEqual({
      'some-tag': 'some-value',
    });

    // should set alias
    await vi.waitUntil(() => addAliasFn.mock.calls.length === 1, {
      interval: 1,
    });
    expect(addAliasFn).toHaveBeenCalledWith({
      identity: {
        external_id: 'some-id',
      },
    });
    expect(updateUserFn).not.toHaveBeenCalled();

    // should update user tags
    await vi.waitUntil(() => updateUserFn.mock.calls.length === 1, {
      interval: 1,
    });
    expect(updateUserFn).toHaveBeenCalledWith({
      properties: {
        tags: {
          'some-tag': 'some-value',
        },
      },
      refresh_device_metadata: false,
    });
  });
});
