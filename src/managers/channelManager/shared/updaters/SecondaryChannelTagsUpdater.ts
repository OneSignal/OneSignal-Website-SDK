import { UpdatePlayerOptions } from "../../../../models/UpdatePlayerOptions";
import OneSignalApi from "../../../../OneSignalApi";
import Database from "../../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "../SecondaryChannelProfileProviderBase";

export class SecondaryChannelTagsUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {
  }

  async sendTags(tags: {[key: string]: any}): Promise<void> {
    const subscriptionId = await this.profileProvider.getSubscriptionId();
    const { appId } = await Database.getAppConfig();
    const identifierAuthHash = (await this.profileProvider.getProfile()).identifierAuthHash;

    const payload: UpdatePlayerOptions = {
      tags: tags,
      identifier_auth_hash: identifierAuthHash
    };

    await OneSignalApi.updatePlayer(appId, subscriptionId, payload);
  }
}
