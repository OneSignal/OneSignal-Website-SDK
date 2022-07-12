import { SecondaryChannelProfile } from "../../../../page/models/SecondaryChannelProfile";
import { DeliveryPlatformKind } from "../../../models/DeliveryPlatformKind";
import { SubscriptionIdAwaitable } from "../../../../page/models/SubscriptionIdAwaitable";
import { SecondaryChannelProfileProvider } from "./SecondaryChannelProfileProvider";

type PendingGetSubscriptionIdResolver = (subscriptionId: string) => void;

export abstract class SecondaryChannelProfileProviderBase
  implements SecondaryChannelProfileProvider, SubscriptionIdAwaitable {
  private _pendingGetSubscriptionIdResolvers: PendingGetSubscriptionIdResolver[] = [];

  abstract readonly deviceType: DeliveryPlatformKind;

  abstract newProfile(
    subscriptionId?: string | null,
    identifier?: string,
    identifierAuthHash?: string
  ): SecondaryChannelProfile;

  abstract getProfile(): Promise<SecondaryChannelProfile>;
  async setProfile(profile: SecondaryChannelProfile): Promise<void> {
    if (!profile.subscriptionId) {
      return;
    }

    const subscriptionId = profile.subscriptionId;
    this._pendingGetSubscriptionIdResolvers.map(resolve => { resolve(subscriptionId); } );
    this._pendingGetSubscriptionIdResolvers = [];
  }

  /*
   * Awaitable until we can guarantee a subscriptionId is available
   */
  async getSubscriptionId(): Promise<string> {
    // 1. If we already have a stored subscriptionId return it now.
    const profile = await this.getProfile();
    if (profile.subscriptionId) {
      return profile.subscriptionId;
    }

    // 2. If we don't, create a Promise and store it's resolve so we can fire it later.
    return new Promise((resolve: PendingGetSubscriptionIdResolver) => {
      this._pendingGetSubscriptionIdResolvers.push(resolve);
    });
  }
}
