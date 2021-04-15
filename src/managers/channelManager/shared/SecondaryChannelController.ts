import { SecondaryChannelWithControllerEvents } from "./SecondaryChannel";

export class SecondaryChannelController {

  private _channels: Array<SecondaryChannelWithControllerEvents>;

  constructor() {
    this._channels = new Array();
  }

  registerChannel(channel: SecondaryChannelWithControllerEvents) {
    this._channels.push(channel);
  }

  // Common things all Secondary channels will handle
  onSession(): void {
    // TODO: Run through channel list, call .onSession on each
  }
  onFocus(): void {
  }

  setTags(tags: {[key: string]: any}): void {
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    await Promise.all(this._channels.map(channel => channel.setExternalUserId(id, authHash) ));
  }
}
