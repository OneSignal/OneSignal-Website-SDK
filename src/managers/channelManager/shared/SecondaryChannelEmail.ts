import {
  NotSubscribedError,
  NotSubscribedReason,
} from '../../../errors/NotSubscribedError';
import Log from '../../../libraries/Log';
import { EmailProfile } from '../../../models/EmailProfile';
import { SecondaryChannelProfile } from '../../../models/SecondaryChannelProfile';
import OneSignalApi from '../../../OneSignalApi';
import Database from '../../../services/Database';
import {
  SecondaryChannel,
  SecondaryChannelWithSynchronizerEvents,
} from './SecondaryChannel';
import { SecondaryChannelIdentifierUpdater } from './updaters/SecondaryChannelIdentifierUpdater';
import { SecondaryChannelTagsUpdater } from './updaters/SecondaryChannelTagsUpdater';
import { SecondaryChannelExternalUserIdUpdater } from './updaters/SecondaryChannelExternalUserIdUpdater';
import { SecondaryChannelFocusUpdater } from './updaters/SecondaryChannelFocusUpdater';
import { SecondaryChannelSessionUpdater } from './updaters/SecondaryChannelSessionUpdater';
import { TagsObject } from '../../../models/Tags';
import Event from '../../../Event';

export class SecondaryChannelEmail
  implements SecondaryChannel, SecondaryChannelWithSynchronizerEvents
{
  constructor(
    readonly secondaryChannelIdentifierUpdater: SecondaryChannelIdentifierUpdater,
    readonly secondaryChannelExternalUserIdUpdater: SecondaryChannelExternalUserIdUpdater,
    readonly secondaryChannelTagsUpdater: SecondaryChannelTagsUpdater,
    readonly secondaryChannelSessionUpdater: SecondaryChannelSessionUpdater,
    readonly secondaryChannelFocusUpdater: SecondaryChannelFocusUpdater,
  ) {}

  async logout(): Promise<boolean> {
    // 1. Check if we have an registered email to logout to begin with.
    const emailProfile = await Database.getEmailProfile();
    if (!emailProfile.subscriptionId) {
      Log.warn(new NotSubscribedError(NotSubscribedReason.NoEmailSet));
      return false;
    }

    // 2. Logout only applies if we a de-linking email from a push record.
    const { deviceId } = await Database.getSubscription();
    if (!deviceId) {
      Log.warn(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return false;
    }

    // 3. Make logout email REST API call
    const appConfig = await Database.getAppConfig();
    if (!(await OneSignalApi.logoutEmail(appConfig, emailProfile, deviceId))) {
      Log.warn('Failed to logout email.');
      return false;
    }

    // 4. If above is successful clear the email profile.
    await Database.setEmailProfile(new EmailProfile());
    return true;
  }

  async setIdentifier(
    identifier: string,
    authHash?: string,
  ): Promise<string | null | undefined> {
    const { profileProvider } = this.secondaryChannelIdentifierUpdater;
    const emailProfileBefore = await profileProvider.getProfile();
    const profile = await this.secondaryChannelIdentifierUpdater.setIdentifier(
      identifier,
      authHash,
    );

    const newEmailSubscriptionId = profile.subscriptionId;
    if (newEmailSubscriptionId) {
      const emailProfileAfter = profileProvider.newProfile(
        newEmailSubscriptionId,
        identifier,
      );
      await this.updatePushPlayersRelationToEmailPlayer(
        emailProfileBefore,
        emailProfileAfter,
      );
    }

    await Event.trigger(OneSignal.EVENTS.EMAIL_SUBSCRIPTION_CHANGED, {
      email: profile.identifier,
    });

    return newEmailSubscriptionId;
  }

  private async updatePushPlayersRelationToEmailPlayer(
    existingEmailProfile: SecondaryChannelProfile,
    newEmailProfile: SecondaryChannelProfile,
  ): Promise<void> {
    const { deviceId } = await Database.getSubscription();
    // If we are subscribed to web push
    const isExistingPushRecordSaved = deviceId;
    // And if we previously saved an email ID and it's different from the new returned ID
    const isExistingEmailSaved = !!existingEmailProfile.subscriptionId;
    const emailPreviouslySavedAndDifferent =
      !isExistingEmailSaved ||
      existingEmailProfile.subscriptionId !== newEmailProfile.subscriptionId;
    // Or if we previously saved an email and the email changed
    const emailPreviouslySavedAndChanged =
      !existingEmailProfile.identifier ||
      newEmailProfile.identifier !== existingEmailProfile.identifier;

    if (
      !!deviceId &&
      isExistingPushRecordSaved &&
      (emailPreviouslySavedAndDifferent || emailPreviouslySavedAndChanged)
    ) {
      const authHash = await OneSignal.database.getExternalUserIdAuthHash();
      const appConfig = await Database.getAppConfig();
      // Then update the push device record with a reference to the new email ID and email address
      await OneSignalApi.updatePlayer(appConfig.appId, deviceId, {
        parent_player_id: newEmailProfile.subscriptionId,
        email: newEmailProfile.identifier,
        external_user_id_auth_hash: authHash,
      });
    }
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
    await this.secondaryChannelExternalUserIdUpdater.setExternalUserId(
      id,
      authHash,
    );
  }
}
