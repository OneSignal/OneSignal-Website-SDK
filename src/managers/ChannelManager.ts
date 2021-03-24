import OneSignalApiShared from "../OneSignalApiShared";
import Database from "../services/Database";
import { NewPushSubscription, SubscriptionManager } from "./SubscriptionManager";

/**
 * Handles relationship between channels such as push and email
 */
export class ChannelManager implements NewPushSubscription {

  constructor(
    private readonly database: Database,
    private readonly appId: string,
    subscriptionManager: SubscriptionManager) {
      subscriptionManager.addNewPushSubscriptionListener(this);
  }

  async onNewPushSubscription(playerId: string): Promise<void> {
    await this.associateSubscriptionWithEmail(playerId);
  }

  /**
   * Called after registering a subscription with OneSignal to associate this subscription with an
   * email record if one exists.
   */
  public async associateSubscriptionWithEmail(newDeviceId: string) {
    const emailProfile = await this.database.getEmailProfile();
    if (!emailProfile.emailId) {
      return;
    }

    // Update the push device record with a reference to the new email ID and email address
    await OneSignalApiShared.updatePlayer(
      this.appId,
      newDeviceId,
      {
        parent_player_id: emailProfile.emailId,
        email: emailProfile.emailAddress
      }
    );
  }
}
