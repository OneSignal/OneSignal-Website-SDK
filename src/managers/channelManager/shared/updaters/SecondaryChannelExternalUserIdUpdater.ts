import { UpdatePlayerExternalUserId } from "../../../../models/UpdatePlayerOptions";
import OneSignalApiShared from "../../../../OneSignalApiShared";
import Database from "../../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "../SecondaryChannelProfileProviderBase";

export class SecondaryChannelExternalUserIdUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    const playerId = await this.profileProvider.getPlayerId();
    const { appId } = await Database.getAppConfig();
    const payload = {
      external_user_id: id,
      external_user_id_auth_hash: authHash
    } as UpdatePlayerExternalUserId;

    await OneSignalApiShared.updatePlayer(
      appId,
      playerId,
      payload
    );
  }
}
