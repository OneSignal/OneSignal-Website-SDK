import { DeliveryPlatformKind } from "../../../models/DeliveryPlatformKind";
import { EmailProfile } from "../../../models/EmailProfile";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProviderBase } from "./SecondaryChannelProfileProviderBase";

export class SecondaryChannelProfileProviderEmail extends SecondaryChannelProfileProviderBase {
  deviceType = DeliveryPlatformKind.Email;

  newProfile(playerId?: string | null, identifier?: string, identifierAuthHash?: string): EmailProfile {
    return new EmailProfile(playerId, identifier, identifierAuthHash);
  }

  async getProfile(): Promise<EmailProfile> {
    return await Database.getEmailProfile();
  }

  async setProfile(profile: EmailProfile): Promise<void> {
    await Database.setEmailProfile(profile);
    await super.setProfile(profile);
  }
}
