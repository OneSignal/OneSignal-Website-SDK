import {DeliveryPlatformKind} from '../../../../models/DeliveryPlatformKind';
import {SMSProfile} from '../../../../models/SMSProfile';
import Database from '../../../../services/Database';
import {SecondaryChannelProfileProviderBase} from './SecondaryChannelProfileProviderBase';

export class SecondaryChannelProfileProviderSMS extends SecondaryChannelProfileProviderBase {
  deviceType = DeliveryPlatformKind.SMS;

  newProfile(
    subscriptionId?: string | null,
    identifier?: string,
    identifierAuthHash?: string,
  ): SMSProfile {
    return new SMSProfile(subscriptionId, identifier, identifierAuthHash);
  }

  async getProfile(): Promise<SMSProfile> {
    return await Database.getSMSProfile();
  }

  async setProfile(profile: SMSProfile): Promise<void> {
    await Database.setSMSProfile(profile);
    await super.setProfile(profile);
  }
}
