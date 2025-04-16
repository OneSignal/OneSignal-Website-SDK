import { OSModel } from '../../../src/core/modelRepo/OSModel';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { TestEnvironment } from '../environment/TestEnvironment';
import { getDummyPushSubscriptionOSModel } from './core';

export async function initializeWithPermission(
  permission: NotificationPermission,
) {
  const mockNotification = {
    permission,
    requestPermission: vi.fn(),
  };
  global.Notification = mockNotification;

  await TestEnvironment.initialize({
    permission,
  });

  const pushModel = getDummyPushSubscriptionOSModel();
  OneSignal.coreDirector.add(
    ModelName.Subscriptions,
    pushModel as OSModel<SupportedModel>,
    false,
  );
}
