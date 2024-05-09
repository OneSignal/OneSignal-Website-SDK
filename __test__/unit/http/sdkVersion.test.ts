import Environment from '../../../src/shared/helpers/Environment';
import { RequestService } from '../../../src/core/requestService/RequestService';
import {
  APP_ID,
  DUMMY_EXTERNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '../../support/constants';
import {
  expectHeaderToBeSent,
  expectOneSignalSubscriptionIdHeaderToBeSent,
} from '../../support/helpers/sdkVersion';
import AliasPair from '../../../src/core/requestService/AliasPair';
import { getDummyPushSubscriptionOSModel } from '../../support/helpers/core';

describe('Sdk Version Header Tests', () => {
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

  // Set up the fetch spy before each test
  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  // Restore the original fetch method after each test
  afterEach(() => {
    global.fetch = originalFetch;
  });

  beforeAll(() => {
    test.nock({});
    test.stub(Environment, 'version', '160000');
  });

  test('POST /users: SDK-Version header is sent', async () => {
    await RequestService.createUser({ appId: APP_ID }, {});
    expectHeaderToBeSent();
  });
  test('GET /users/by/<alias_label>/<alias_id>: header is sent', async () => {
    await RequestService.getUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent', async () => {
    await RequestService.updateUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {},
    );
    expectHeaderToBeSent();
  });
  test('DELETE /users/by/<alias_label>/<alias_id>: header is sent', async () => {
    await RequestService.deleteUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('POST /users/by/<alias_label>/<alias_id>/subscription: header is sent', async () => {
    await RequestService.createSubscription(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {
        subscription: getDummyPushSubscriptionOSModel().data,
      },
    );
    expectHeaderToBeSent();
  });
  test('GET /users/by/<alias_label>/<alias_id>/identity: header is sent', async () => {
    await RequestService.getUserIdentity(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: header is sent', async () => {
    await RequestService.deleteAlias(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      AliasPair.EXTERNAL_ID,
    );
    expectHeaderToBeSent();
  });
  test('PATCH /subscriptions/<subscription_id>: header is sent', async () => {
    await RequestService.updateSubscription(
      { appId: APP_ID },
      DUMMY_EXTERNAL_ID,
      {},
    );
    expectHeaderToBeSent();
  });
  test('DELETE /subscriptions/<subscription_id>: header is sent', async () => {
    await RequestService.deleteSubscription(
      { appId: APP_ID },
      DUMMY_EXTERNAL_ID,
    );
    expectHeaderToBeSent();
  });
  test('POST /users: header is sent with subscription id', async () => {
    await RequestService.createUser(
      { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
      {},
    );
    expectOneSignalSubscriptionIdHeaderToBeSent();
  });

  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent with subscription id', async () => {
    await RequestService.updateUser(
      { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {},
    );
    expectOneSignalSubscriptionIdHeaderToBeSent();
  });
});
