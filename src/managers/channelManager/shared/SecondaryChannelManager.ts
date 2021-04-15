import { SecondaryChannelController } from "./SecondaryChannelController";
import { SecondaryChannelEmail } from "./SecondaryChannelEmail";

export class SecondaryChannelManager {

  private _secondaryChannelController: SecondaryChannelController;

  private _email: SecondaryChannelEmail;
  public get email() : SecondaryChannelEmail {
    return this._email;
  }

  constructor() {
    this._secondaryChannelController = new SecondaryChannelController();

    this._email = new SecondaryChannelEmail(this._secondaryChannelController);
  }
}
