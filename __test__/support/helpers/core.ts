import { SupportedIdentity } from '../../../src/core/models/IdentityModel';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import {
  SupportedSubscription,
  SubscriptionType,
} from '../../../src/core/models/SubscriptionModels';
import { ModelName } from '../../../src/core/models/SupportedModels';
import {
  DUMMY_MODEL_ID,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
} from '../constants';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { UserPropertiesModel } from '../../../src/core/models/UserPropertiesModel';

export function generateNewSubscription(modelId = '0000000000') {
  return new OSModel<SupportedSubscription>(
    ModelName.EmailSubscriptions,
    {
      type: SubscriptionType.Email,
      id: '123', // subscription id
      token: 'myToken',
    },
    modelId,
  );
}

export function getMockDeltas(): CoreDelta<SupportedIdentity>[] {
  return [
    {
      model: getDummyIdentityOSModel(),
      changeType: CoreChangeType.Add,
    },
  ];
}

export function getDummyIdentityOSModel(
  modelId = DUMMY_MODEL_ID,
): OSModel<SupportedIdentity> {
  return new OSModel<SupportedIdentity>(ModelName.Identity, {}, modelId);
}

export function getDummyPropertyOSModel(
  modelId = DUMMY_MODEL_ID,
): OSModel<UserPropertiesModel> {
  return new OSModel<UserPropertiesModel>(ModelName.Properties, {}, modelId);
}

export function getDummyPushSubscriptionOSModel(): OSModel<SupportedSubscription> {
  return new OSModel<SupportedSubscription>(
    ModelName.PushSubscriptions,
    {
      type: SubscriptionType.ChromePush,
      id: DUMMY_SUBSCRIPTION_ID,
      token: DUMMY_PUSH_TOKEN,
    },
    DUMMY_MODEL_ID,
  );
}

// Requirement: Test must also call TestEnvironment.initialize();
export async function getCoreModuleDirector(): Promise<CoreModuleDirector> {
  const coreModule = new CoreModule();
  await coreModule.init();
  return new CoreModuleDirector(coreModule);
}

export const passIfBroadcastNTimes = (
  target: number,
  broadcastCount: number,
  pass: () => void,
) => {
  if (broadcastCount === target) {
    pass();
  }
};
