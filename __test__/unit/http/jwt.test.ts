import { RequestService } from '../../../src/core/requestService/RequestService';
import {
  APP_ID,
  DUMMY_EXTERNAL_ID,
  DUMMY_JWT_TOKEN,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '../../support/constants';
import {
  expectJwtToBeSent,
  expectJwtToNotBeSent,
} from '../../support/helpers/jwt';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import Database from '../../../src/shared/services/Database';
import AliasPair from '../../../src/core/requestService/AliasPair';
import { getDummyPushSubscriptionOSModel } from '../../support/helpers/core';

describe('Jwt Http requests format', () => {
  let originalFetch: {
    (
      input: RequestInfo | URL,
      init?: RequestInit | undefined,
    ): Promise<Response>;
    (
      input: RequestInfo | URL,
      init?: RequestInit | undefined,
    ): Promise<Response>;
  } & {
    (
      input: RequestInfo | URL,
      init?: RequestInit | undefined,
    ): Promise<Response>;
    (
      input: RequestInfo | URL,
      init?: RequestInit | undefined,
    ): Promise<Response>;
  };

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    test.nock({});

    await TestEnvironment.initialize();
  });

  afterEach(() => {
    global.fetch = originalFetch;

    jest.restoreAllMocks();
  });

  describe('when jwtToken and jwtRequired is true', () => {
    let jwtRequired = true;
    let jwtToken = DUMMY_JWT_TOKEN;

    beforeEach(async () => {
      test.stub(
        Database.prototype,
        'getAppConfig',
        Promise.resolve({
          jwtRequired: jwtRequired,
        }),
      );

      test.stub(Database, 'getJWTToken', Promise.resolve(jwtToken));
    });

    test('POST /users: Jwt header is sent', async () => {
      await RequestService.createUser({ appId: APP_ID }, {});

      expectJwtToBeSent();
    });

    test('POST /users: Jwt header is sent with subscription id', async () => {
      await RequestService.createUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        {},
      );

      expectJwtToBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>: Jwt header is sent', async () => {
      await RequestService.getUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header is sent', async () => {
      await RequestService.updateUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header is sent with subscription id', async () => {
      await RequestService.updateUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>: Jwt header is sent', async () => {
      await RequestService.deleteUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>/identity: Jwt header is sent', async () => {
      await RequestService.addAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {}, // Todo? - create dummy SupportedIdentity
      );

      expectJwtToBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>/identity: Jwt header is sent', async () => {
      await RequestService.getUserIdentity(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: Jwt header is sent', async () => {
      await RequestService.deleteAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        'lableToRemove', // Todo? - create dummy labelToRemove: string
      );

      expectJwtToBeSent();
    });

    test('POST /users/by/<alias_label>/<alias_id>/subscriptions: Jwt header is sent', async () => {
      await RequestService.createSubscription(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {
          subscription: getDummyPushSubscriptionOSModel().data,
        },
      );

      expectJwtToBeSent();
    });

    test('DELETE /subscriptions/<subscription_id>: Jwt header is sent', async () => {
      await RequestService.deleteSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>: Jwt header is sent', async () => {
      await RequestService.updateSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy Partial<SubscriptionModel>
      );

      expectJwtToBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>/owner: Jwt header is sent', async () => {
      await RequestService.transferSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy SupportedIdentity
        false, // Todo? - create dummy retainPreviousOwner
      );

      expectJwtToBeSent();
    });

    test('PATCH /users/by/subscriptions/<subscription_id>/identity: Jwt header is sent', async () => {
      await RequestService.identifyUserForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {
          onesignal_id: DUMMY_ONESIGNAL_ID,
        }, // Todo? - create dummy IdentityModel
      );

      expectJwtToBeSent();
    });

    test('GET /subscriptions/<subscription_id>/identity: Jwt header is sent', async () => {
      await RequestService.fetchAliasesForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToBeSent();
    });
  });

  describe('when jwtRequired is false', () => {
    let jwtRequired = false;
    let jwtToken = DUMMY_JWT_TOKEN;

    beforeEach(async () => {
      test.stub(
        Database.prototype,
        'getAppConfig',
        Promise.resolve({
          jwtRequired: jwtRequired,
        }),
      );

      test.stub(Database, 'getJWTToken', Promise.resolve(jwtToken));
    });

    test('POST /users: Jwt header not sent', async () => {
      await RequestService.createUser({ appId: APP_ID }, {});

      expectJwtToNotBeSent();
    });

    test('POST /users: Jwt header not sent with subscription id', async () => {
      await RequestService.createUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        {},
      );

      expectJwtToNotBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.getUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.updateUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header not sent with subscription id', async () => {
      await RequestService.updateUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.deleteUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>/identity: Jwt header not sent', async () => {
      await RequestService.addAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {}, // Todo? - create dummy SupportedIdentity
      );

      expectJwtToNotBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>/identity: Jwt header not sent', async () => {
      await RequestService.getUserIdentity(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: Jwt header not sent', async () => {
      await RequestService.deleteAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        'lableToRemove', // Todo? - create dummy labelToRemove: string
      );

      expectJwtToNotBeSent();
    });

    test('POST /users/by/<alias_label>/<alias_id>/subscriptions: Jwt header not sent', async () => {
      await RequestService.createSubscription(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {
          subscription: getDummyPushSubscriptionOSModel().data,
        },
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /subscriptions/<subscription_id>: Jwt header not sent', async () => {
      await RequestService.deleteSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>: Jwt header not sent', async () => {
      await RequestService.updateSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy Partial<SubscriptionModel>
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>/owner: Jwt header not sent', async () => {
      await RequestService.transferSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy SupportedIdentity
        false, // Todo? - create dummy retainPreviousOwner
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/subscriptions/<subscription_id>/identity: Jwt header not sent', async () => {
      await RequestService.identifyUserForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {
          onesignal_id: DUMMY_ONESIGNAL_ID,
        }, // Todo? - create dummy IdentityModel
      );

      expectJwtToNotBeSent();
    });

    test('GET /subscriptions/<subscription_id>/identity: Jwt header not sent', async () => {
      await RequestService.fetchAliasesForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToNotBeSent();
    });
  });

  describe('when there is no jwtToken', () => {
    let jwtRequired = true;
    let jwtToken = undefined;

    beforeEach(async () => {
      test.stub(
        Database.prototype,
        'getAppConfig',
        Promise.resolve({
          jwtRequired: jwtRequired,
        }),
      );

      test.stub(Database, 'getJWTToken', Promise.resolve(jwtToken));
    });

    test('POST /users: Jwt header not sent', async () => {
      await RequestService.createUser({ appId: APP_ID }, {});

      expectJwtToNotBeSent();
    });

    test('POST /users: Jwt header not sent with subscription id', async () => {
      await RequestService.createUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        {},
      );

      expectJwtToNotBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.getUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.updateUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>: Jwt header not sent with subscription id', async () => {
      await RequestService.updateUser(
        { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {},
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>: Jwt header not sent', async () => {
      await RequestService.deleteUser(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/<alias_label>/<alias_id>/identity: Jwt header not sent', async () => {
      await RequestService.addAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {}, // Todo? - create dummy SupportedIdentity
      );

      expectJwtToNotBeSent();
    });

    test('GET /users/by/<alias_label>/<alias_id>/identity: Jwt header not sent', async () => {
      await RequestService.getUserIdentity(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: Jwt header not sent', async () => {
      await RequestService.deleteAlias(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        'lableToRemove', // Todo? - create dummy labelToRemove: string
      );

      expectJwtToNotBeSent();
    });

    test('POST /users/by/<alias_label>/<alias_id>/subscriptions: Jwt header not sent', async () => {
      await RequestService.createSubscription(
        { appId: APP_ID },
        new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
        {
          subscription: getDummyPushSubscriptionOSModel().data,
        },
      );

      expectJwtToNotBeSent();
    });

    test('DELETE /subscriptions/<subscription_id>: Jwt header not sent', async () => {
      await RequestService.deleteSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>: Jwt header not sent', async () => {
      await RequestService.updateSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy Partial<SubscriptionModel>
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /subscriptions/<subscription_id>/owner: Jwt header not sent', async () => {
      await RequestService.transferSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {}, // Todo? - create dummy SupportedIdentity
        false, // Todo? - create dummy retainPreviousOwner
      );

      expectJwtToNotBeSent();
    });

    test('PATCH /users/by/subscriptions/<subscription_id>/identity: Jwt header not sent', async () => {
      await RequestService.identifyUserForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
        {
          onesignal_id: DUMMY_ONESIGNAL_ID,
        }, // Todo? - create dummy IdentityModel
      );

      expectJwtToNotBeSent();
    });

    test('GET /subscriptions/<subscription_id>/identity: Jwt header not sent', async () => {
      await RequestService.fetchAliasesForSubscription(
        { appId: APP_ID },
        DUMMY_SUBSCRIPTION_ID,
      );

      expectJwtToNotBeSent();
    });
  });
});
