import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/core/types/subscription';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';
import {
  DUMMY_MODEL_ID,
  DUMMY_PUSH_TOKEN,
  DUMMY_SUBSCRIPTION_ID,
} from '../constants';

export function generateNewSubscription(modelId = '0000000000') {
  const model = new SubscriptionModel();
  model.modelId = modelId;
  model.mergeData({
    type: SubscriptionType.Email,
    id: '123', // subscription id
    token: 'myToken',
  });

  return model;
}

export function getDummyPushSubscriptionOSModel() {
  const model = new SubscriptionModel();
  model.modelId = DUMMY_MODEL_ID;
  model.mergeData({
    type: SubscriptionType.ChromePush,
    id: DUMMY_SUBSCRIPTION_ID,
    token: DUMMY_PUSH_TOKEN,
  });
  return model;
}

// Requirement: Test must also call TestEnvironment.initialize();
export async function getCoreModuleDirector(): Promise<CoreModuleDirector> {
  const coreModule = new CoreModule();
  await coreModule.init();
  return new CoreModuleDirector(coreModule);
}
