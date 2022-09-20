import { UpdatePlayerExternalUserId } from '../../../../models/UpdatePlayerOptions';
import OneSignalApiShared from '../../../../OneSignalApiShared';
import Database from '../../../../services/Database';
import { SecondaryChannelProfileProviderBase } from '../providers/SecondaryChannelProfileProviderBase';

export class SecondaryChannelExternalUserIdUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {}

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    // We wait until we have a subscriptionId. We do this instead of an early return
    //   so we do not lose this value and the update can then be made as soon as possible.
    // Note: This promise may never resolve if the channel identifier is never set.
    //   - Example if OneSignal.setEmail(""..."") is never called
    const subscriptionId = await this.profileProvider.getSubscriptionId();

    const { appId } = await Database.getAppConfig();
    const payload = {
      external_user_id: id,
      external_user_id_auth_hash: authHash,
    } as UpdatePlayerExternalUserId;

    await OneSignalApiShared.updatePlayer(appId, subscriptionId, payload);
  }
}
