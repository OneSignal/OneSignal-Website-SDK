import { MockInstance } from 'vitest';
import ModelCache from '../../../src/core/caching/ModelCache';
import ExecutorBase from '../../../src/core/executors/ExecutorBase';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import { IdentityModel } from '../../../src/core/models/IdentityModel';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { UserPropertiesModel } from '../../../src/core/models/UserPropertiesModel';
import { Operation } from '../../../src/core/operationRepo/Operation';
import { OperationRepo } from '../../../src/core/operationRepo/OperationRepo';
import Database from '../../../src/shared/services/Database';
import {
  DELTA_QUEUE_TIME_ADVANCE,
  DUMMY_MODEL_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_PUSH_TOKEN,
} from '../../support/constants';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import {
  generateNewSubscription,
  getDummyIdentityOSModel,
  passIfBroadcastNTimes,
} from '../../support/helpers/core';
import { nock, stub } from '__test__/support/helpers/general';

let broadcastCount = 0;

// class mocks
vi.mock('../../../src/shared/services/Database');

describe('OperationRepo tests', () => {
  let spyProcessOperationQueue: MockInstance;

  beforeEach(async () => {
    spyProcessOperationQueue = vi.spyOn(
      ExecutorBase.prototype as any,
      '_processOperationQueue',
    );
    stub(ModelCache.prototype, 'load', Promise.resolve({}));
    nock({
      onesignal_id: '123',
    });
    vi.useFakeTimers();
    await TestEnvironment.initialize();
    broadcastCount = 0;

    const { operationRepo } = OneSignal.coreDirector.core;

    const identityExecutor =
      operationRepo?.executorStore.store[ModelName.Identity];
    const propertiesExecutor =
      operationRepo?.executorStore.store[ModelName.Properties];
    const subscriptionExecutor =
      operationRepo?.executorStore.store[ModelName.Subscriptions];

    identityExecutor._operationQueue = [];
    propertiesExecutor._operationQueue = [];
    subscriptionExecutor._operationQueue = [];
  });

  afterEach(async () => {
    vi.runOnlyPendingTimers();
    await Promise.all(
      spyProcessOperationQueue.mock.results.map((element) => {
        return element.value;
      }),
    );
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.resetModules();
  });

  test('OperationRepo executor store has executor for each model name', async () => {
    const { operationRepo } = OneSignal.coreDirector.core;
    const executorStore = operationRepo?.executorStore;
    Object.values(ModelName).forEach((modelName) => {
      const executor = executorStore?.store
        ? executorStore.store[modelName]
        : null;
      expect(executor).toBeTruthy();
    });
  });

  test('Model repo delta broadcast is received and processed by operation repo', async () => {
    return new Promise<void>((resolve) => {
      const { modelRepo, operationRepo } = OneSignal.coreDirector.core;
      const executor =
        operationRepo?.executorStore.store[ModelName.Subscriptions];

      modelRepo?.subscribe(() => {
        broadcastCount += 1;
        passIfBroadcastNTimes(1, broadcastCount, resolve);
      });

      const processDeltaSpy = vi.spyOn(
        OperationRepo.prototype as any,
        '_processDelta',
      );
      const subscriptionModel = generateNewSubscription();
      subscriptionModel.setOneSignalId('123');

      modelRepo?.broadcast({
        changeType: CoreChangeType.Add,
        model: subscriptionModel as OSModel<SupportedModel>,
      });

      vi.runOnlyPendingTimers();

      expect(processDeltaSpy).toHaveBeenCalledTimes(1);
      expect(executor?.operationQueue.length).toBe(1);
      expect(executor?.deltaQueue.length).toBe(0);
    });
  });

  test('Add Subscriptions: multiple delta broadcasts -> two operations of change type: add', () => {
    const { modelRepo, operationRepo } = OneSignal.coreDirector.core;
    const executor =
      operationRepo?.executorStore.store[ModelName.Subscriptions];

    const processDeltaSpy = vi.spyOn(
      OperationRepo.prototype as any,
      '_processDelta',
    );

    const subscriptionModel1 = generateNewSubscription('123');
    subscriptionModel1.setOneSignalId(DUMMY_ONESIGNAL_ID);

    const subscriptionModel2 = generateNewSubscription('456');
    subscriptionModel2.setOneSignalId(DUMMY_ONESIGNAL_ID + '2');

    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: subscriptionModel1 as OSModel<SupportedModel>,
    });

    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: subscriptionModel2 as OSModel<SupportedModel>,
    });

    vi.runOnlyPendingTimers();

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(2);
  });

  test('Update Identity -> one operation of change type: update', () => {
    stub(Operation, 'getInstanceWithModelReference');
    nock({ identity: { onesignal_id: DUMMY_ONESIGNAL_ID } });

    const { modelRepo, operationRepo } = OneSignal.coreDirector.core;
    const executor = operationRepo?.executorStore.store[ModelName.Identity];

    const processDeltaSpy = vi.spyOn(
      OperationRepo.prototype as any,
      '_processDelta',
    );
    const processOperationQueueSpy = vi.spyOn(
      ExecutorBase.prototype as any,
      '_processOperationQueue',
    );

    const identityModel = getDummyIdentityOSModel();
    identityModel.setOneSignalId(DUMMY_ONESIGNAL_ID);
    identityModel.data.onesignal_id = DUMMY_ONESIGNAL_ID;

    const delta1: CoreDelta<IdentityModel> = {
      changeType: CoreChangeType.Update,
      model: identityModel as OSModel<IdentityModel>,
      property: 'myAlias',
      oldValue: '',
      newValue: 'newAlias',
    };

    const delta2: CoreDelta<IdentityModel> = {
      changeType: CoreChangeType.Update,
      model: identityModel as OSModel<IdentityModel>,
      property: 'myAlias2',
      oldValue: '',
      newValue: 'newAlias2',
    };

    modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
    modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

    // advance enough to process all deltas but not enough to process operation queue
    vi.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    // check process operation queue not called. we may change processing intervals in future
    expect(processOperationQueueSpy).toHaveBeenCalledTimes(0);

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(1);

    const operation = executor?.operationQueue[0];
    expect(operation?.model?.modelName).toBe(ModelName.Identity);
    expect(operation?.payload).toEqual({
      myAlias: 'newAlias',
      myAlias2: 'newAlias2',
    });
    expect(operation?.changeType).toBe(CoreChangeType.Add);
  });

  test('Update User Properties: -> one operation of change type: update', () => {
    stub(Operation, 'getInstanceWithModelReference');

    stub(
      Database,
      'getAppState',
      Promise.resolve({
        lastKnownPushToken: DUMMY_PUSH_TOKEN,
      }),
    );

    const { modelRepo, operationRepo } = OneSignal.coreDirector.core;
    const executor = operationRepo?.executorStore.store[ModelName.Properties];

    const processDeltaSpy = vi.spyOn(
      OperationRepo.prototype as any,
      '_processDelta',
    );
    const processOperationQueueSpy = vi.spyOn(
      ExecutorBase.prototype as any,
      '_processOperationQueue',
    );

    const propertiesModel = new OSModel<UserPropertiesModel>(
      ModelName.Properties,
      {},
      DUMMY_MODEL_ID,
    );
    propertiesModel.setOneSignalId(DUMMY_ONESIGNAL_ID);

    const delta1: CoreDelta<UserPropertiesModel> = {
      changeType: CoreChangeType.Update,
      model: propertiesModel,
      property: 'tags',
      oldValue: undefined,
      newValue: { tag1: 'tag1' },
    };

    const delta2: CoreDelta<UserPropertiesModel> = {
      changeType: CoreChangeType.Update,
      model: propertiesModel,
      property: 'tags',
      oldValue: undefined,
      newValue: { tag2: 'tag2' },
    };

    modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
    modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

    // advance enough to process all deltas but not enough to process operation queue
    vi.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    // check process operation queue not called. we may change processing intervals in future
    expect(processOperationQueueSpy).toHaveBeenCalledTimes(0);

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(1);

    const operation = executor?.operationQueue[0];
    expect(operation?.model?.modelName).toBe(ModelName.Properties);
    expect(operation?.payload).toEqual({
      tags: { tag1: 'tag1', tag2: 'tag2' },
    });
    expect(operation?.changeType).toBe(CoreChangeType.Update);
  });
});
