import { SecondaryChannel, SecondaryChannelWithControllerEvents } from "./SecondaryChannel";
import { SecondaryChannelController } from "./SecondaryChannelController";
import { SecondaryChannelIdentifierUpdater } from "./SecondaryChannelIdentifierUpdater";

export class SecondaryChannelEmail implements SecondaryChannel, SecondaryChannelWithControllerEvents {

  constructor(
    readonly secondaryChannelController: SecondaryChannelController,
    readonly secondaryChannelIdentifierUpdater: SecondaryChannelIdentifierUpdater
    ) {
    secondaryChannelController.registerChannel(this);
  }

  logout(): void {
    throw new Error("Method not implemented.");
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    return await this.secondaryChannelIdentifierUpdater.setIdentifier(identifier, authHash);
  }

  onSession(): void {
    throw new Error("Method not implemented.");
  }
  onFocus(): void {
    throw new Error("Method not implemented.");
  }
  setTags(tags: any): void {
    throw new Error("Method not implemented.");
  }
  setExternalUserId(id: string) {
    throw new Error("Method not implemented.");
  }

}
