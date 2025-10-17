import { APP_ID, EXTERNAL_ID, SUB_ID } from '__test__/constants';
import { generateNewSubscription } from '__test__/support/helpers/core';
import { nock } from '__test__/support/helpers/general';
import { IdentityConstants } from 'src/core/constants';
import {
  createNewUser,
  createSubscriptionByAlias,
  deleteAlias,
  deleteSubscriptionById,
  deleteUserByAlias,
  getUserByAlias,
  getUserIdentity,
  updateSubscriptionById,
  updateUserByAlias,
} from 'src/core/requests/api';
import { expectHeaderToBeSent } from '../../support/helpers/sdkVersion';

describe('Sdk Version Header Tests', () => {
  beforeAll(() => nock({}));

  test('POST /users: SDK-Version header is sent', () => {
    // @ts-expect-error - partial identity object
    createNewUser({ appId: APP_ID }, {});
    expectHeaderToBeSent();
  });

  test('POST /users: header is sent', () => {
    createNewUser(
      { appId: APP_ID },
      // @ts-expect-error - partial identity object
      { refresh_device_metadata: true },
    );
    expectHeaderToBeSent();
  });

  test('POST /users: header is sent with subscription id', () => {
    createNewUser(
      { appId: APP_ID, subscriptionId: SUB_ID },
      // @ts-expect-error - partial identity object
      {},
    );
    expectHeaderToBeSent();
  });

  test('GET /users/by/<alias_label>/<alias_id>: header is sent', () => {
    getUserByAlias(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
    );
    expectHeaderToBeSent();
  });

  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent', () => {
    updateUserByAlias(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
      {},
    );
    expectHeaderToBeSent();
  });

  test('PATCH /users/by/<alias_label>/<alias_id>: header is sent with subscription id', () => {
    updateUserByAlias(
      { appId: APP_ID, subscriptionId: SUB_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
      {},
    );
    expectHeaderToBeSent();
  });

  test('DELETE /users/by/<alias_label>/<alias_id>: header is sent', () => {
    deleteUserByAlias(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
    );
    expectHeaderToBeSent();
  });

  test('POST /users/by/<alias_label>/<alias_id>/subscription: header is sent', () => {
    createSubscriptionByAlias(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
      {
        // @ts-expect-error - partial identity object
        subscription: generateNewSubscription()._data,
      },
    );
    expectHeaderToBeSent();
  });

  test('GET /users/by/<alias_label>/<alias_id>/identity: header is sent', () => {
    getUserIdentity(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
    );
    expectHeaderToBeSent();
  });

  test('DELETE /users/by/<alias_label>/<alias_id>/identity/<alias_label_to_delete>: header is sent', () => {
    deleteAlias(
      { appId: APP_ID },
      {
        label: IdentityConstants._ExternalID,
        id: EXTERNAL_ID,
      },
      IdentityConstants._ExternalID,
    );
    expectHeaderToBeSent();
  });

  test('PATCH /subscriptions/<subscription_id>: header is sent', () => {
    updateSubscriptionById(
      { appId: APP_ID },
      EXTERNAL_ID,
      // @ts-expect-error - partial identity object
      {},
    );
    expectHeaderToBeSent();
  });

  test('DELETE /subscriptions/<subscription_id>: header is sent', () => {
    deleteSubscriptionById({ appId: APP_ID }, EXTERNAL_ID);
    expectHeaderToBeSent();
  });
});
