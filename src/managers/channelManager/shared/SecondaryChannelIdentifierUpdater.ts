import OneSignalApi from "../../../OneSignalApi";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProvider } from "./SecondaryChannelProfileProvider";

export class SecondaryChannelIdentifierUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProvider) {
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    const appConfig = await Database.getAppConfig();
    const { deviceId } = await Database.getSubscription();
    const existingEmailProfile = await this.profileProvider.getProfile();

    const newEmailProfile = this.profileProvider.newProfile(existingEmailProfile.playerId, identifier, authHash);
    const isExistingEmailSaved = !!existingEmailProfile.playerId;

    if (isExistingEmailSaved) {
      // If we already have a saved email player ID, make a PUT call to update the existing email record
      newEmailProfile.playerId = await OneSignalApi.updateSecondaryChannelRecord(
        appConfig,
        newEmailProfile,
        deviceId
      );
    } else {
      // Otherwise, make a POST call to create a new email record
      newEmailProfile.playerId = await OneSignalApi.createSecondaryChannelRecord(
        appConfig,
        newEmailProfile,
        deviceId
      );
    }

     // email record update / create call returned successfully
     if (!!newEmailProfile.playerId) {
       await this.profileProvider.setProfile(newEmailProfile);
     }

     return newEmailProfile.playerId;
  }
}
