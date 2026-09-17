import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { describe, expect, test } from 'vite-plus/test';

import { OPERATION_NAME } from '../constants';
import { OperationModelStore } from '../modelRepo/OperationModelStore';
import { CreateSubscriptionOperation } from './CreateSubscriptionOperation';
import { DeleteAliasOperation } from './DeleteAliasOperation';
import { DeleteSubscriptionOperation } from './DeleteSubscriptionOperation';
import { LoginUserOperation } from './LoginUserOperation';
import { type Operation } from './Operation';
import { RefreshUserOperation } from './RefreshUserOperation';
import { SetAliasOperation } from './SetAliasOperation';
import { SetPropertyOperation } from './SetPropertyOperation';
import { TrackCustomEventOperation } from './TrackCustomEventOperation';
import { TransferSubscriptionOperation } from './TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from './UpdateSubscriptionOperation';

const subscription = {
  appId: APP_ID,
  onesignalId: ONESIGNAL_ID,
  subscriptionId: SUB_ID,
  token: 'token',
  type: SubscriptionType._ChromePush,
};

const event = { name: 'purchase', properties: {} };

// [name, identified, anonymous] for every concrete operation type.
const cases: [string, Operation, Operation][] = [
  [
    OPERATION_NAME._SetAlias,
    new SetAliasOperation(APP_ID, ONESIGNAL_ID, 'label', 'value', EXTERNAL_ID),
    new SetAliasOperation(APP_ID, ONESIGNAL_ID, 'label', 'value'),
  ],
  [
    OPERATION_NAME._DeleteAlias,
    new DeleteAliasOperation(APP_ID, ONESIGNAL_ID, 'label', EXTERNAL_ID),
    new DeleteAliasOperation(APP_ID, ONESIGNAL_ID, 'label'),
  ],
  [
    OPERATION_NAME._SetProperty,
    new SetPropertyOperation(APP_ID, ONESIGNAL_ID, 'language', 'en', EXTERNAL_ID),
    new SetPropertyOperation(APP_ID, ONESIGNAL_ID, 'language', 'en'),
  ],
  [
    OPERATION_NAME._RefreshUser,
    new RefreshUserOperation(APP_ID, ONESIGNAL_ID, EXTERNAL_ID),
    new RefreshUserOperation(APP_ID, ONESIGNAL_ID),
  ],
  [
    OPERATION_NAME._LoginUser,
    new LoginUserOperation(APP_ID, ONESIGNAL_ID, EXTERNAL_ID),
    new LoginUserOperation(APP_ID, ONESIGNAL_ID),
  ],
  [
    OPERATION_NAME._CreateSubscription,
    new CreateSubscriptionOperation({ ...subscription, externalId: EXTERNAL_ID }),
    new CreateSubscriptionOperation(subscription),
  ],
  [
    OPERATION_NAME._UpdateSubscription,
    new UpdateSubscriptionOperation({ ...subscription, externalId: EXTERNAL_ID }),
    new UpdateSubscriptionOperation(subscription),
  ],
  [
    OPERATION_NAME._DeleteSubscription,
    new DeleteSubscriptionOperation(APP_ID, ONESIGNAL_ID, SUB_ID, EXTERNAL_ID),
    new DeleteSubscriptionOperation(APP_ID, ONESIGNAL_ID, SUB_ID),
  ],
  [
    OPERATION_NAME._TransferSubscription,
    new TransferSubscriptionOperation(APP_ID, ONESIGNAL_ID, SUB_ID, EXTERNAL_ID),
    new TransferSubscriptionOperation(APP_ID, ONESIGNAL_ID, SUB_ID),
  ],
  [
    OPERATION_NAME._CustomEvent,
    new TrackCustomEventOperation({
      appId: APP_ID,
      onesignalId: ONESIGNAL_ID,
      externalId: EXTERNAL_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
      event,
    }),
    new TrackCustomEventOperation({
      appId: APP_ID,
      onesignalId: ONESIGNAL_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
      event,
    }),
  ],
];

describe('Operation owner', () => {
  describe.each(cases)('%s', (name, identified, anonymous) => {
    test('carries the externalId it was built with', () => {
      expect(identified._name).toBe(name);
      expect(identified._externalId).toBe(EXTERNAL_ID);
      expect(identified.toJSON()).toMatchObject({ externalId: EXTERNAL_ID });
    });

    test('an anonymous operation has no externalId key, so persisted JSON is unchanged', () => {
      expect(anonymous._externalId).toBeUndefined();
      expect(anonymous.toJSON()).not.toHaveProperty('externalId');
    });

    test('requires a JWT by default', () => {
      expect(identified._requiresJwt).toBe(true);
      expect(anonymous._requiresJwt).toBe(true);
    });

    test('round-trips the externalId through the operation store', () => {
      const store = new OperationModelStore();
      const row = { ...identified.toJSON(), modelId: identified._modelId };
      const restored = store._create(row);

      expect(restored).toBeInstanceOf(identified.constructor);
      expect(restored?._externalId).toBe(EXTERNAL_ID);
    });
  });

  test('a row persisted before this field existed rehydrates as anonymous', () => {
    const store = new OperationModelStore();
    const row = {
      name: OPERATION_NAME._SetAlias,
      appId: APP_ID,
      onesignalId: ONESIGNAL_ID,
      label: 'label',
      value: 'value',
    };
    const legacy = store._create(row);

    expect(legacy?._externalId).toBeUndefined();
    expect(legacy?._requiresJwt).toBe(true);
  });
});
