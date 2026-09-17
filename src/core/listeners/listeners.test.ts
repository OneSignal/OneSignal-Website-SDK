import { EXTERNAL_ID, ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { IdentityConstants } from '../constants';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { type Operation } from '../operations/Operation';
import { type IOperationRepo } from '../types/operation';
import { IdentityModelStoreListener } from './IdentityModelStoreListener';
import { PropertiesModelStoreListener } from './PropertiesModelStoreListener';
import { SubscriptionModelStoreListener } from './SubscriptionModelStoreListener';

const enqueue = vi.fn<(op: Operation) => void>();
const opRepo: IOperationRepo = { _enqueue: enqueue, _containsInstanceOf: () => false };

const lastEnqueued = () => enqueue.mock.calls.at(-1)?.[0];

const newSubscriptionModel = () => {
  const model = new SubscriptionModel();
  model._mergeData({
    id: 'sub-id',
    type: SubscriptionType._Email,
    token: 'a@b.c',
    enabled: true,
  });
  return model;
};

describe('model store listeners snapshot the owner onto each operation', () => {
  let identityModelStore: IdentityModelStore;
  let propertiesModelStore: PropertiesModelStore;
  let subscriptionModelStore: SubscriptionModelStore;

  // getAppId reads the global OneSignal config.
  beforeAll(() => {
    TestEnvironment.initialize();
  });

  beforeEach(() => {
    identityModelStore = new IdentityModelStore();
    propertiesModelStore = new PropertiesModelStore();
    subscriptionModelStore = new SubscriptionModelStore();
    identityModelStore._model._onesignalId = ONESIGNAL_ID;
    propertiesModelStore._model._onesignalId = ONESIGNAL_ID;

    new IdentityModelStoreListener(identityModelStore, opRepo);
    new PropertiesModelStoreListener(propertiesModelStore, opRepo, identityModelStore);
    new SubscriptionModelStoreListener(subscriptionModelStore, opRepo, identityModelStore);
  });

  describe('identified user', () => {
    beforeEach(() => {
      identityModelStore._model._externalId = EXTERNAL_ID;
      enqueue.mockClear();
    });

    test('alias set and delete carry the externalId', () => {
      identityModelStore._model._setProperty('label', 'value');
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);

      identityModelStore._model._setProperty('label', undefined);
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);
    });

    test('setting the external_id alias itself carries the new value', () => {
      identityModelStore._model._setProperty(IdentityConstants._ExternalID, 'new-id');
      expect(lastEnqueued()?._externalId).toBe('new-id');
    });

    test('property update carries the externalId', () => {
      propertiesModelStore._model._setProperty('language', 'fr');
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);
    });

    test('subscription add, update, and remove carry the externalId', () => {
      const model = newSubscriptionModel();
      subscriptionModelStore._add(model);
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);

      model._setProperty('enabled', false);
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);

      subscriptionModelStore._remove(model._modelId);
      expect(lastEnqueued()?._externalId).toBe(EXTERNAL_ID);
    });
  });

  describe('anonymous user', () => {
    beforeEach(() => enqueue.mockClear());

    test('operations from every listener have no externalId', () => {
      identityModelStore._model._setProperty('label', 'value');
      propertiesModelStore._model._setProperty('language', 'fr');
      subscriptionModelStore._add(newSubscriptionModel());

      expect(enqueue).toHaveBeenCalledTimes(3);
      enqueue.mock.calls.forEach(([op]) => expect(op._externalId).toBeUndefined());
    });
  });
});
