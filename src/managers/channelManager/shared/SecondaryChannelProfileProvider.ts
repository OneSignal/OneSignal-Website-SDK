import { SecondaryChannelProfile } from "../../../models/SecondaryChannelProfile";

// Interface to do the following operations on a SecondaryChannelProfile
// * New based on parameters
// * Get existing from storage
// * Save to storage
export interface SecondaryChannelProfileProvider {
  newProfile(playerId?: string | null, identifier?: string, identifierAuthHash?: string): SecondaryChannelProfile;
  getProfile(): Promise<SecondaryChannelProfile>;
  setProfile(profile: SecondaryChannelProfile): Promise<void>;
}
