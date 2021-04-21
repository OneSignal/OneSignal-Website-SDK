import { SecondaryChannel } from "./SecondaryChannel";
import { SecondaryChannelController } from "./SecondaryChannelController";
import { SecondaryChannelEmail } from "./SecondaryChannelEmail";
import { SecondaryChannelIdentifierUpdater } from "./updaters/SecondaryChannelIdentifierUpdater";
import { SecondaryChannelProfileProviderEmail } from "./SecondaryChannelProfileProviderEmail";
import { SecondaryChannelExternalTagsUpdater } from "./updaters/SecondaryChannelTagsUpdater";
import { SecondaryChannelExternalUserIdUpdater } from "./updaters/SecondaryChannelExternalUserIdUpdater";
import { SecondaryChannelFocusUpdater } from "./updaters/SecondaryChannelFocusUpdater";
import { SecondaryChannelSessionUpdater } from "./updaters/SecondaryChannelSessionUpdater";

export class SecondaryChannelManager {

  public readonly controller: SecondaryChannelController;
  public readonly email: SecondaryChannel;

  constructor() {
    this.controller = new SecondaryChannelController();

    const emailProfileProvider = new SecondaryChannelProfileProviderEmail();
    this.email = new SecondaryChannelEmail(
      this.controller,
      new SecondaryChannelIdentifierUpdater(emailProfileProvider),
      new SecondaryChannelExternalUserIdUpdater(emailProfileProvider),
      new SecondaryChannelExternalTagsUpdater(emailProfileProvider),
      new SecondaryChannelSessionUpdater(emailProfileProvider),
      new SecondaryChannelFocusUpdater(emailProfileProvider),
    );
  }
}
