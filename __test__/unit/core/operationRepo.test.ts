import { DELTA_QUEUE_TIME_ADVANCE } from "../../support/constants";
import ModelCache from "../../../src/core/caching/ModelCache";
import CoreModule from "../../../src/core/CoreModule";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import ExecutorBase from "../../../src/core/executors/ExecutorBase";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { CoreDelta } from "../../../src/core/models/CoreDeltas";
import { IdentityModel } from "../../../src/core/models/IdentityModel";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";
import { UserPropertiesModel } from "../../../src/core/models/UserPropertiesModel";
import { OperationRepo } from "../../../src/core/operationRepo/OperationRepo";
import { generateNewSubscription, passIfBroadcastNTimes } from "../../support/helpers/core";

let core: CoreModule;
let coreDirector: CoreModuleDirector;
let broadcastCount = 0;

// class mocks
jest.mock('../../../src/core/caching/ModelCache');
jest.mock('../../../src/onesignal/OneSignal')

describe('OperationRepo tests', () => {

  beforeEach(async () => {
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    jest.useFakeTimers();
    core = new CoreModule();
    coreDirector = new CoreModuleDirector(core);
    await core.init();
    broadcastCount = 0;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('OperationRepo executor store has executor for each model name', async () => {
    const { operationRepo } = core;
    const executorStore = operationRepo?.executorStore;
    Object.values(ModelName).forEach(modelName => {
      const executor = executorStore?.store ? executorStore.store[modelName] : null;
      expect(executor).toBeTruthy();
    });
  });

  test('Model repo delta broadcast is received and processed by operation repo', (done: jest.DoneCallback) => {
    const { modelRepo, operationRepo } = core;
    const executor = operationRepo?.executorStore.store[ModelName.EmailSubscriptions];

    modelRepo?.subscribe(() => {
      broadcastCount+=1;
      passIfBroadcastNTimes(1, broadcastCount, done);
    });

    const processDeltaSpy = jest.spyOn(OperationRepo.prototype as any, "_processDelta");

    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: generateNewSubscription() as OSModel<SupportedModel>,
    });

    jest.runOnlyPendingTimers();

    expect(processDeltaSpy).toHaveBeenCalledTimes(1);
    expect(executor?.operationQueue.length).toBe(1);
    expect(executor?.deltaQueue.length).toBe(0);
  });

  test('Add Subscriptions: multiple delta broadcasts -> two operations of change type: add', (done: jest.DoneCallback) => {
    const { modelRepo, operationRepo } = core;
    const executor = operationRepo?.executorStore.store[ModelName.EmailSubscriptions];

    const processDeltaSpy = jest.spyOn(OperationRepo.prototype as any, "_processDelta");

    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: generateNewSubscription('123') as OSModel<SupportedModel>,
    });

    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: generateNewSubscription('456') as OSModel<SupportedModel>,
    });

    jest.runOnlyPendingTimers();

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(2);
    done();
  });

  test('Update Identity -> one operation of change type: update', (done: jest.DoneCallback) => {
    const { modelRepo, operationRepo } = core;
    const executor = operationRepo?.executorStore.store[ModelName.Identity];

    const processDeltaSpy = jest.spyOn(OperationRepo.prototype as any, "_processDelta");
    const processOperationQueueSpy = jest.spyOn(ExecutorBase.prototype as any, "_processOperationQueue");

    const delta1: CoreDelta<IdentityModel> = {
      changeType: CoreChangeType.Update,
      model: new OSModel<IdentityModel>(ModelName.Identity, {
        id: '123',
        onesignal_id: '123',
      }, 'modelId1'),
      property: 'myAlias',
      oldValue: '',
      newValue: 'newAlias',
    };

    const delta2: CoreDelta<IdentityModel> = {
      changeType: CoreChangeType.Update,
      model: new OSModel<IdentityModel>(ModelName.Identity, {
        id: '123',
        onesignal_id: '123',
      }, 'modelId2'),
      property: 'myAlias2',
      oldValue: '',
      newValue: 'newAlias2',
    };

    modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
    modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

    // advance enough to process all deltas but not enough to process operation queue
    jest.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    // check process operation queue not called. we may change processing intervals in future
    expect(processOperationQueueSpy).toHaveBeenCalledTimes(0);

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(1);

    const operation = executor?.operationQueue[0];
    expect(operation?.model?.modelName).toBe(ModelName.Identity);
    expect(operation?.payload).toEqual({ myAlias: 'newAlias', myAlias2: 'newAlias2' });
    expect(operation?.changeType).toBe(CoreChangeType.Add);

    done();
  });

  test('Update User Properties: -> one operation of change type: update', (done: jest.DoneCallback) => {
    const { modelRepo, operationRepo } = core;
    const executor = operationRepo?.executorStore.store[ModelName.Properties];

    const processDeltaSpy = jest.spyOn(OperationRepo.prototype as any, "_processDelta");
    const processOperationQueueSpy = jest.spyOn(ExecutorBase.prototype as any, "_processOperationQueue");

    const delta1: CoreDelta<UserPropertiesModel> = {
      changeType: CoreChangeType.Update,
      model: new OSModel<UserPropertiesModel>(ModelName.Properties, {}, 'modelId1'),
      property: 'tags',
      oldValue: undefined,
      newValue: { tag1: 'tag1' },
    };

    const delta2: CoreDelta<UserPropertiesModel> = {
      changeType: CoreChangeType.Update,
      model: new OSModel<UserPropertiesModel>(ModelName.Properties, {}, 'modelId2'),
      property: 'tags',
      oldValue: undefined,
      newValue: { tag2: 'tag2' },
    };

    modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
    modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

    // advance enough to process all deltas but not enough to process operation queue
    jest.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    // check process operation queue not called. we may change processing intervals in future
    expect(processOperationQueueSpy).toHaveBeenCalledTimes(0);

    expect(processDeltaSpy).toHaveBeenCalledTimes(2);
    expect(executor?.deltaQueue.length).toBe(0);
    expect(executor?.operationQueue.length).toBe(1);

    const operation = executor?.operationQueue[0];
    expect(operation?.model?.modelName).toBe(ModelName.Properties);
    expect(operation?.payload).toEqual({ tags: { tag1: 'tag1', tag2: 'tag2' } });
    expect(operation?.changeType).toBe(CoreChangeType.Update);

    done();
  });
});
