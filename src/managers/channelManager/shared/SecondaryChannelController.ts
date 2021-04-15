import { SecondaryChannel } from "./SecondaryChannel";

export class SecondaryChannelController {

  registerChannel(channel: SecondaryChannel) {
    // TODO: Add to a list here
  }

  // Common things all Secondary channels will handle
  onSession(): void {
    // TODO: Run through channel list, call .onSession on each
  }
  onFocus(): void {

  }

  setTags(tags: {[key: string]: any}): void {
  }

  setExternalUserId(id: string) {
  }
}
