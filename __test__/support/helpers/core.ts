import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import CoreModule from '../../../src/core/CoreModule';
import { CoreModuleDirector } from '../../../src/core/CoreModuleDirector';

export function generateNewSubscription(modelId = '0000000000') {
  const model = new SubscriptionModel();
  model._modelId = modelId;
  model._mergeData({
    type: SubscriptionType._Email,
    id: '123', // subscription id
    token: 'myToken',
  });

  return model;
}

// Requirement: Test must also call TestEnvironment.initialize();
export async function getCoreModuleDirector(): Promise<CoreModuleDirector> {
  const coreModule = new CoreModule();
  await coreModule._init();
  return new CoreModuleDirector(coreModule);
}
