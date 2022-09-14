import test from "ava";
import { generateNewSubscription } from "./_helpers";
import sinon, { SinonSandbox } from "sinon";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { SubscriptionType } from "../../../src/core/models/SubscriptionModels";
import { ModelName } from "../../../src/core/models/SupportedModels";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test("`Set` function updates data", async t => {
  const newSub = generateNewSubscription();
  t.is(newSub.data?.rooted, undefined);
  newSub.set("rooted", true);
  t.is(newSub.data?.rooted, true);
});

test("`Set` function broadcasts update event", async t => {
  const broadcastSpy = sinonSandbox.spy(OSModel.prototype as any, "broadcast");
  const newSub = generateNewSubscription();
  newSub.set("rooted", true);
  t.true(broadcastSpy.calledOnce);
});

test("`Hydrate` function updates data", async t => {
  const newSub = generateNewSubscription();
  t.is(newSub.data?.type, SubscriptionType.Email);
  newSub.hydrate({ type: SubscriptionType.ChromePush });
  t.is(newSub.data?.type, SubscriptionType.ChromePush);
  t.deepEqual(newSub.data, { type: SubscriptionType.ChromePush });
});

test("`Encode` function returns encoded model", async t => {
  const newSub = generateNewSubscription();
  const encodedSub = newSub.encode();
  t.deepEqual(encodedSub, {
    modelId: "333333",
    modelName: ModelName.EmailSubscriptions,
    type: SubscriptionType.Email,
    id: "123",
    token: "myToken",
  });
});

test("`Decode` function returns decoded model", async t => {
  const encodedSub = {
    modelId: "333333",
    modelName: ModelName.EmailSubscriptions,
    type: SubscriptionType.Email,
    id: "123",
    token: "myToken",
  };
  const decodedSub = OSModel.decode(encodedSub);
  t.deepEqual(decodedSub, new OSModel(ModelName.EmailSubscriptions, "333333", {
    type: SubscriptionType.Email,
    id: "123",
    token: "myToken",
  }));
});
