import { SecondaryChannelDeviceRecord } from "../../../../models/SecondaryChannelDeviceRecord";
import OneSignalApiShared from "../../../../OneSignalApiShared";
import Database from "../../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "../SecondaryChannelProfileProviderBase";

export class SecondaryChannelSessionUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {
  }

  async sendOnSession(): Promise<void> {
    const profile = await this.profileProvider.getProfile();
    // If we haven't created an email record yet then there isn't an on session event to track.
    if (!profile.playerId) {
      return;
    }

    const secondaryChannelRecord = new SecondaryChannelDeviceRecord(
      profile.identifier,
      profile.identifierAuthHash
    );
    const appConfig = await Database.getAppConfig();
    secondaryChannelRecord.appId = appConfig.appId;

    const newPlayerId = await OneSignalApiShared.updateUserSession(profile.playerId, secondaryChannelRecord);

    // If on_session gave us a new playerId store the updated value
    if (newPlayerId !== profile.playerId ) {
      profile.playerId = newPlayerId;
      await this.profileProvider.setProfile(profile);
    }
  }
}
