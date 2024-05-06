import { TestEnvironment } from '../../support/environment/TestEnvironment';
import LoginManager from '../../../src/page/managers/LoginManager';
import { setupLoginStubs } from '../../support/helpers/login';
import { RequestService } from '../../../src/core/requestService/RequestService';
import {
  APP_ID,
  DUMMY_EXTERNAL_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '../../support/constants';
import EventHelper from '../../../src/shared/helpers/EventHelper';
import AliasPair from '../../../src/core/requestService/AliasPair';
import { getDummyPushSubscriptionOSModel } from '../../support/helpers/core';

describe('Jwt Http responses', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('401 unauthorized error', () => {
    beforeEach(async () => {
      test.nock({}, 401);

      await TestEnvironment.initialize();
    });

    test('POST /users: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.createUser({ appId: APP_ID }, {});

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('POST /users: with subscription id fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.createUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        {},
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('GET /users/by/<alias_label>/<alias_id>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.getUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.updateUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: with subscription id fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.updateUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('DELETE /users/by/<alias_label>/<alias_id>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.deleteUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /users/by/<alias_label>/<alias_id>/identity: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.addAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {}, // Todo? - create dummy SupportedIdentity
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('GET /users/by/<alias_label>/<alias_id>/identity: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.getUserIdentity(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.deleteAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        'lableToRemove', // Todo? - create dummy labelToRemove: string
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('POST /users/by/<alias_label>/<alias_id>/subscriptions: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.createSubscription(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {
          subscription: getDummyPushSubscriptionOSModel().data,
        },
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('DELETE /subscriptions/<subscription_id>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.deleteSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /subscriptions/<subscription_id>: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.updateSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy Partial<SubscriptionModel>
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /subscriptions/<subscription_id>/owner: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.transferSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy SupportedIdentity
        false, // Todo? - create dummy retainPreviousOwner
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('PATCH /users/by/subscriptions/<subscription_id>/identity: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.identifyUserForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {
          onesignal_id: DUMMY_ONESIGNAL_ID,
        }, // Todo? - create dummy IdentityModel
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    test('GET /subscriptions/<subscription_id>/identity: fires invalidated handler', async () => {
      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      await RequestService.fetchAliasesForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });

    // WIP
    test('fires jwt invalidated handler on login', async () => {
      setupLoginStubs();
      await TestEnvironment.initialize({
        useMockIdentityModel: true,
        useMockPushSubscriptionModel: true,
      });

      const jwtInvalidated = jest.spyOn(EventHelper, 'onUserJwtInvalidated');

      test.nock({}, 401);

      await LoginManager.login(DUMMY_EXTERNAL_ID);

      expect(jwtInvalidated).toHaveBeenCalledTimes(1);
    });
  });
});
