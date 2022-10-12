import { ExecutionContext } from "ava";
import { SinonSandbox } from "sinon";
import ModelCache from "../../../src/core/caching/ModelCache";
import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { CoreDelta } from "../../../src/core/models/CoreDeltas";
import { SupportedSubscription, SubscriptionType } from "../../../src/core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";

export function generateNewSubscription() {
  return new OSModel<SupportedSubscription>(
    ModelName.EmailSubscriptions,
    // model id
    "333333",
    {
      type: SubscriptionType.Email,
      id: '123', // subscription id
      token: "myToken",
    });
}

export function getMockDeltas(): CoreDelta<SupportedModel>[] {
  return [
    {
      model: getDummyIdentityOSModel(),
      changeType: CoreChangeType.Add,
    }
  ];
}

const dummyIdentityModel = new OSModel<SupportedModel>(ModelName.Identity, "123");

export function getDummyIdentityOSModel(): OSModel<SupportedModel> {
  return dummyIdentityModel;
}

export function stubModelCache(sinonSandbox: SinonSandbox) {
  sinonSandbox.stub(ModelCache.prototype, "load").resolves();
  sinonSandbox.stub(ModelCache.prototype, "add").resolves();
  sinonSandbox.stub(ModelCache.prototype, "remove").resolves();
  sinonSandbox.stub(ModelCache.prototype, "update").resolves();
}

export const passIfBroadcastNTimes = (t: ExecutionContext, target: number, broadcastCount: number) => {
  if (broadcastCount === target) {
    t.pass();
  }
};
