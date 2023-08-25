import { OSModel } from '../../../src/core/modelRepo/OSModel';
import {
  ModelName,
  SupportedModel,
} from '../../../src/core/models/SupportedModels';
import { getDummyPushSubscriptionOSModel } from './core';
import { TestEnvironment } from '../environment/TestEnvironment';

export async function initializeWithPermission(
  permission: NotificationPermission,
) {
  const mockNotification = {
    permission,
    requestPermission: jest.fn(),
  };
  // @ts-ignore
  global.Notification = mockNotification;

  await TestEnvironment.initialize({
    permission,
  });

  const pushModel = getDummyPushSubscriptionOSModel();
  OneSignal.coreDirector.add(
    ModelName.PushSubscriptions,
    pushModel as OSModel<SupportedModel>,
    false,
  );
}
