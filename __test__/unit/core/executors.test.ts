import { TestEnvironment } from '../../support/environment/TestEnvironment';
import ModelCache from '../../../src/core/caching/ModelCache';
import { IdentityExecutor } from '../../../src/core/executors/IdentityExecutor';
import { PropertiesExecutor } from '../../../src/core/executors/PropertiesExecutor';
import { SubscriptionExecutor } from '../../../src/core/executors/SubscriptionExecutor';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { DELTA_QUEUE_TIME_ADVANCE } from '../../support/constants';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import { generateNewSubscription } from '../../support/helpers/core';
import ExecutorBase from '../../../src/core/executors/ExecutorBase';
import { MockInstance } from 'vitest';

// class mocks
vi.mock('../../../src/core/operationRepo/Operation');

describe('Executor tests', () => {
  let spyProcessOperationQueue: MockInstance;

  beforeEach(async () => {
    spyProcessOperationQueue = vi.spyOn(
      ExecutorBase.prototype as any,
      '_processOperationQueue',
    );

    vi.useFakeTimers();

    vi.spyOn(ModelCache.prototype, 'load').mockResolvedValue({});
    vi.spyOn(
      PropertiesExecutor.prototype,
      'getOperationsFromCache',
    ).mockReturnValue([]);
    vi.spyOn(
      IdentityExecutor.prototype,
      'getOperationsFromCache',
    ).mockReturnValue([]);
    vi.spyOn(
      SubscriptionExecutor.prototype,
      'getOperationsFromCache',
    ).mockReturnValue([]);
    await TestEnvironment.initialize();
  });

  afterAll(async () => {
    vi.runOnlyPendingTimers();
    await Promise.all(
      spyProcessOperationQueue.mock.results.map((element) => {
        return element.value;
      }),
    );

    vi.resetModules();
  });

  /* F L U S H */
  test('Subscriptions executor flushes deltas at end of `processDeltaQueue`', async () => {
    const processDeltaQueueSpy = vi.spyOn(
      SubscriptionExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = vi.spyOn(
      SubscriptionExecutor.prototype as any,
      '_flushDeltas',
    );

    const { modelRepo } = OneSignal.coreDirector.core;
    modelRepo?.broadcast({
      changeType: CoreChangeType.Add,
      model: new OSModel(ModelName.Subscriptions, {}),
    });

    vi.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  test('Identity executor flushes deltas at end of `processDeltaQueue`', async () => {
    const processDeltaQueueSpy = vi.spyOn(
      IdentityExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = vi.spyOn(
      IdentityExecutor.prototype as any,
      '_flushDeltas',
    );

    const { modelRepo } = OneSignal.coreDirector.core;
    modelRepo?.broadcast({
      changeType: CoreChangeType.Update,
      model: new OSModel(ModelName.Identity, {}),
    });

    vi.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  test('User Properties executor flushes deltas at end of `processDeltaQueue`', async () => {
    const processDeltaQueueSpy = vi.spyOn(
      PropertiesExecutor.prototype,
      'processDeltaQueue',
    );
    const flushDeltasSpy = vi.spyOn(
      PropertiesExecutor.prototype as any,
      '_flushDeltas',
    );

    const { modelRepo } = OneSignal.coreDirector.core;
    modelRepo?.broadcast({
      changeType: CoreChangeType.Update,
      model: new OSModel(ModelName.Properties, {}),
    });

    vi.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);

    expect(processDeltaQueueSpy).toHaveBeenCalledTimes(1);
    expect(flushDeltasSpy).toHaveBeenCalledTimes(1);
  });

  /* S U B S C R I P T I O N   E X E C U T O R   H E L P E R S */
  test('separateDeltasByModelId returns correct delta matrix', async () => {
    const model = generateNewSubscription();
    const separateDeltasByModelIdSpy = vi.spyOn(
      SubscriptionExecutor.prototype as any,
      'separateDeltasByModelId',
    );

    const delta = {
      changeType: CoreChangeType.Add,
      model: model as OSModel<SupportedModel>,
    };

    const { modelRepo } = OneSignal.coreDirector.core;
    modelRepo?.broadcast(delta);

    vi.runOnlyPendingTimers();

    const expectedResult: CoreDelta<SupportedModel>[][] = [[delta]];
    expect(separateDeltasByModelIdSpy).toHaveReturnedWith(
      JSON.parse(JSON.stringify(expectedResult)),
    );
  });

  test('separateDeltasByChangeType returns correct delta array map', async () => {
    const model = generateNewSubscription();
    const separateDeltasByChangeTypeSpy = vi.spyOn(
      SubscriptionExecutor.prototype as any,
      'separateDeltasByChangeType',
    );

    const delta = {
      changeType: CoreChangeType.Add,
      model: model as OSModel<SupportedModel>,
    };
    const { modelRepo } = OneSignal.coreDirector.core;
    modelRepo?.broadcast(delta);

    vi.runOnlyPendingTimers();

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
