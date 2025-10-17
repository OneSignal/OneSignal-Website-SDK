import {
  BASE_IDENTITY,
  BASE_SUB,
  DEVICE_OS,
  ONESIGNAL_ID,
  ONESIGNAL_ID_2,
  PUSH_TOKEN,
  SUB_ID,
  SUB_ID_2,
  SUB_ID_3,
} from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import {
  addAliasFn,
  createSubscriptionFn,
  createUserFn,
  deleteAliasFn,
  deleteSubscriptionFn,
  getUserFn,
  mockPageStylesCss,
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
  setUpdateUserResponse,
  transferSubscriptionFn,
  updateUserFn,
} from '__test__/support/helpers/requests';
import {
  getDbSubscriptions,
  getIdentityItem,
  getRawPushSubscription,
  setupIdentityModel,
  setupPropertiesModel,
  updateIdentityModel,
} from '__test__/support/helpers/setup';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import type { OperationQueueItem } from 'src/core/operationRepo/OperationRepo';
import { type ICreateUserSubscription } from 'src/core/types/api';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import { setPushToken } from 'src/shared/database/subscription';
import type { SubscriptionSchema } from 'src/shared/database/types';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import MainHelper from 'src/shared/helpers/MainHelper';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { SubscriptionManagerPage } from 'src/shared/managers/subscription/page';

mockPageStylesCss();

const setupEnv = (consentRequired: boolean) => {
  TestEnvironment.initialize({
    initUserAndPushSubscription: true,
    userConfig: {
      requiresUserPrivacyConsent: consentRequired,
    },
  });
  OneSignal._coreDirector._subscriptionModelStore._replaceAll(
    [],
    ModelChangeTags.NO_PROPAGATE,
  );
  setupPropertiesModel();
  setupIdentityModel();
};

