import { TagsObject } from "../../../models/Tags";
import { SecondaryChannelWithSynchronizerEvents } from "./SecondaryChannel";

export class SecondaryChannelSynchronizer {

  private _channels: SecondaryChannelWithSynchronizerEvents[];

  constructor() {
    this._channels = [];
  }

  registerChannel(channel: SecondaryChannelWithSynchronizerEvents) {
    this._channels.push(channel);
  }

  // Common things all Secondary channels will handle
  async onSession(): Promise<void> {
    await Promise.all(this._channels.map(channel => channel.onSession() ));
  }
  async onFocus(sessionDuration: number): Promise<void>  {
    await Promise.all(this._channels.map(channel => channel.onFocus(sessionDuration) ));
  }

  async setTags(tags: TagsObject<any>): Promise<void> {
    await Promise.all(this._channels.map(channel => channel.setTags(tags) ));
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    await Promise.all(this._channels.map(channel => channel.setExternalUserId(id, authHash) ));
  }
}
