import { mockUserAgent } from '__test__/support/environment/TestEnvironmentHelpers';
import { generateNewSubscription } from '__test__/support/helpers/core';
import { nock } from '__test__/support/helpers/general';
import AliasPair from '../../../src/core/requestService/AliasPair';
import { RequestService } from '../../../src/core/requestService/RequestService';
import Environment from '../../../src/shared/helpers/Environment';
import {
  APP_ID,
  DUMMY_EXTERNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '../../support/constants';
import { expectHeaderToBeSent } from '../../support/helpers/sdkVersion';

describe('Sdk Version Header Tests', () => {
  beforeAll(() => {
    nock({});
    mockUserAgent();
    vi.spyOn(Environment, 'version').mockReturnValue(160000);
  });

  test('POST /users: SDK-Version header is sent', () => {
    RequestService.createUser({ appId: APP_ID }, {});
    expectHeaderToBeSent();
  });
  test('POST /users: header is sent', () => {
    RequestService.createUser(
      { appId: APP_ID },
      { refresh_device_metadata: true },
    );
    expectHeaderToBeSent();
  });
  test('POST /users: header is sent with subscription id', () => {
    RequestService.createUser(
      { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
      {},
    );
    expectHeaderToBeSent();
  });
  test('GET /users/by/<alias_label>/<alias_id>: header is sent', () => {
    RequestService.getUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent', () => {
    RequestService.updateUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {},
    );
    expectHeaderToBeSent();
  });
  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent with subscription id', () => {
    RequestService.updateUser(
      { appId: APP_ID, subscriptionId: DUMMY_SUBSCRIPTION_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {},
    );
    expectHeaderToBeSent();
  });
  test('DELETE /users/by/<alias_label>/<alias_id>: header is sent', () => {
    RequestService.deleteUser(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('POST /users/by/<alias_label>/<alias_id>/subscription: header is sent', () => {
    RequestService.createSubscription(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      {
        subscription: generateNewSubscription().data,
      },
    );
    expectHeaderToBeSent();
  });
  test('GET /users/by/<alias_label>/<alias_id>/identity: header is sent', () => {
    RequestService.getUserIdentity(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
    );
    expectHeaderToBeSent();
  });
  test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: header is sent', () => {
    RequestService.deleteAlias(
      { appId: APP_ID },
      new AliasPair(AliasPair.EXTERNAL_ID, DUMMY_EXTERNAL_ID),
      AliasPair.EXTERNAL_ID,
    );
    expectHeaderToBeSent();
  });
  test('PATCH /subscriptions/<subscription_id>: header is sent', () => {
    RequestService.updateSubscription({ appId: APP_ID }, DUMMY_EXTERNAL_ID, {});
    expectHeaderToBeSent();
  });
  test('DELETE /subscriptions/<subscription_id>: header is sent', () => {
    RequestService.deleteSubscription({ appId: APP_ID }, DUMMY_EXTERNAL_ID);
    expectHeaderToBeSent();
  });
});
