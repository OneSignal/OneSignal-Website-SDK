import { PlayerIdAwaitable } from "../../../models/PlayerIdAwaitable";
import { SecondaryChannelProfile } from "../../../models/SecondaryChannelProfile";
import { SecondaryChannelProfileProvider } from "./SecondaryChannelProfileProvider";

type PendingGetPlayerIdResolver = (playerId: string) => void;

export abstract class SecondaryChannelProfileProviderBase
  implements SecondaryChannelProfileProvider, PlayerIdAwaitable {
  private _pendingGetPlayerIdResolvers: Array<PendingGetPlayerIdResolver> = new Array();

  abstract newProfile(
    playerId?: string | null,
    identifier?: string,
    identifierAuthHash?: string
  ): SecondaryChannelProfile;

  abstract getProfile(): Promise<SecondaryChannelProfile>;
  async setProfile(profile: SecondaryChannelProfile): Promise<void> {
    if (!profile.playerId) {
      return;
    }

    const playerId = profile.playerId;
    this._pendingGetPlayerIdResolvers.map(resolve => { resolve(playerId); } );
    this._pendingGetPlayerIdResolvers = new Array();
  }

  /*
   * Awaitable until we can guarantee a playerId is available
   */
  async getPlayerId(): Promise<string> {
    // 1. If we already have a stored playerId return it now.
    const profile = await this.getProfile();
    if (profile.playerId) {
      return profile.playerId;
    }

    // 2. If we don't, create a Promise and store it's resolve so we can fire it later.
    return new Promise((resolve: PendingGetPlayerIdResolver) => {
      this._pendingGetPlayerIdResolvers.push(resolve);
    });
  }
}
