import { SecondaryChannel } from './SecondaryChannel';
import { SecondaryChannelSynchronizer } from './SecondaryChannelSynchronizer';
import { SecondaryChannelEmail } from './SecondaryChannelEmail';
import { SecondaryChannelIdentifierUpdater } from './updaters/SecondaryChannelIdentifierUpdater';
import { SecondaryChannelTagsUpdater } from './updaters/SecondaryChannelTagsUpdater';
import { SecondaryChannelExternalUserIdUpdater } from './updaters/SecondaryChannelExternalUserIdUpdater';
import { SecondaryChannelFocusUpdater } from './updaters/SecondaryChannelFocusUpdater';
import { SecondaryChannelSessionUpdater } from './updaters/SecondaryChannelSessionUpdater';
import { SecondaryChannelProfileProviderEmail } from './providers/SecondaryChannelProfileProviderEmail';
import { SecondaryChannelProfileProviderSMS } from './providers/SecondaryChannelProfileProviderSMS';
import { SecondaryChannelSMS } from './SecondaryChannelSMS';

export class SecondaryChannelManager {
  public readonly synchronizer: SecondaryChannelSynchronizer;
  public readonly email: SecondaryChannel;
  public readonly sms: SecondaryChannel;

  constructor() {
    this.synchronizer = new SecondaryChannelSynchronizer();

    // Add Email
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

    // Add SMS
    const smsProfileProvider = new SecondaryChannelProfileProviderSMS();
    const smsChannel = new SecondaryChannelSMS(
      new SecondaryChannelIdentifierUpdater(smsProfileProvider),
      new SecondaryChannelExternalUserIdUpdater(smsProfileProvider),
      new SecondaryChannelTagsUpdater(smsProfileProvider),
      new SecondaryChannelSessionUpdater(smsProfileProvider),
      new SecondaryChannelFocusUpdater(smsProfileProvider),
    );
    this.sms = smsChannel;
    this.synchronizer.registerChannel(smsChannel);
  }
}
