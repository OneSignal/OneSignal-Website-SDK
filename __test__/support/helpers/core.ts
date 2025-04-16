import { Identity } from 'src/core/models/UserData';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import { OSModel } from '../../../src/core/modelRepo/OSModel';
import { CoreChangeType } from '../../../src/core/models/CoreChangeType';
import { CoreDelta } from '../../../src/core/models/CoreDeltas';
import {
  SubscriptionType,
  SupportedSubscription,
} from '../../../src/core/models/SubscriptionModels';
import { ModelName } from '../../../src/core/models/SupportedModels';
import { UserPropertiesModel } from '../../../src/core/models/UserPropertiesModel';
import {
  DUMMY_MODEL_ID,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
} from '../constants';

export function generateNewSubscription(modelId = '0000000000') {
  return new OSModel<SupportedSubscription>(
    ModelName.Subscriptions,
    {
      type: SubscriptionType.Email,
      id: '123', // subscription id
      token: 'myToken',
    },
    modelId,
  );
}

export function getMockDeltas(): CoreDelta<Identity>[] {
  return [
    {
      model: getDummyIdentityOSModel(),
      changeType: CoreChangeType.Add,
    },
  ];
}

export function getDummyIdentityOSModel(
  modelId = DUMMY_MODEL_ID,
): OSModel<Identity> {
  return new OSModel<Identity>(ModelName.Identity, {}, modelId);
}

export function getDummyPropertyOSModel(
  modelId = DUMMY_MODEL_ID,
): OSModel<UserPropertiesModel> {
  return new OSModel<UserPropertiesModel>(ModelName.Properties, {}, modelId);
}

export function getDummyPushSubscriptionOSModel(): OSModel<SupportedSubscription> {
  return new OSModel<SupportedSubscription>(
    ModelName.Subscriptions,
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
  resolve: () => void,
) => {
  if (broadcastCount === target) {
    resolve();
  }
};