describe('OneSignal - No Consent Required', () => {
  beforeEach(async () => {
    setupEnv(false);
  });

  describe('User', () => {
    describe('aliases', () => {
      beforeEach(() => {
        setAddAliasResponse();
      });

      test('can add an alias to the current user', async () => {
        OneSignal.User.addAlias('someLabel', 'someId');
        const identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._getProperty('someLabel')).toBe('someId');

        // should make a request to the backend
        await vi.waitUntil(() => addAliasFn.mock.calls.length === 1);
        expect(addAliasFn).toHaveBeenCalledWith({
          identity: {
            someLabel: 'someId',
          },
        });
      });

      test('can add multiple aliases to the current user', async () => {
        OneSignal.User.addAlias('someLabel', 'someId');
        OneSignal.User.addAlias('someLabel2', 'someId2');

        const identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._getProperty('someLabel')).toBe('someId');
        expect(identityModel._getProperty('someLabel2')).toBe('someId2');

        await vi.waitUntil(() => addAliasFn.mock.calls.length === 2);
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

        OneSignal.User.addAlias('someLabel', 'someId');
        await vi.waitUntil(() => addAliasFn.mock.calls.length === 1);
        OneSignal.User.removeAlias('someLabel');

        const identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._getProperty('someLabel')).toBeUndefined();

        await vi.waitUntil(() => deleteAliasFn.mock.calls.length === 1);
      });

      test('can delete multiple aliases from the current user', async () => {
        setDeleteAliasResponse();

        OneSignal.User.addAlias('someLabel', 'someId');
        OneSignal.User.addAlias('someLabel2', 'someId2');

        let identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._getProperty('someLabel')).toBe('someId');
        expect(identityModel._getProperty('someLabel2')).toBe('someId2');

        await vi.waitUntil(async () => addAliasFn.mock.calls.length === 2);

        OneSignal.User.removeAlias('someLabel');
        OneSignal.User.removeAlias('someLabel2');

        await vi.waitUntil(async () => deleteAliasFn.mock.calls.length === 2);

        identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._getProperty('someLabel')).toBeUndefined();
        expect(identityModel._getProperty('someLabel2')).toBeUndefined();
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
          onesignalId: ONESIGNAL_ID,
          subscriptions: [
            {
              ...BASE_SUB,
              id: SUB_ID_2,
              token: 'test@test.com',
              type: 'Email',
            },
          ],
        });
      });

      test('can add an email subscription to the current user', async () => {
        OneSignal.User.addEmail(email);
        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);

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
            onesignalId: ONESIGNAL_ID,
            sdk: __VERSION__,
          },
        ]);

        // cant add the same email twice
        OneSignal.User.addEmail(email);
        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);
        dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toMatchObject([
          {
            modelId: expect.any(String),
            id: SUB_ID_2,
            ...subscription,
          },
        ]);
      });

      test('can remove an email subscription from the current user', async () => {
        setDeleteSubscriptionResponse({
          subscriptionId: SUB_ID_2,
        });
        const email = 'test@test.com';
        OneSignal.User.addEmail(email);
        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);

        let dbSubscriptions = await getEmailSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(1);

        OneSignal.User.removeEmail(email);

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
          onesignalId: ONESIGNAL_ID,
          subscriptions: [
            {
              id: SUB_ID_3,
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
        OneSignal.User.addSms(sms);
        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);

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
            onesignalId: ONESIGNAL_ID,
            sdk: __VERSION__,
          },
        ]);

        // cant add the same sms twice
        OneSignal.User.addSms(sms);
        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);

        dbSubscriptions = await getSmsSubscriptionDbItems(1);
        expect(dbSubscriptions).toMatchObject([
          {
            modelId: expect.any(String),
            id: SUB_ID_3,
            ...subscription,
          },
        ]);
      });

      test('can remove an sms subscription from the current user', async () => {
        setDeleteSubscriptionResponse({
          subscriptionId: SUB_ID_3,
        });
        OneSignal.User.addSms(sms);
        await getSmsSubscriptionDbItems(1);

        await vi.waitUntil(() => createSubscriptionFn.mock.calls.length === 1);
        await vi.waitUntil(async () => {
          const sub = (await db.getAll('subscriptions'))[0];
          return sub.id === SUB_ID_3;
        });

        OneSignal.User.removeSms(sms);

        await vi.waitUntil(() => deleteSubscriptionFn.mock.calls.length === 1);

        await getSmsSubscriptionDbItems(0);
      });
    });

    describe('login', () => {
      const externalId = 'jd-1';

      describe('login user', () => {
        beforeEach(async () => {
          setAddAliasResponse();

          await setupSubModelStore({
            id: SUB_ID,
            token: 'abc123',
          });
        });

        test('should validate external id', async () => {
          // @ts-expect-error - testing invalid argument
          await expect(OneSignal.login()).rejects.toThrowError(
            '"externalId" is empty',
          );

          // @ts-expect-error - testing invalid argument
          await expect(OneSignal.login(null)).rejects.toThrowError(
            '"externalId" is the wrong type',
          );

          // @ts-expect-error - testing invalid argument
          await expect(OneSignal.login('', 1)).rejects.toThrowError(
            '"jwtToken" is the wrong type',
          );
        });

        test('can login with a new external id', async () => {
          setTransferSubscriptionResponse();
          let identityData = await getIdentityItem();
          await OneSignal.login(externalId);

          // should not change the identity in the IndexedDB right away
          expect(identityData).toEqual({
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          // wait for login user operation to complete
          expect(addAliasFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
          });

          // should also update the identity in the IndexedDB
          identityData = await getIdentityItem(
            (i) => i.onesignal_id === ONESIGNAL_ID,
          );
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          const identityModel = OneSignal._coreDirector._getIdentityModel();
          expect(identityModel._externalId).toBe(externalId);

          await vi.waitUntil(
            () => transferSubscriptionFn.mock.calls.length === 1,
          );
        });

        test('login twice with same user -> only one call to identify user', async () => {
          setTransferSubscriptionResponse();
          await OneSignal.login(externalId);
          await OneSignal.login(externalId);

          expect(addAliasFn).toHaveBeenCalledTimes(1);
          expect(debugSpy).toHaveBeenCalledWith(
            'Login: External ID already set, skipping login',
          );
          await vi.waitUntil(
            () => transferSubscriptionFn.mock.calls.length === 1,
          );
        });

        test('login twice with different user -> logs in to second user', async () => {
          const newExternalId = 'jd-2';
          setCreateUserResponse({
            externalId: newExternalId,
          });
          setGetUserResponse({
            externalId: newExternalId,
          });
          setTransferSubscriptionResponse();

          await OneSignal.login(externalId); // should call set alias
          await vi.waitUntil(() => addAliasFn.mock.calls.length === 1);
          expect(addAliasFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
          });

          await OneSignal.login(newExternalId); // should call create user
          await vi.waitUntil(() => createUserFn.mock.calls.length === 1);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: newExternalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [
              {
                id: SUB_ID,
              },
            ],
          });

          await vi.waitUntil(() => getUserFn.mock.calls.length === 1);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: newExternalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          const identityModel = OneSignal._coreDirector._getIdentityModel();
          expect(identityModel._externalId).toBe(newExternalId);
        });

        test('login conflict should keep old subscriptions', async () => {
          setAddAliasError({
            status: 409,
          });
          setCreateUserResponse({});
          setGetUserResponse({
            onesignalId: ONESIGNAL_ID,
            newOnesignalId: ONESIGNAL_ID_2,
            externalId,
            subscriptions: [
              {
                id: SUB_ID_2,
                type: 'ChromePush',
                token: 'def456',
              },
            ],
          });

          // calls create user with empty subscriptions
          await OneSignal.login(externalId);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [
              {
                id: SUB_ID,
              },
            ],
          });

          // calls refresh user
          // onesignal id should be changed
          const identityData = await getIdentityItem(
            (i) => i.onesignal_id === ONESIGNAL_ID_2,
          );
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID_2,
          });
        });
      });

      describe('subscription after login', () => {
        const email = 'test@example.com';
        const sms = '+1234567890';

        beforeEach(async () => {
          setAddAliasResponse();
          setTransferSubscriptionResponse();

          await setupSubModelStore({
            id: SUB_ID,
            token: PUSH_TOKEN,
          });
        });

        test('login before adding email and sms - it should create subscriptions with the external ID', async () => {
          await OneSignal.login(externalId);
          await vi.waitUntil(() => addAliasFn.mock.calls.length === 1);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          // add email
          setCreateSubscriptionResponse({
            response: {
              id: SUB_ID_2,
            },
          });
          OneSignal.User.addEmail(email);

          // want to use different subscription id for sms
          await vi.waitUntil(() => createSubscriptionFn.mock.calls.length > 0);
          setCreateSubscriptionResponse({
            response: {
              id: SUB_ID_3,
            },
          });
          OneSignal.User.addSms(sms);

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

          const dbSubscriptions = await getDbSubscriptions(3);

          const emailSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'Email',
          );
          const smsSubscriptions = dbSubscriptions.filter(
            (s) => s.type === 'SMS',
          );

          expect(emailSubscriptions).toHaveLength(1);
          expect(emailSubscriptions[0].id).toBe(SUB_ID_2);
          expect(emailSubscriptions[0].token).toBe(email);
          expect(emailSubscriptions[0].onesignalId).toBe(ONESIGNAL_ID);

          expect(smsSubscriptions).toHaveLength(1);
          expect(smsSubscriptions[0].id).toBe(SUB_ID_3);
          expect(smsSubscriptions[0].token).toBe(sms);
          expect(smsSubscriptions[0].onesignalId).toBe(ONESIGNAL_ID);
        });

        test('login without accepting web push permissions - it should create a new user without any subscriptions', async () => {
          setGetUserResponse({
            externalId,
          });
          setCreateUserResponse({});

          const localId = IDManager._createLocalId();
          setupIdentityModel(localId);

          OneSignal._coreDirector._subscriptionModelStore._replaceAll(
            [],
            ModelChangeTags.NO_PROPAGATE,
          );

          // wait for db to be updated
          await getIdentityItem((i) => i.onesignal_id === localId);
          OneSignal.login(externalId);

          await vi.waitUntil(() => getUserFn.mock.calls.length === 1);
          const identityData = await getIdentityItem(
            (i) =>
              i.onesignal_id === ONESIGNAL_ID && i.external_id === externalId,
          );

          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          await OneSignal.User.PushSubscription.optIn();

          expect(createUserFn).toHaveBeenCalledTimes(1);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [],
          });
        });

        test('login with a prior web push subscription - it should transfer the subscription', async () => {
          setCreateUserResponse();
          updateIdentityModel('onesignal_id', '');

          await getDbSubscriptions(1);

          await OneSignal.login(externalId);

          const identityData = await getIdentityItem();
          expect(identityData).toEqual({
            external_id: externalId,
            modelId: expect.any(String),
            modelName: 'identity',
            onesignal_id: ONESIGNAL_ID,
          });

          expect(createUserFn).toHaveBeenCalledTimes(1);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [
              {
                id: SUB_ID,
              },
            ],
          });
        });

        test('login then accept web push permissions - it should make two user calls', async () => {
          const { promise, resolve } = Promise.withResolvers();
          OneSignal._emitter.on(OneSignal.EVENTS.SUBSCRIPTION_CHANGED, resolve);
          setGetUserResponse();
          setCreateUserResponse({
            onesignalId: ONESIGNAL_ID,
            externalId,
            subscriptions: [
              {
                id: SUB_ID,
              },
            ],
          });

          OneSignal._coreDirector._subscriptionModelStore._replaceAll(
            [],
            ModelChangeTags.NO_PROPAGATE,
          );
          setPushToken('');
          subscribeFcmFromPageSpy.mockImplementation(async () =>
            getRawPushSubscription(),
          );

          // new/empty user
          setupIdentityModel(IDManager._createLocalId());

          // calling login before accept permissions
          OneSignal.login(externalId);

          // slidedown manager calls this on allow click
          // @ts-expect-error - Notification is not defined in the global scope
          global.Notification = {
            permission: 'granted',
          };
          registerForPushNotifications();

          // first call just sets the external id
          await vi.waitUntil(() => createUserFn.mock.calls.length === 1, {
            interval: 0,
          });
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [],
          });
          await promise;

          // second call creates the subscription
          await vi.waitUntil(() => createUserFn.mock.calls.length === 2);
          expect(createUserFn).toHaveBeenCalledWith({
            identity: {
              external_id: externalId,
            },
            ...BASE_IDENTITY,
            subscriptions: [
              {
                ...BASE_SUB,
                token: PUSH_TOKEN,
                type: 'ChromePush',
                web_auth: 'w3cAuth',
                web_p256: 'w3cP256dh',
              },
            ],
          });

          let pushSub: SubscriptionSchema | undefined;
          await vi.waitUntil(async () => {
            pushSub = (await db.getAll('subscriptions'))[0];
            return pushSub && !IDManager._isLocalId(pushSub.id);
          });
        });
      });
    });

    describe('logout', () => {
      test('should not do anything if user has no external id', async () => {
        const identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel._externalId).toBeUndefined();

        OneSignal.logout();
        expect(debugSpy).toHaveBeenCalledWith(
          'Logout: User is not logged in, skipping logout',
        );
      });

      test('can logout the user with existing external id and subscription', async () => {
        const pushSub = await setupSubModelStore({
          id: SUB_ID,
          token: 'abc123',
        });

        // existing user
        let identityModel = OneSignal._coreDirector._getIdentityModel();
        updateIdentityModel('external_id', 'jd-1');

        setCreateUserResponse({});

        OneSignal.logout();

        // identity model should be reset
        identityModel = OneSignal._coreDirector._getIdentityModel();
        const onesignalId = identityModel._onesignalId;
        expect(identityModel.toJSON()).toEqual({
          onesignal_id: expect.any(String),
        });
        expect(IDManager._isLocalId(onesignalId)).toBe(true);

        let identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          onesignal_id: onesignalId,
          modelName: 'identity',
        });

        // properties model should be reset
        const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
        expect(propertiesModel.toJSON()).toEqual({
          onesignalId,
        });

        let propertiesData = await getPropertiesItem();
        expect(propertiesData).toEqual({
          modelId: expect.any(String),
          modelName: 'properties',
          onesignalId,
        });

        await vi.waitUntil(() => createUserFn.mock.calls.length === 1);

        // should update models and db
        identityModel = OneSignal._coreDirector._getIdentityModel();
        expect(identityModel.toJSON()).toEqual({
          onesignal_id: ONESIGNAL_ID,
        });

        identityData = await getIdentityItem();
        expect(identityData).toEqual({
          modelId: expect.any(String),
          modelName: 'identity',
          onesignal_id: ONESIGNAL_ID,
        });

        propertiesData = await getPropertiesItem();
        expect(propertiesData).toEqual({
          modelId: expect.any(String),
          modelName: 'properties',
          onesignalId: ONESIGNAL_ID,
        });

        const subscriptions = await db.getAll('subscriptions');
        expect(subscriptions).toEqual([
          {
            ...BASE_SUB,
            id: pushSub.id,
            modelId: expect.any(String),
            modelName: 'subscriptions',
            onesignalId: ONESIGNAL_ID,
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
          const _queue = OneSignal._coreDirector._operationRepo._queue;
          return _queue.length === length ? _queue : null;
        },
        { interval: 0 },
      );
      return queue;
    };

    test('can send a custom event', async () => {
      setSendCustomEventResponse();
      updateIdentityModel('external_id', 'some-id');
      OneSignal.User.trackEvent(name);

      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1);

      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            name,
            external_id: 'some-id',
            onesignal_id: ONESIGNAL_ID,
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
        onesignalId: ONESIGNAL_ID,
        externalId: 'some-id',
      });
      setSendCustomEventResponse();

      updateIdentityModel('onesignal_id', IDManager._createLocalId());
      updateIdentityModel('external_id', 'some-id');

      OneSignal.login('some-id-2');
      OneSignal.User.trackEvent(name, properties);

      const queue = await getQueue(2);

      // login and custom event should have matching id (via UserDirector reset user models)
      const newLocalId = queue[0].operation._onesignalId;
      expect(queue[1].operation._onesignalId).toBe(newLocalId);

      // should translate ids for the custom event
      await vi.waitUntil(() => createUserFn.mock.calls.length === 1, {
        interval: 0,
      });
      expect(sendCustomEventFn).not.toHaveBeenCalled();

      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1);
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            external_id: 'some-id-2',
            name,
            onesignal_id: ONESIGNAL_ID,
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

      OneSignal.User.trackEvent('test_event_1', {
        test_property_1: 'test_value_1',
      });
      OneSignal.login('some-id');
      OneSignal.User.trackEvent('test_event_2', {
        test_property_2: 'test_value_2',
      });

      const queue = await getQueue(3);

      expect(queue[0].operation._onesignalId).toBe(ONESIGNAL_ID);
      const localID = queue[1].operation._onesignalId;
      expect(queue[2].operation._onesignalId).toBe(localID);

      // first event should have been sent
      await vi.waitUntil(() => sendCustomEventFn.mock.calls.length === 1, {
        interval: 1,
      });
      expect(sendCustomEventFn).toHaveBeenCalledWith({
        events: [
          {
            name: 'test_event_1',
            onesignal_id: ONESIGNAL_ID,
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
            onesignal_id: ONESIGNAL_ID,
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
      updateIdentityModel('external_id', 'some-id');

      setSendCustomEventResponse();
      setCreateUserResponse({
        externalId: 'some-id-2',
      });
      setGetUserResponse();

      OneSignal.User.trackEvent('test_event_1', {
        test_property_1: 'test_value_1',
      });
      OneSignal.login('some-id-2');
      OneSignal.User.trackEvent('test_event_2', {
        test_property_2: 'test_value_2',
      });

      const queue = await getQueue(3);
      expect(queue[0].operation._onesignalId).toBe(ONESIGNAL_ID);
      const localID = queue[1].operation._onesignalId;
      expect(queue[2].operation._onesignalId).toBe(localID);

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

  describe('Listeners', () => {
    test('can listen for subscription changed event', async () => {
      await db.put('Options', {
        key: 'notificationPermission',
        value: 'granted',
      });

      setCreateUserResponse({
        subscriptions: [
          {
            id: SUB_ID,
          },
        ],
      });

      const changeEvent = vi.fn();
      OneSignal.User.PushSubscription.addEventListener('change', changeEvent);

      subscribeFcmFromPageSpy.mockImplementation(async () =>
        getRawPushSubscription(),
      );

      // @ts-expect-error - Notification is not defined in the global scope
      global.Notification = {
        permission: 'granted',
      };
      registerForPushNotifications();

      await vi.waitUntil(() => changeEvent.mock.calls.length === 1);
      expect(changeEvent).toHaveBeenCalledWith({
        previous: {
          id: undefined,
          optedIn: true,
          token: undefined,
        },
        current: {
          id: SUB_ID,
          optedIn: true,
          token: PUSH_TOKEN,
        },
      });
    });
  });

  test('should preserve operations order without needing await', async () => {
    await setupSubModelStore({
      id: SUB_ID,
      token: 'def456',
    });
    setAddAliasResponse();
    setTransferSubscriptionResponse();
    setUpdateUserResponse();

    OneSignal.login('some-id');
    OneSignal.User.addTag('some-tag', 'some-value');
    const tags = OneSignal.User.getTags();

    let queue: OperationQueueItem[] = [];
    await vi.waitUntil(
      () => {
        queue = OneSignal._coreDirector._operationRepo._queue;
        return queue.length === 3;
      },
      { interval: 1 },
    );

    // its fine if login op is last since its the only one that can be executed
    const loginOp = queue[0];
    expect(loginOp.operation._name).toBe('login-user');

    const setPropertyOp = queue[1];
    expect(setPropertyOp.operation._name).toBe('set-property');

    const transferOp = queue[2];
    expect(transferOp.operation._name).toBe('transfer-subscription');

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

describe('OneSignal - Consent Required', () => {
  beforeEach(() => {
    setupEnv(true);
    OneSignal.setConsentGiven(false);
  });

  test('cannot call login if consent is required but not given', async () => {
    OneSignal.login('some-id');
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');

    OneSignal.setConsentGiven(true);
    warnSpy.mockClear();
    OneSignal.login('some-id');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('cannot call logout if consent is required but not given', async () => {
    OneSignal.logout();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});

vi.spyOn(Log, '_error').mockImplementation(() => '');
const debugSpy = vi.spyOn(Log, '_debug');
const warnSpy = vi.spyOn(Log, '_warn');

const getPropertiesItem = async () => (await db.getAll('properties'))[0];

const subscribeFcmFromPageSpy = vi.spyOn(
  SubscriptionManagerPage.prototype,
  '_subscribeFcmFromPage',
);

const showLocalNotificationSpy = vi.spyOn(MainHelper, '_showLocalNotification');
showLocalNotificationSpy.mockImplementation(async () => {});
