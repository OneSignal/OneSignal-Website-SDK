import { SecondaryChannelProfile } from "../../../models/SecondaryChannelProfile";
import OneSignalApi from "../../../OneSignalApi";
import OneSignalApiShared from "../../../OneSignalApiShared";
import Database from "../../../services/Database";
import { SecondaryChannel, SecondaryChannelWithControllerEvents } from "./SecondaryChannel";
import { SecondaryChannelController } from "./SecondaryChannelController";
import { SecondaryChannelIdentifierUpdater } from "./SecondaryChannelIdentifierUpdater";
import { SecondaryChannelExternalUserIdUpdater } from "./updaters/SecondaryChannelExternalUserIdUpdater";

export class SecondaryChannelEmail implements SecondaryChannel, SecondaryChannelWithControllerEvents {

  constructor(
    readonly secondaryChannelController: SecondaryChannelController,
    readonly secondaryChannelIdentifierUpdater: SecondaryChannelIdentifierUpdater,
    readonly secondaryChannelExternalUserIdUpdater: SecondaryChannelExternalUserIdUpdater
    ) {
    secondaryChannelController.registerChannel(this);
  }

  logout(): void {
    throw new Error("Method not implemented.");
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    const profileProvider = this.secondaryChannelIdentifierUpdater.profileProvider;
    const existingEmailProfile = await profileProvider.getProfile();
    const newEmailPlayerId = await this.secondaryChannelIdentifierUpdater.setIdentifier(identifier, authHash);

    if (newEmailPlayerId) {
      const newEmailProfile = profileProvider.newProfile(newEmailPlayerId, identifier);
      await this.updatePushPlayersRelationToEmailPlayer(existingEmailProfile, newEmailProfile);
    }

    return newEmailPlayerId;
  }

  private async updatePushPlayersRelationToEmailPlayer(
    existingEmailProfile: SecondaryChannelProfile,
    newEmailProfile: SecondaryChannelProfile): Promise<void> {

    const { deviceId } = await Database.getSubscription();
    // If we are subscribed to web push
    const isExistingPushRecordSaved = deviceId;
    // And if we previously saved an email ID and it's different from the new returned ID
    const isExistingEmailSaved = !!existingEmailProfile.playerId;
    const emailPreviouslySavedAndDifferent = !isExistingEmailSaved ||
      existingEmailProfile.playerId !== newEmailProfile.playerId;
    // Or if we previously saved an email and the email changed
    const emailPreviouslySavedAndChanged = !existingEmailProfile.identifier ||
      newEmailProfile.identifier !== existingEmailProfile.identifier;

    if (!!deviceId && isExistingPushRecordSaved && (emailPreviouslySavedAndDifferent || emailPreviouslySavedAndChanged))
      {
        const authHash = await OneSignal.database.getExternalUserIdAuthHash();
        const appConfig = await Database.getAppConfig();
        // Then update the push device record with a reference to the new email ID and email address
        await OneSignalApi.updatePlayer(
          appConfig.appId,
          deviceId,
          {
            parent_player_id: newEmailProfile.playerId,
            email: newEmailProfile.identifier,
            external_user_id_auth_hash: authHash
          }
        );
    }
  }

  onSession(): void {
    throw new Error("Method not implemented.");
  }
  onFocus(): void {
    throw new Error("Method not implemented.");
  }
  setTags(tags: any): void {
    throw new Error("Method not implemented.");
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    await this.secondaryChannelExternalUserIdUpdater.setExternalUserId(id, authHash);
  }

}
