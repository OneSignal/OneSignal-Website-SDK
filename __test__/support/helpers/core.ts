import { OSModel } from "../../../src/core/modelRepo/OSModel";
import { CoreChangeType } from "../../../src/core/models/CoreChangeType";
import { CoreDelta } from "../../../src/core/models/CoreDeltas";
import { SupportedSubscription, SubscriptionType } from "../../../src/core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../../../src/core/models/SupportedModels";


export function generateNewSubscription(modelId = '0000000000') {
  return new OSModel<SupportedSubscription>(
    ModelName.EmailSubscriptions,
    {
      type: SubscriptionType.Email,
      id: '123', // subscription id
      token: "myToken",
    },
    modelId,
    );
}

export function getMockDeltas(): CoreDelta<SupportedModel>[] {
  return [
    {
      model: getDummyIdentityOSModel(),
      changeType: CoreChangeType.Add,
    }
  ];
}

export function getDummyIdentityOSModel(): OSModel<SupportedModel> {
  return new OSModel<SupportedModel>(ModelName.Identity, {}, "123");
}

export const passIfBroadcastNTimes = (target: number, broadcastCount: number, pass: () => void) => {
  if (broadcastCount === target) {
    pass();
  }
};
