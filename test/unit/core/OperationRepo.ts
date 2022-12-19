import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import CoreModule from "../../../src/core/CoreModule";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { CoreDelta } from "../../../src/core/models/CoreDeltas";
import { IdentityModel } from "../../../src/core/models/IdentityModel";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";
import { OperationRepo } from "../../../src/core/operationRepo/OperationRepo";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { passIfBroadcastNTimes, stubModelCache } from "./_helpers";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
let broadcastCount: number;

test.beforeEach(async () => {
  await TestEnvironment.stubDomEnvironment();
  stubModelCache(sinonSandbox);
  broadcastCount = 0;
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test("OperationRepo executor store has executor for each model name", async t => {
  sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();
  const { operationRepo } = core;
  const executorStore = operationRepo?.executorStore;
  Object.values(ModelName).forEach(modelName => {
    const executor = executorStore ? executorStore[modelName] : null;
    t.truthy(executor);
  });
});

test("Model repo delta broadcast is received and processed by operation repo", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();
  const { modelRepo, operationRepo } = core;
  const executor = operationRepo?.executorStore[ModelName.EmailSubscriptions];

  modelRepo?.subscribe(() => {
    passIfBroadcastNTimes(t, 1, broadcastCount);
  });

  const processDeltaSpy = sinonSandbox.spy(OperationRepo.prototype as any, "processDelta");

  modelRepo?.broadcast({
    changeType: CoreChangeType.Add,
    model: new OSModel(ModelName.EmailSubscriptions),
  });

  clock.tick(1001);

  t.true(processDeltaSpy.calledOnce);
  t.is(executor?.operationQueue.length, 1);
  t.is(executor?.deltaQueue.length, 0);
});

test("Add Subscriptions: Multiple delta broadcasts -> two operations of change type: add", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();
  const { modelRepo, operationRepo } = core;
  const executor = operationRepo?.executorStore[ModelName.EmailSubscriptions];

  modelRepo?.subscribe(() => {
    passIfBroadcastNTimes(t, 2, broadcastCount);
  });

  const processDeltaSpy = sinonSandbox.spy(OperationRepo.prototype as any, "processDelta");

  modelRepo?.broadcast({
    changeType: CoreChangeType.Add,
    model: new OSModel(ModelName.EmailSubscriptions),
  });
  modelRepo?.broadcast({
    changeType: CoreChangeType.Add,
    model: new OSModel(ModelName.EmailSubscriptions),
  });

  clock.tick(1001);

  t.true(processDeltaSpy.calledTwice);
  t.is(executor?.operationQueue.length, 2);
  t.is(executor?.deltaQueue.length, 0);
});

test("Update Identity: Multiple delta broadcasts -> one operation of change type: update", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();
  const { modelRepo, operationRepo } = core;
  const executor = operationRepo?.executorStore[ModelName.Identity];

  modelRepo?.subscribe(() => {
    passIfBroadcastNTimes(t, 2, broadcastCount);
  });

  const processDeltaSpy = sinonSandbox.spy(OperationRepo.prototype as any, "processDelta");

  const delta1: CoreDelta<IdentityModel> = {
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Identity),
    property: "myAlias",
    oldValue: "",
    newValue: "myNewAlias",
  };

  const delta2: CoreDelta<IdentityModel> = {
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Identity),
    property: "myAlias2",
    oldValue: "",
    newValue: "myNewAlias2",
  };

  modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
  modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

  clock.tick(1001);

  t.true(processDeltaSpy.calledTwice);
  t.is(executor?.operationQueue.length, 1);
  t.is(executor?.deltaQueue.length, 0);

  const operation = executor?.operationQueue[0];
  t.is(operation?.changeType, CoreChangeType.Add); // adding identity since old value was ""
  t.is(operation?.model?.modelName, ModelName.Identity);
  t.deepEqual(operation?.payload, { myAlias: "myNewAlias", myAlias2: "myNewAlias2" });
});

test("Update User Properties -> one operation of change type: update", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();
  const { modelRepo, operationRepo } = core;
  const executor = operationRepo?.executorStore[ModelName.Properties];

  modelRepo?.subscribe(() => {
    passIfBroadcastNTimes(t, 2, broadcastCount);
  });
  const processDeltaSpy = sinonSandbox.spy(OperationRepo.prototype as any, "processDelta");

  const delta1: CoreDelta<IdentityModel> = {
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Properties),
    property: "tags",
    oldValue: undefined,
    newValue: { tag2: "tag2" },
  };

  const delta2: CoreDelta<IdentityModel> = {
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Properties),
    property: "tags",
    oldValue: undefined,
    newValue: { tag1: "tag1" },
  };

  modelRepo?.broadcast(delta1 as CoreDelta<SupportedModel>);
  modelRepo?.broadcast(delta2 as CoreDelta<SupportedModel>);

  clock.tick(1001);

  t.true(processDeltaSpy.calledTwice);
  t.is(executor?.operationQueue.length, 1);
  t.is(executor?.deltaQueue.length, 0);

  const operation = executor?.operationQueue[0];
  t.is(operation?.changeType, CoreChangeType.Update);
  t.is(operation?.model?.modelName, ModelName.Properties);
  t.deepEqual(operation?.payload, { tags: { tag1: "tag1", tag2: "tag2" } });
});
