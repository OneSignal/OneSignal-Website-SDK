import test from "ava";
import OperationCache from "../../../src/core/caching/OperationCache";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { Operation } from "../../../src/core/operationRepo/Operation";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { getMockDeltas } from "./_helpers";

test.beforeEach(async () => {
  await TestEnvironment.initialize();
});

test("Add operation to cache -> operation queue +1", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  t.is(OperationCache.getOperations().length, 1);
});

test("Remove operation from cache -> operation queue -1", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  t.is(OperationCache.getOperations().length, 1);
  OperationCache.delete(operation.operationId);
  t.is(OperationCache.getOperations().length, 0);
});

test("Add multiple operations to cache -> operation queue +2", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  t.is(OperationCache.getOperations().length, 1);
  OperationCache.enqueue(operation2);
  t.is(OperationCache.getOperations().length, 2);
});

test("Flush operation cache -> operation queue 0", async t => {
  const operation = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  const operation2 = new Operation(CoreChangeType.Add, ModelName.Identity, getMockDeltas());
  OperationCache.enqueue(operation);
  t.is(OperationCache.getOperations().length, 1);
  OperationCache.enqueue(operation2);
  t.is(OperationCache.getOperations().length, 2);
  OperationCache.flushOperations();
  t.is(OperationCache.getOperations().length, 0);
});
