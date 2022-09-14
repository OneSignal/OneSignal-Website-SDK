import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import ModelCache from "../../../src/core/caching/ModelCache";
import CoreModule from "../../../src/core/CoreModule";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import { ModelRepo } from "../../../src/core/modelRepo/ModelRepo";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { ModelName } from "../../../src/core/models/SupportedModels";
import { generateNewSubscription } from "./_helpers";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

type Globals = {
  core: CoreModule;
  coreDirector: CoreModuleDirector;
};

declare var global: Globals;

test.beforeEach(async () => {
  sinonSandbox.stub(ModelCache.prototype, "load").resolves();
  sinonSandbox.stub(ModelCache.prototype, "add").resolves();
  sinonSandbox.stub(ModelCache.prototype, "remove").resolves();
  sinonSandbox.stub(ModelCache.prototype, "update").resolves();
  global.core = new CoreModule();
  global.coreDirector = new CoreModuleDirector(global.core);
  await global.core.init();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

/* M O D E L   C H A N G E   T Y P E S */
test("Add subscription -> +1 subscription model in model store", async t => {
  const processModelAddedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelAdded");
  const newSub = generateNewSubscription();
  const emailSubModels = await global.coreDirector.getEmailSubscriptionModels();

  if (emailSubModels === undefined) {
    t.fail("Email subscription models are undefined");
    return;
  }

  t.is(Object.keys(emailSubModels).length, 0);
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  t.is(Object.keys(emailSubModels).length, 1);
  t.true(processModelAddedSpy.calledOnce);
});

test("Remove subscription -> -1 subscription model in model store", async t => {
  const processModelRemovedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelRemoved");
  const newSub = generateNewSubscription();
  const emailSubModels = await global.coreDirector.getEmailSubscriptionModels();

  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  t.is(Object.keys(emailSubModels).length, 1);
  await global.coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
  t.is(Object.keys(emailSubModels).length, 0);
  t.true(processModelRemovedSpy.calledOnce);
});

test("Update model properties -> change is processed correctly", async t => {
  const processModelUpdatedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelUpdated");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  newSub.set("rooted", true); // trigger model update
  t.true(processModelUpdatedSpy.calledOnce);

  const emailSubModels = await global.coreDirector.getEmailSubscriptionModels();
  const emailModel = emailSubModels[newSub.id];
  t.is(emailModel.data?.rooted, true);
});

/* D E L T A S */
test("Add subscription -> delta is broadcasted", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  t.true(broadcastSpy.calledOnce);
});

test("Remove subscription -> delta is broadcasted", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  await global.coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
  t.true(broadcastSpy.calledTwice);
});

test("Update model properties -> delta is broadcasted", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  newSub.set("rooted", true); // trigger model update
  t.true(broadcastSpy.calledTwice);
});

test("Add subscription -> delta is broadcasted with correct change type and payload", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  const broadcastedDelta = broadcastSpy.getCall(0).args[0];
  t.is(broadcastedDelta.changeType, CoreChangeType.Add);
  t.deepEqual(broadcastedDelta.model, newSub);
});

test("Remove subscription -> delta is broadcasted with correct change type and payload", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  await global.coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
  const broadcastedDelta = broadcastSpy.getCall(1).args[0];
  t.is(broadcastedDelta.changeType, CoreChangeType.Remove);
  t.deepEqual(broadcastedDelta.model.data, newSub.data);
  t.is(broadcastedDelta.model.id, newSub.id);
  t.is(broadcastedDelta.model.modelName, newSub.modelName);
});

test("Update model properties -> delta is broadcasted with correct change type and payload", async t => {
  const broadcastSpy = sinonSandbox.spy(ModelRepo.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  await global.coreDirector.add(ModelName.EmailSubscriptions, newSub);
  newSub.set("rooted", true); // trigger model update
  const broadcastedDelta = broadcastSpy.getCall(1).args[0];
  t.is(broadcastedDelta.changeType, CoreChangeType.Update);
  t.is(broadcastedDelta.property, "rooted");
  t.is(broadcastedDelta.newValue, true);
  t.is(broadcastedDelta.oldValue, undefined);
});
