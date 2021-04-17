import { UpdatePlayerOptions } from "../../../models/UpdatePlayerOptions";
import OneSignalApi from "../../../OneSignalApi";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "./SecondaryChannelProfileProviderBase";

export class SecondaryChannelExternalTagsUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {
  }

  async sendTags(tags: {[key: string]: any}): Promise<void> {
    const playerId = await this.profileProvider.getPlayerId();
    const { appId } = await Database.getAppConfig();
    const identifierAuthHash = (await this.profileProvider.getProfile()).identifierAuthHash;

    const payload: UpdatePlayerOptions = {
      tags: tags,
      identifier_auth_hash: identifierAuthHash
    };

    await OneSignalApi.updatePlayer(appId, playerId, payload);
  }
}
