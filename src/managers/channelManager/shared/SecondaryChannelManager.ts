import { SecondaryChannel } from "./SecondaryChannel";
import { SecondaryChannelController } from "./SecondaryChannelController";
import { SecondaryChannelEmail } from "./SecondaryChannelEmail";
import { SecondaryChannelIdentifierUpdater } from "./SecondaryChannelIdentifierUpdater";
import { SecondaryChannelProfileProviderEmail } from "./SecondaryChannelProfileProviderEmail";
import { SecondaryChannelExternalTagsUpdater } from "./SecondaryChannelTagsUpdater";
import { SecondaryChannelExternalUserIdUpdater } from "./updaters/SecondaryChannelExternalUserIdUpdater";
import { SecondaryChannelFocusUpdater } from "./updaters/SecondaryChannelFocusUpdater";
import { SecondaryChannelSessionUpdater } from "./updaters/SecondaryChannelSessionUpdater";

export class SecondaryChannelManager {

  private _secondaryChannelController: SecondaryChannelController;
  public get controller() : SecondaryChannelController {
    return this._secondaryChannelController;
  }

  private _email: SecondaryChannelEmail;
  public get email() : SecondaryChannel {
    return this._email;
  }

  constructor() {
    this._secondaryChannelController = new SecondaryChannelController();

    const emailProfileProvider = new SecondaryChannelProfileProviderEmail();
    this._email = new SecondaryChannelEmail(
      this._secondaryChannelController,
      new SecondaryChannelIdentifierUpdater(emailProfileProvider),
      new SecondaryChannelExternalUserIdUpdater(emailProfileProvider),
      new SecondaryChannelExternalTagsUpdater(emailProfileProvider),
      new SecondaryChannelSessionUpdater(emailProfileProvider),
      new SecondaryChannelFocusUpdater(emailProfileProvider),
    );
  }
}
