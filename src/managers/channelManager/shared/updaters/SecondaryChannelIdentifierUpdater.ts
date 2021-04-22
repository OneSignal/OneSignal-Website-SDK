import OneSignalApi from "../../../../OneSignalApi";
import Database from "../../../../services/Database";
import { SecondaryChannelProfileProvider } from "../SecondaryChannelProfileProvider";

// Creates / updates the identifier for a Secondary Channel and persists to storage.
export class SecondaryChannelIdentifierUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProvider) {
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    const appConfig = await Database.getAppConfig();
    const existingProfile = await this.profileProvider.getProfile();

    const newProfile = this.profileProvider.newProfile(existingProfile.subscriptionId, identifier, authHash);
    const isExisting = !!existingProfile.subscriptionId;

    if (isExisting) {
      // If we already have a saved a player ID, make a PUT call to update the existing record
      await OneSignalApi.updateSecondaryChannelRecord(
        appConfig,
        newProfile
      );
    } else {
      // Otherwise, make a POST call to create a new record
      const { deviceId } = await Database.getSubscription();
      newProfile.subscriptionId = await OneSignalApi.createSecondaryChannelRecord(
        appConfig,
        newProfile,
        deviceId
      );
    }

     // Record update / create call, save to storage
     if (!!newProfile.subscriptionId) {
       await this.profileProvider.setProfile(newProfile);
     }

     return newProfile.subscriptionId;
  }
}
