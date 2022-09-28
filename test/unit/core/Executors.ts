import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import ModelCache from "../../../src/core/caching/ModelCache";
import CoreModule from "../../../src/core/CoreModule";
import { IdentityExecutor } from "../../../src/core/executors/IdentityExecutor";
import { PropertiesExecutor } from "../../../src/core/executors/PropertiesExecutor";
import { SubscriptionExecutor } from "../../../src/core/executors/SubscriptionExecutor";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.stubDomEnvironment();
  sinonSandbox.stub(ModelCache.prototype, "load").resolves({});
  sinonSandbox.stub(ModelCache.prototype, "add").resolves();
  sinonSandbox.stub(ModelCache.prototype, "remove").resolves();
  sinonSandbox.stub(ModelCache.prototype, "update").resolves();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test("Subscriptions executor flushes deltas at end of `processDeltaQueue`", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();

  const processDeltaQueueSpy = sinonSandbox.spy(SubscriptionExecutor.prototype, "processDeltaQueue");
  const flushDeltasSpy = sinonSandbox.spy(SubscriptionExecutor.prototype as any, "_flushDeltas");

  core.modelRepo?.broadcast({
    changeType: CoreChangeType.Add,
    model: new OSModel(ModelName.EmailSubscriptions),
  });

  clock.tick(2001);

  t.is(processDeltaQueueSpy.callCount, 1);
  t.is(flushDeltasSpy.callCount, 1);
});

test("Identity executor flushes deltas at end of `processDeltaQueue`", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();

  const processDeltaQueueSpy = sinonSandbox.spy(IdentityExecutor.prototype, "processDeltaQueue");
  const flushDeltasSpy = sinonSandbox.spy(IdentityExecutor.prototype as any, "_flushDeltas");

  core.modelRepo?.broadcast({
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Identity),
  });

  clock.tick(2001);

  t.is(processDeltaQueueSpy.callCount, 1);
  t.is(flushDeltasSpy.callCount, 1);
});

test("User Properties executor flushes deltas at end of `processDeltaQueue`", async t => {
  const clock = sinon.useFakeTimers();
  const core = new CoreModule();
  await core.init();

  const processDeltaQueueSpy = sinonSandbox.spy(PropertiesExecutor.prototype, "processDeltaQueue");
  const flushDeltasSpy = sinonSandbox.spy(PropertiesExecutor.prototype as any, "_flushDeltas");

  core.modelRepo?.broadcast({
    changeType: CoreChangeType.Update,
    model: new OSModel(ModelName.Properties),
  });

  clock.tick(2001);

  t.is(processDeltaQueueSpy.callCount, 1);
  t.is(flushDeltasSpy.callCount, 1);
});
