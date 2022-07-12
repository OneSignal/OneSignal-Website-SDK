import { SecondaryChannelProfile } from "../../../../page/models/SecondaryChannelProfile";
import { DeliveryPlatformKind } from "../../../models/DeliveryPlatformKind";

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
