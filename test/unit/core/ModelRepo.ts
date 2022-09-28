import test, { ExecutionContext } from "ava";
import sinon, { SinonSandbox } from "sinon";
import CoreModule from "../../../src/core/CoreModule";
import { CoreModuleDirector } from "../../../src/core/CoreModuleDirector";
import { ModelRepo } from "../../../src/core/modelRepo/ModelRepo";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { CoreDelta } from "../../../src/core/models/CoreDeltas";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";
import { isPropertyDelta } from "../../../src/core/utils/typePredicates";
import { generateNewSubscription, passIfBroadcastNTimes, stubModelCache } from "./_helpers";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

let broadcastCount: number;
let core: CoreModule;
let coreDirector: CoreModuleDirector;

test.beforeEach(async () => {
  stubModelCache(sinonSandbox);
  core = new CoreModule();
  coreDirector = new CoreModuleDirector(core);
  await core.init();
  broadcastCount = 0;
});

test.afterEach(() => {
  sinonSandbox.restore();
});

/* M O D E L   C H A N G E   T Y P E S */
test("Add subscription -> +1 subscription model in model store", async t => {
  const processModelAddedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelAdded");
  const newSub = generateNewSubscription();
  const emailSubModels = await coreDirector.getEmailSubscriptionModels();

  if (emailSubModels === undefined) {
    t.fail("Email subscription models are undefined");
    return;
  }

  t.is(Object.keys(emailSubModels).length, 0);
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  t.is(Object.keys(emailSubModels).length, 1);
  t.true(processModelAddedSpy.calledOnce);
});

test("Remove subscription -> -1 subscription model in model store", async t => {
  const processModelRemovedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelRemoved");
  const newSub = generateNewSubscription();
  const emailSubModels = await coreDirector.getEmailSubscriptionModels();

  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  t.is(Object.keys(emailSubModels).length, 1);
  await coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
  t.is(Object.keys(emailSubModels).length, 0);
  t.true(processModelRemovedSpy.calledOnce);
});

test("Update model properties -> change is processed correctly", async t => {
  const processModelUpdatedSpy = sinonSandbox.spy(ModelRepo.prototype as any, "processModelUpdated");
  const newSub = generateNewSubscription();
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  newSub.set("rooted", true); // trigger model update
  t.true(processModelUpdatedSpy.calledOnce);

  const emailSubModels = await coreDirector.getEmailSubscriptionModels();
  const emailModel = emailSubModels[newSub.id];
  t.is(emailModel.data?.rooted, true);
});

/* D E L T A S */
test("Add subscription -> delta is broadcasted once", async t => {
  core.modelRepo?.subscribe(() => {
    broadcastCount+=1;
    passIfBroadcastNTimes(t, 1, broadcastCount);
  });
  const newSub = generateNewSubscription();
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
});

test("Remove subscription -> delta is broadcasted twice", async t => {
  core.modelRepo?.subscribe(() => {
    broadcastCount+=1;
    passIfBroadcastNTimes(t, 2, broadcastCount);
  });
  const newSub = generateNewSubscription();
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  await coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
});

test("Update model properties -> delta is broadcasted twice", async t => {
  core.modelRepo?.subscribe(() => {
    broadcastCount+=1;
    passIfBroadcastNTimes(t, 2, broadcastCount);
  });
  const newSub = generateNewSubscription();
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  newSub.set("rooted", true); // trigger model update
});

test("Add subscription -> delta is broadcasted with correct change type and payload", async t => {
  const newSub = generateNewSubscription();
  core.modelRepo?.subscribe((delta: CoreDelta<SupportedModel>) => {
    t.is(delta.changeType, CoreChangeType.Add);
    t.deepEqual(delta.model, newSub as OSModel<SupportedModel>);
  });
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
});

test("Remove subscription -> delta is broadcasted with correct change type and payload", async t => {
  const newSub = generateNewSubscription();
  core.modelRepo?.subscribe((delta: CoreDelta<SupportedModel>) => {
    broadcastCount+=1;
    if (broadcastCount === 1) {
      t.is(delta.changeType, CoreChangeType.Add);
      t.deepEqual(delta.model, newSub as OSModel<SupportedModel>);
      t.is(delta.model.modelName, newSub.modelName);
      t.is(delta.model.id, newSub.id);
    } else if (broadcastCount === 2) {
      t.is(delta.changeType, CoreChangeType.Remove);
    }
  });

  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);
  await coreDirector.remove(ModelName.EmailSubscriptions, newSub.id);
});

test("Update model properties -> delta is broadcasted with correct change type and payload", async t => {
  const newSub = generateNewSubscription();
  await coreDirector.add(ModelName.EmailSubscriptions, newSub as OSModel<SupportedModel>);

  core.modelRepo?.subscribe(delta => {
    if (isPropertyDelta(delta)) {
      t.is(delta.changeType, CoreChangeType.Update);
      t.is(delta.property, "rooted");
      t.is(delta.newValue, true);
      t.is(delta.oldValue, undefined);
    }
  });
  newSub.set("rooted", true); // trigger model update
});
