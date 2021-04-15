import { EmailProfile } from "../../../models/EmailProfile";
import Database from "../../../services/Database";
import { SecondaryChannelProfileProvider } from "./SecondaryChannelProfileProvider";

export class SecondaryChannelProfileProviderEmail implements SecondaryChannelProfileProvider {
  newProfile(playerId?: string | null, identifier?: string, identifierAuthHash?: string): EmailProfile {
    return new EmailProfile(playerId, identifier, identifierAuthHash);
  }

  async getProfile(): Promise<EmailProfile> {
    return await Database.getEmailProfile();
  }

  async setProfile(profile: EmailProfile): Promise<void> {
    await Database.setEmailProfile(profile);
  }
}
