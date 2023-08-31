import { TestEnvironment } from '../../support/environment/TestEnvironment';
import ModelCache from '../../../src/core/caching/ModelCache';
import CoreModule from '../../../src/core/CoreModule';
import { IdentityExecutor } from '../../../src/core/executors/IdentityExecutor';
import { PropertiesExecutor } from '../../../src/core/executors/PropertiesExecutor';
import { SubscriptionExecutor } from '../../../src/core/executors/SubscriptionExecutor';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import { generateNewSubscription } from '../../support/helpers/core';
import 'jest-localstorage-mock';
import ExecutorBase from '../../../src/core/executors/ExecutorBase';

// class mocks
jest.mock('../../../src/core/operationRepo/Operation');

describe('Executor tests', () => {
  let spyProcessOperationQueue:
    | jest.SpyInstance<void, [() => Promise<void>], any>
    | jest.SpyInstance<void>;

  beforeEach(() => {
    spyProcessOperationQueue = jest.spyOn(
      ExecutorBase.prototype as any,
      '_processOperationQueue',
    );

    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    test.stub(PropertiesExecutor.prototype, 'getOperationsFromCache', []);
    test.stub(IdentityExecutor.prototype, 'getOperationsFromCache', []);
    test.stub(SubscriptionExecutor.prototype, 'getOperationsFromCache', []);
    TestEnvironment.initialize();
  });

  afterAll(async () => {
    jest.runOnlyPendingTimers();
    await Promise.all(
      spyProcessOperationQueue.mock.results.map((element) => {
        return element.value;
      }),
    );

    jest.resetModules();
  });

  /* F L U S H */
  test('Subscriptions executor flushes deltas at end of `processDeltaQueue`', async () => {
    const core = new CoreModule();
    await core.init();

    const processDeltaQueueSpy = jest.spyOn(
      SubscriptionExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = jest.spyOn(
      SubscriptionExecutor.prototype as any,
      '_flushDeltas',
    );

    core.modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: new OSModel(ModelName.EmailSubscriptions, {}),
    });

    jest.runOnlyPendingTimers();

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  test('Identity executor flushes deltas at end of `processDeltaQueue`', async () => {
    const core = new CoreModule();
    await core.init();

    const processDeltaQueueSpy = jest.spyOn(
      IdentityExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = jest.spyOn(
      IdentityExecutor.prototype as any,
      '_flushDeltas',
    );

    core.modelRepo?.broadcast({
      changeType: CoreChangeType.Update,
      model: new OSModel(ModelName.Identity, {}),
    });

    jest.runOnlyPendingTimers();

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  test('User Properties executor flushes deltas at end of `processDeltaQueue`', async () => {
    const core = new CoreModule();
    await core.init();

    const processDeltaQueueSpy = jest.spyOn(
      PropertiesExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = jest.spyOn(
      PropertiesExecutor.prototype as any,
      '_flushDeltas',
    );

    core.modelRepo?.broadcast({
      changeType: CoreChangeType.Update,
      model: new OSModel(ModelName.Properties, {}),
    });

    jest.runOnlyPendingTimers();

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  /* S U B S C R I P T I O N   E X E C U T O R   H E L P E R S */
  test('separateDeltasByModelId returns correct delta matrix', async () => {
    const core = new CoreModule();
    await core.init();

    const model = generateNewSubscription();
    const separateDeltasByModelIdSpy = jest.spyOn(
      SubscriptionExecutor.prototype as any,
      'separateDeltasByModelId',
    );

    const delta = {
      changeType: CoreChangeType.Add,
      model: model as OSModel<SupportedModel>,
    };

    core.modelRepo?.broadcast(delta);

    jest.runOnlyPendingTimers();

    const expectedResult: CoreDelta<SupportedModel>[][] = [[delta]];
    expect(separateDeltasByModelIdSpy).toHaveReturnedWith(
      JSON.parse(JSON.stringify(expectedResult)),
    );
  });

  test('separateDeltasByChangeType returns correct delta array map', async () => {
    const core = new CoreModule();
    await core.init();

    const model = generateNewSubscription();
    const separateDeltasByChangeTypeSpy = jest.spyOn(
      SubscriptionExecutor.prototype as any,
      'separateDeltasByChangeType',
    );

    const delta = {
      changeType: CoreChangeType.Add,
      model: model as OSModel<SupportedModel>,
    };
    core.modelRepo?.broadcast(delta);

    jest.runOnlyPendingTimers();

    const expectedResult: Partial<{
      [key in CoreChangeType]: CoreDelta<SupportedModel>[];
    }> = {
      [CoreChangeType.Add]: [delta],
      [CoreChangeType.Update]: [],
      [CoreChangeType.Remove]: [],
    };

    // use JSON.parse and stringify to only get defined public values
    expect(separateDeltasByChangeTypeSpy).toHaveReturnedWith(
      JSON.parse(JSON.stringify(expectedResult)),
    );
  });
});
