import { NotSubscribedError, NotSubscribedReason } from "../../../errors/NotSubscribedError";
import Log from "../../../libraries/Log";
import Database from "../../../services/Database";
import { SecondaryChannel, SecondaryChannelWithSynchronizerEvents } from "./SecondaryChannel";
import { SecondaryChannelIdentifierUpdater } from "./updaters/SecondaryChannelIdentifierUpdater";
import { SecondaryChannelTagsUpdater } from "./updaters/SecondaryChannelTagsUpdater";
import { SecondaryChannelExternalUserIdUpdater } from "./updaters/SecondaryChannelExternalUserIdUpdater";
import { SecondaryChannelFocusUpdater } from "./updaters/SecondaryChannelFocusUpdater";
import { SecondaryChannelSessionUpdater } from "./updaters/SecondaryChannelSessionUpdater";
import { TagsObject } from "../../../models/Tags";
import { SMSProfile } from "../../../models/SMSProfile";

export class SecondaryChannelSMS implements SecondaryChannel, SecondaryChannelWithSynchronizerEvents {

  constructor(
    readonly secondaryChannelIdentifierUpdater: SecondaryChannelIdentifierUpdater,
    readonly secondaryChannelExternalUserIdUpdater: SecondaryChannelExternalUserIdUpdater,
    readonly secondaryChannelTagsUpdater: SecondaryChannelTagsUpdater,
    readonly secondaryChannelSessionUpdater: SecondaryChannelSessionUpdater,
    readonly secondaryChannelFocusUpdater: SecondaryChannelFocusUpdater,
    ) {}

  async logout(): Promise<boolean> {
    // 1. Check if we have an registered sms to logout to begin with.
    const smsProfile = await Database.getSMSProfile();
    if (!smsProfile.subscriptionId) {
      Log.warn(new NotSubscribedError(NotSubscribedReason.NoSMSSet));
      return false;
    }

    // 2. If above is successful clear the SMS profile.
    await Database.setSMSProfile(new SMSProfile());
    return true;
  }

  async setIdentifier(identifier: string, authHash?: string): Promise<string | null> {
    return await this.secondaryChannelIdentifierUpdater.setIdentifier(identifier, authHash);
  }

  async onSession(): Promise<void> {
    await this.secondaryChannelSessionUpdater.sendOnSession();
  }

  async onFocus(sessionDuration: number): Promise<void> {
    await this.secondaryChannelFocusUpdater.sendOnFocus(sessionDuration);
  }

  async setTags(tags: TagsObject<any>): Promise<void> {
    await this.secondaryChannelTagsUpdater.sendTags(tags);
  }

  async setExternalUserId(id: string, authHash?: string): Promise<void> {
    await this.secondaryChannelExternalUserIdUpdater.setExternalUserId(id, authHash);
  }

}
