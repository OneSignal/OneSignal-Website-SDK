import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';

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

// Requirement: Test must also call TestEnvironment.initialize();
export async function getCoreModuleDirector(): Promise<CoreModuleDirector> {
  const coreModule = new CoreModule();
  await coreModule.init();
  return new CoreModuleDirector(coreModule);
}
