import {
  APP_ID,
  DEVICE_OS,
  DUMMY_ONESIGNAL_ID,
  DUMMY_ONESIGNAL_ID_2,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
  DUMMY_SUBSCRIPTION_ID_2,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/constants';
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
  sendCustomEventFn,
  setAddAliasError,
  setAddAliasResponse,
  setCreateSubscriptionResponse,
  setCreateUserResponse,
  setDeleteAliasResponse,
  setDeleteSubscriptionResponse,
  setGetUserResponse,
  setSendCustomEventResponse,
  setTransferSubscriptionResponse,
  setUpdateSubscriptionResponse,
  setUpdateUserResponse,
  transferSubscriptionFn,
  updateUserFn,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { OperationQueueItem } from 'src/core/operationRepo/OperationRepo';
import { type ICreateUserSubscription } from 'src/core/types/api';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import type {
  IndexedDBSchema,
  SubscriptionSchema,
} from 'src/shared/database/types';
import { setConsentRequired } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';

const errorSpy = vi.spyOn(Log, 'error').mockImplementation(() => '');
const debugSpy = vi.spyOn(Log, 'debug');

type IdentityItem = IndexedDBSchema['identity']['value'];

const getIdentityItem = async (
  condition: (identity: IdentityItem) => boolean = () => true,
) => {
  let identity: IdentityItem | undefined;
  await vi.waitUntil(async () => {
    identity = (await db.getAll('identity'))?.[0];
    return identity && condition(identity);
  });
  return identity;
};

const getPropertiesItem = async () => (await db.getAll('properties'))?.[0];

const setupIdentity = async () => {
  await db.put('identity', {
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
    setConsentRequired(false);

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
    window.OneSignal.coreDirector.operationRepo.queue = [];
    await db.clear('operations');
    window.OneSignal.coreDirector.subscriptionModelStore.replaceAll(
      [],
      ModelChangeTags.HYDRATE,
    );
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
        (await db.getAll<'subscriptions'>('subscriptions')).filter(
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
              device_os: DEVICE_OS,
              device_model: '',
              sdk: __VERSION__,
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
          sdk: __VERSION__,
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
            device_os: DEVICE_OS,
            id: expect.any(String),
            modelId: expect.any(String),
            modelName: 'subscriptions',
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: __VERSION__,
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

        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);
        window.OneSignal.User.removeEmail(email);

        await vi.waitUntil(() => deleteSubscriptionFn.mock.calls.length === 1);
        dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(0);
      });
    });

    describe('sms', () => {
      const sms = '+1234567890';
      const getSmsSubscriptionDbItems = async (length: number) => {
        let subscriptions: SubscriptionSchema[] = [];
        await vi.waitUntil(async () => {
          subscriptions = (
            await db.getAll<'subscriptions'>('subscriptions')
          ).filter((s) => s.type === 'SMS');
          return subscriptions.length === length;
        });
        return subscriptions;
      };

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
              device_os: DEVICE_OS,
              device_model: '',
              sdk: __VERSION__,
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
          sdk: __VERSION__,
          token: sms,
          type: 'SMS',
        };
        expect(createSubscriptionFn).toHaveBeenCalledWith({
          subscription,
        });

        // should also save the subscription to the IndexedDB
        let dbSubscriptions = await getSmsSubscriptionDbItems(1);

        expect(dbSubscriptions).toEqual([
          {
            ...subscription,
            device_model: '',
            device_os: DEVICE_OS,
            id: expect.any(String),
            modelId: expect.any(String),
            modelName: 'subscriptions',
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: __VERSION__,
          },
        ]);

        // cant add the same sms twice
        window.OneSignal.User.addSms(sms);
        expect(createSubscriptionFn).toHaveBeenCalledTimes(1);
        await waitForOperations(2);

        dbSubscriptions = await getSmsSubscriptionDbItems(1);
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
        await getSmsSubscriptionDbItems(1);

        window.OneSignal.User.removeSms(sms);

        await getSmsSubscriptionDbItems(0);
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
          '"externalId" is empty',
        );

        // @ts-expect-error - testing invalid argument
        await expect(window.OneSignal.login(null)).rejects.toThrowError(
          '"externalId" is the wrong type',
        );

        // @ts-expect-error - testing invalid argument
        await expect(window.OneSignal.login('', 1)).rejects.toThrowError(
          '"jwtToken" is the wrong type',
        );

        // TODO: add consent required test
        // if needing consent required
        setConsentRequired(true);
        await window.OneSignal.login(externalId);
        await vi.waitUntil(() => errorSpy.mock.calls.length === 1);

        const error = errorSpy.mock.calls[0][1] as Error;
        expect(error.message).toBe('Consent required but not given');
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
        identityData = await getIdentityItem(
          (i) => i.onesignal_id === DUMMY_ONESIGNAL_ID,
        );
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
        // onesignal id should be changed
        const identityData = await getIdentityItem(
          (i) => i.onesignal_id === DUMMY_ONESIGNAL_ID_2,
        );
        expect(identityData).toEqual({
          external_id: externalId,
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: DUMMY_ONESIGNAL_ID_2,
        });
      });

      describe('subscription creation after login', () => {
        const email = 'test@example.com';
        const sms = '+1234567890';

        beforeEach(async () => {
          await db.delete('subscriptions', DUMMY_SUBSCRIPTION_ID);

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
              sdk: __VERSION__,
              token: email,
              type: 'Email',
            },
          });

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: __VERSION__,
              token: sms,
              type: 'SMS',
            },
          });

          let dbSubscriptions: SubscriptionSchema[] = [];
          await vi.waitUntil(async () => {
            dbSubscriptions = await db.getAll<'subscriptions'>('subscriptions');
            return dbSubscriptions.length === 3;
          });

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

          await db.clear('subscriptions');

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
          setUpdateSubscriptionResponse();
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
              sdk: __VERSION__,
              token: email,
              type: 'Email',
            },
          });

          expect(createSubscriptionFn).toHaveBeenCalledWith({
            subscription: {
              enabled: true,
              notification_types: 1,
              sdk: __VERSION__,
              token: sms,
              type: 'SMS',
            },
          });

          await waitForOperations(5);

          let dbSubscriptions: SubscriptionSchema[] = [];
          await vi.waitUntil(async () => {
            dbSubscriptions = await db.getAll<'subscriptions'>('subscriptions');
            return dbSubscriptions.length === 3;
          });

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

          let dbSubscriptions: SubscriptionSchema[] = [];
          await vi.waitUntil(async () => {
            dbSubscriptions = await db.getAll<'subscriptions'>('subscriptions');
            return dbSubscriptions.length === 1;
          });

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
        setUpdateSubscriptionResponse();

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

        const subscriptions = await db.getAll('subscriptions');
        expect(subscriptions).toEqual([
          {
            device_model: '',
            device_os: DEVICE_OS,
            enabled: true,
            id: pushSub.id,
            modelId: expect.any(String),
            modelName: 'subscriptions',
            notification_types: 1,
            onesignalId: DUMMY_ONESIGNAL_ID,
            sdk: __VERSION__,
            token: pushSub.token,
            type: 'ChromePush',
          },
        ]);
      });
    });
  });

  describe('Custom Events', () => {
    const name = 'test_event';
    const properties = {
      test_property: 'test_value',
    };
    const OS_SDK = {
      sdk: __VERSION__,
      device_model: '',
      device_os: DEVICE_OS,
      type: 'ChromePush',
    };

    const getQueue = async (length: number) => {
      const queue = await vi.waitUntil(
        () => {
          const _queue = window.OneSignal.coreDirector.operationRepo.queue;
          return _queue.length === length ? _queue : null;
        },
        { interval: 0 },
      );
      return queue;
    };

    test('can send a custom event', async () => {
      setSendCustomEventResponse();

      OneSignal.coreDirector
        .getIdentityModel()
        .setProperty('external_id', 'some-id', ModelChangeTags.NO_PROPOGATE);
      window.OneSignal.User.trackEvent(name);

      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1);

      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            name,
            external_id: 'some-id',
            onesignal_id: DUMMY_ONESIGNAL_ID,
            payload: {
              os_sdk: OS_SDK,
            },
            timestamp: expect.any(String),
          },
        ],
      });
    });

    test('can send a custom event after login', async () => {
      setCreateUserResponse({});
      setGetUserResponse({
        onesignalId: DUMMY_ONESIGNAL_ID,
        externalId: 'some-id',
      });
      setSendCustomEventResponse();

      const identityModel = window.OneSignal.coreDirector.getIdentityModel();
      identityModel.setProperty(
        'external_id',
        'some-id',
        ModelChangeTags.NO_PROPOGATE,
      );

      window.OneSignal.login('some-id-2');
      window.OneSignal.User.trackEvent(name, properties);

      const queue = await getQueue(2);

      // login and custom event should have matching id (via UserDirector reset user models)
      const newLocalId = queue[0].operation.onesignalId;
      expect(queue[1].operation.onesignalId).toBe(newLocalId);

      // should translate ids for the custom event
      await vi.waitUntil(() => createUserFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(sendCustomEventFn).not.toHaveBeenCalled();

      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            external_id: 'some-id-2',
            name,
            onesignal_id: DUMMY_ONESIGNAL_ID,
            payload: {
              ...properties,
              os_sdk: OS_SDK,
            },
            timestamp: expect.any(String),
          },
        ],
      });
    });

    test('custom event can execute before login for an existing user w/ no external id', async () => {
      setAddAliasResponse();
      setSendCustomEventResponse();

      window.OneSignal.User.trackEvent('test_event_1', {
        test_property_1: 'test_value_1',
      });
      window.OneSignal.login('some-id');
      window.OneSignal.User.trackEvent('test_event_2', {
        test_property_2: 'test_value_2',
      });

      const queue = await getQueue(3);

      expect(queue[0].operation.onesignalId).toBe(DUMMY_ONESIGNAL_ID);
      const localID = queue[1].operation.onesignalId;
      expect(queue[2].operation.onesignalId).toBe(localID);

      // first event should have been sent
      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            name: 'test_event_1',
            onesignal_id: DUMMY_ONESIGNAL_ID,
            payload: {
              os_sdk: OS_SDK,
              test_property_1: 'test_value_1',
            },
            timestamp: expect.any(String),
          },
        ],
      });

      // identity transfer call should have been made
      await vi.waitUntil(() => addAliasFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(addAliasFn).toHaveBeenCalledWith({
        identity: {
          external_id: 'some-id',
        },
      });

      // second event should have been sent
      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 2, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            external_id: 'some-id',
            name: 'test_event_2',
            onesignal_id: DUMMY_ONESIGNAL_ID,
            payload: {
              os_sdk: OS_SDK,
              test_property_2: 'test_value_2',
            },
            timestamp: expect.any(String),
          },
        ],
      });
    });

    test('custom event can execute before login for an existing user w/ external id', async () => {
      OneSignal.coreDirector
        .getIdentityModel()
        .setProperty('external_id', 'some-id', ModelChangeTags.NO_PROPOGATE);

      setSendCustomEventResponse();
      setCreateUserResponse({
        externalId: 'some-id-2',
      });
      setGetUserResponse();

      window.OneSignal.User.trackEvent('test_event_1', {
        test_property_1: 'test_value_1',
      });
      window.OneSignal.login('some-id-2');
      window.OneSignal.User.trackEvent('test_event_2', {
        test_property_2: 'test_value_2',
      });

      const queue = await getQueue(3);
      expect(queue[0].operation.onesignalId).toBe(DUMMY_ONESIGNAL_ID);
      const localID = queue[1].operation.onesignalId;
      expect(queue[2].operation.onesignalId).toBe(localID);

      // first event should have been sent
      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          expect.objectContaining({
            name: 'test_event_1',
          }),
        ],
      });

      // create user should have been called
      await vi.waitUntil(() => createUserFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(createUserFn).toHaveBeenCalledWith(
        expect.objectContaining({
          identity: {
            external_id: 'some-id-2',
          },
        }),
      );

      // second event should have been sent
      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 2, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          expect.objectContaining({
            name: 'test_event_2',
          }),
        ],
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
