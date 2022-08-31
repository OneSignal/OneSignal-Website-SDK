import {SecondaryChannelDeviceRecord} from '../../../../models/SecondaryChannelDeviceRecord';
import OneSignalApiShared from '../../../../OneSignalApiShared';
import Database from '../../../../services/Database';
import {SecondaryChannelProfileProviderBase} from '../providers/SecondaryChannelProfileProviderBase';

export class SecondaryChannelSessionUpdater {
  constructor(readonly profileProvider: SecondaryChannelProfileProviderBase) {}

  async sendOnSession(): Promise<void> {
    const profile = await this.profileProvider.getProfile();
    // If we haven't created an email record yet then there isn't an on session event to track.
    if (!profile.subscriptionId) {
      return;
    }

    const secondaryChannelRecord = new SecondaryChannelDeviceRecord(
      this.profileProvider.deviceType,
      profile.identifier,
      profile.identifierAuthHash,
    );
    const appConfig = await Database.getAppConfig();
    secondaryChannelRecord.appId = appConfig.appId;

    const newSubscriptionId = await OneSignalApiShared.updateUserSession(
      profile.subscriptionId,
      secondaryChannelRecord,
    );

    // If on_session gave us a new subscriptionId store the updated value
    if (newSubscriptionId !== profile.subscriptionId) {
      profile.subscriptionId = newSubscriptionId;
      await this.profileProvider.setProfile(profile);
    }
  }
}
