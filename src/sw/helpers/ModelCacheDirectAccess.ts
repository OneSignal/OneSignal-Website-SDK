import EncodedModel from '../../core/caching/EncodedModel';
import { ModelName } from '../../core/models/SupportedModels';
import Database from '../../shared/services/Database';

/**
 * WARNING: This is a temp workaround for the ServiceWorker context only!
 * PURPOSE: CoreModuleDirector doesn't work in the SW context.
 * TODO: This is duplicated logic tech debt to address later
 */
export class ModelCacheDirectAccess {
  static async getPushSubscriptionIdByToken(
    token: string,
  ): Promise<string | undefined> {
    const pushSubscriptions = await Database.getAll<EncodedModel>(
      ModelName.PushSubscriptions,
    );
    for (const pushSubscription of pushSubscriptions) {
      if (pushSubscription['token'] === token) {
        return pushSubscription['id'] as string;
      }
    }
    return undefined;
  }
}
