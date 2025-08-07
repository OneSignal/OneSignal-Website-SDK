import { db } from 'src/shared/database/client';
import { ModelName } from 'src/shared/database/constants';

/**
 * WARNING: This is a temp workaround for the ServiceWorker context only!
 * PURPOSE: CoreModuleDirector doesn't work in the SW context.
 * TODO: This is duplicated logic tech debt to address later
 */
export async function getPushSubscriptionIdByToken(
  token: string,
): Promise<string | undefined> {
  const pushSubscriptions = await db.getAll(ModelName.Subscriptions);
  for (const pushSubscription of pushSubscriptions) {
    if (pushSubscription['token'] === token) {
      return pushSubscription['id'] as string;
    }
  }
  return undefined;
}
