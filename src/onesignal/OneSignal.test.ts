import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID_2,
  DUMMY_SUBSCRIPTION_ID_3,
} from '__test__/support/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  addAliasFn,
  deleteAliasFn,
  deleteSubscriptionFn,
  mockPageStylesCss,
  mockServerConfig,
  setAddAliasResponse,
  setDeleteAliasResponse,
  setDeleteSubscriptionResponse,
  setGetUserResponse,
  setSubscriptionFn,
  setSubscriptionResponse,
} from '__test__/support/helpers/requests';
import { server } from '__test__/support/mocks/server';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { OP_REPO_EXECUTION_INTERVAL } from 'src/core/operationRepo/constants';
import { ICreateUserSubscription } from 'src/core/types/api';
import Database, { SubscriptionItem } from 'src/shared/services/Database';

vi.useFakeTimers();

describe('OneSignal', () => {
  beforeAll(async () => {
    server.use(mockServerConfig(), mockPageStylesCss());
    const _onesignal = await TestEnvironment.initialize();
    window.OneSignal = _onesignal;

    await Database.put('identity', {
      modelId: '123',
      onesignalId: DUMMY_ONESIGNAL_ID,
    });
    await window.OneSignal.init({ appId: APP_ID });
  });

  beforeEach(async () => {
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
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
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

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 3);
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
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        window.OneSignal.User.removeAlias('someLabel');

        const identityModel = window.OneSignal.coreDirector.getIdentityModel();
        expect(identityModel.getProperty('someLabel')).toBeUndefined();

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        expect(deleteAliasFn).toHaveBeenCalled();
      });

      test('can delete multiple aliases from the current user', async () => {
        setDeleteAliasResponse();

        window.OneSignal.User.addAlias('someLabel', 'someId');
        window.OneSignal.User.addAlias('someLabel2', 'someId2');
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 2);
        window.OneSignal.User.removeAlias('someLabel');
        window.OneSignal.User.removeAlias('someLabel2');

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 4);
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
          response: {
            identity: {
              onesignal_id: DUMMY_ONESIGNAL_ID,
            },
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
          },
        });
      });

      test('can add an email subscription to the current user', async () => {
        window.OneSignal.User.addEmail(email);
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 3);

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

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 6);
        window.OneSignal.User.removeEmail(email);
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 4);

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
          response: {
            identity: {
              onesignal_id: DUMMY_ONESIGNAL_ID,
            },
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
          },
        });
      });

      test('can add an sms subscription to the current user', async () => {
        window.OneSignal.User.addSms(sms);
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 3);

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

        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 6);
        window.OneSignal.User.removeSms(sms);
        await vi.advanceTimersByTimeAsync(OP_REPO_EXECUTION_INTERVAL * 4);

        dbSubscriptions = await getSmsSubscriptionDbItems();
        expect(dbSubscriptions).toHaveLength(0);
      });
    });
  });
});
