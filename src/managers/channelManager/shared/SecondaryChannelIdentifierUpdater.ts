import OneSignalApi from "../../../OneSignalApi";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProvider } from "./SecondaryChannelProfileProvider";

// Creates / updates the identifier for a Secondary Channel and persists to storage.
export class SecondaryChannelIdentifierUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProvider) {
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    const appConfig = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    const existingProfile = await this.profileProvider.getProfile();

    const newProfile = this.profileProvider.newProfile(existingProfile.playerId, identifier, authHash);
    const isExisting = !!existingProfile.playerId;

    if (isExisting) {
      // If we already have a saved a player ID, make a PUT call to update the existing record
      newProfile.playerId = await OneSignalApi.updateSecondaryChannelRecord(
        appConfig,
        newProfile,
        deviceId
      );
    } else {
      // Otherwise, make a POST call to create a new record
      newProfile.playerId = await OneSignalApi.createSecondaryChannelRecord(
        appConfig,
        newProfile,
        deviceId
      );
    }

     // Record update / create call, save to storage
     if (!!newProfile.playerId) {
       await this.profileProvider.setProfile(newProfile);
     }

     return newProfile.playerId;
  }
}
