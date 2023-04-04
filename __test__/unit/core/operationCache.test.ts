import ModelCache from "../../../src/core/caching/ModelCache";
import OperationCache from "../../../src/core/caching/OperationCache";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { Operation } from "../../../src/core/operationRepo/Operation";
import { getDummyIdentityOSModel, getMockDeltas } from "../../support/helpers/core";
import { TestEnvironment } from "../../support/environment/TestEnvironment";

describe('OperationCache: operation results in correct operation queue result', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    await TestEnvironment.initialize();
    OneSignal.coreDirector.add(ModelName.Identity, getDummyIdentityOSModel());
    jest.runOnlyPendingTimers();
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('Add operation to cache -> operation queue +1', async () => {
    const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    OperationCache.enqueue(operation);
    const operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(1);
  });

  test('Remove operation from cache -> operation queue -1', async () => {
    const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    OperationCache.enqueue(operation);
    const operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(1);
    OperationCache.delete(operation.operationId);
    const operations2 = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations2.length).toBe(0);
  });

  test('Add multiple operations to cache -> operation queue +2', async () => {
    const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    OperationCache.enqueue(operation);
    let operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(1);
    OperationCache.enqueue(operation2);
    operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(2);
  });

  test('Flush operation cache -> operation queue 0', async () => {
    const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
    OperationCache.enqueue(operation);
    let operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(1);
    OperationCache.enqueue(operation2);
    operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(2);
    OperationCache.flushOperations();
    operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
    expect(operations.length).toBe(0);
  });
});
