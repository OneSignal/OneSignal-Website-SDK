import { DeliveryPlatformKind } from "../../../../models/DeliveryPlatformKind";
import { SecondaryChannelProfile } from "../../../../models/SecondaryChannelProfile";

// Interface to do the following operations on a SecondaryChannelProfile
// * New based on parameters
// * Get existing from storage

// * Save to storage
export interface SecondaryChannelProfileProvider {
  readonly deviceType: DeliveryPlatformKind;
  newProfile(subscriptionId?: string, identifier?: string, identifierAuthHash?: string): SecondaryChannelProfile;
  getProfile(): Promise<SecondaryChannelProfile>;
  setProfile(profile: SecondaryChannelProfile): Promise<void>;
}
