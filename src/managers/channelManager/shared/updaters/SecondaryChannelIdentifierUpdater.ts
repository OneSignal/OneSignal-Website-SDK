import { ExternalUserIdHelper } from "../../../../helpers/shared/ExternalUserIdHelper";
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

    if (existingProfile.subscriptionId) {
      await OneSignalApi.updatePlayer(
        appConfig.appId,
        existingProfile.subscriptionId,
        {
          identifier,
          identifier_auth_hash: authHash
        },
      );
    } else {
      // Otherwise, make a POST call to create a new record
      const { deviceId } = await Database.getSubscription();
      const deviceRecord = new SecondaryChannelDeviceRecord(
        this.profileProvider.deviceType,
        newProfile.identifier,
        newProfile.identifierAuthHash,
        deviceId,
      );
      deviceRecord.appId = appConfig.appId;
      await ExternalUserIdHelper.addExternalUserIdToDeviceRecord(deviceRecord);

      newProfile.subscriptionId = await OneSignalApi.createUser(deviceRecord);
    }

     // Record update / create call, save to storage
     if (!!newProfile.subscriptionId) {
       await this.profileProvider.setProfile(newProfile);
     }

     return newProfile.subscriptionId;
  }
}
