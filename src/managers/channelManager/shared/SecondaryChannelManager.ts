import { SecondaryChannel } from "./SecondaryChannel";
import { SecondaryChannelSynchronizer } from "./SecondaryChannelSynchronizer";
import { SecondaryChannelEmail } from "./SecondaryChannelEmail";
import { SecondaryChannelIdentifierUpdater } from "./updaters/SecondaryChannelIdentifierUpdater";
import { SecondaryChannelTagsUpdater } from "./updaters/SecondaryChannelTagsUpdater";
import { SecondaryChannelExternalUserIdUpdater } from "./updaters/SecondaryChannelExternalUserIdUpdater";
import { SecondaryChannelFocusUpdater } from "./updaters/SecondaryChannelFocusUpdater";
import { SecondaryChannelSessionUpdater } from "./updaters/SecondaryChannelSessionUpdater";
import { SecondaryChannelProfileProviderEmail } from "./providers/SecondaryChannelProfileProviderEmail";

export class SecondaryChannelManager {
  public readonly synchronizer: SecondaryChannelSynchronizer;
  public readonly email: SecondaryChannel;

  constructor() {
    this.synchronizer = new SecondaryChannelSynchronizer();

    const emailProfileProvider = new SecondaryChannelProfileProviderEmail();
    const emailChannel = new SecondaryChannelEmail(
      new SecondaryChannelIdentifierUpdater(emailProfileProvider),
      new SecondaryChannelExternalUserIdUpdater(emailProfileProvider),
      new SecondaryChannelTagsUpdater(emailProfileProvider),
      new SecondaryChannelSessionUpdater(emailProfileProvider),
      new SecondaryChannelFocusUpdater(emailProfileProvider),
    );
    this.email = emailChannel;
    this.synchronizer.registerChannel(emailChannel);
  }
}
