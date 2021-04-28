import { SecondaryChannelDeviceRecord } from "../../../../models/SecondaryChannelDeviceRecord";
import OneSignalApi from "../../../../OneSignalApi";
import Database from "../../../../services/Database";
import { SecondaryChannelProfileProvider } from "../providers/SecondaryChannelProfileProvider";

// Creates / updates the identifier for a Secondary Channel and persists to storage.
export class SecondaryChannelIdentifierUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProvider) {}

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    const appConfig = await Database.getAppConfig();
    const existingProfile = await this.profileProvider.getProfile();

    const newProfile = this.profileProvider.newProfile(existingProfile.subscriptionId, identifier, authHash);

    const { deviceId } = await Database.getSubscription();
    const deviceRecord = new SecondaryChannelDeviceRecord(
      this.profileProvider.deviceType,
      newProfile.identifier,
      newProfile.identifierAuthHash,
      deviceId,
    );
    deviceRecord.appId = appConfig.appId;

    if (existingProfile.subscriptionId) {
      // If we already have a saved a player ID, make a PUT call to update the existing record
      await OneSignalApi.updatePlayer(
        appConfig.appId,
        existingProfile.subscriptionId,
        deviceRecord.serialize(),
      );
    } else {
      // Otherwise, make a POST call to create a new record
      newProfile.subscriptionId = await OneSignalApi.createUser(deviceRecord);
    }

     // Record update / create call, save to storage
     if (!!newProfile.subscriptionId) {
       await this.profileProvider.setProfile(newProfile);
     }

     return newProfile.subscriptionId;
  }
}
