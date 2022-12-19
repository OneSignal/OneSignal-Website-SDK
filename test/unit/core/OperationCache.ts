import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import OperationCache from "../../../src/core/caching/OperationCache";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { Operation } from "../../../src/core/operationRepo/Operation";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { getDummyIdentityOSModel, getMockDeltas } from "./_helpers";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  sinon.useFakeTimers();
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  sinonSandbox.stub(CoreModuleDirector.prototype, "getModelByTypeAndId").callsFake(() => {
    return getDummyIdentityOSModel();
  });
});

test("Add operation to cache -> operation queue +1", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  const operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 1);
});

test("Remove operation from cache -> operation queue -1", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  let operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 1);
  OperationCache.delete(operation.operationId);
  operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 0);
});

test("Add multiple operations to cache -> operation queue +2", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  let operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 1);
  OperationCache.enqueue(operation2);
  operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 2);
});

test("Flush operation cache -> operation queue 0", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  let operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 1);
  OperationCache.enqueue(operation2);
  operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 2);
  OperationCache.flushOperations();
  operations = await OperationCache.getOperationsWithModelName(ModelName.Identity);
  t.is(operations.length, 0);
});
