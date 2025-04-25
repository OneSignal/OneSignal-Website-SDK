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

  const subModel = getDummyPushSubscriptionOSModel();
  OneSignal.coreDirector.addSubscriptionModel(subModel);
}
