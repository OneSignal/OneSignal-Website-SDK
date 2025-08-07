import User from 'src/onesignal/User';
import type {
  ContextInterface,
  ContextSWInterface,
} from 'src/shared/context/types';
import { getPageViewCount, isFirstPageView } from 'src/shared/helpers/pageview';
import Log from 'src/shared/libraries/Log';
import { SessionOrigin } from 'src/shared/session/constants';
import { NotificationType } from 'src/shared/subscriptions/constants';

export class UpdateManagerBase<
  C extends ContextInterface | ContextSWInterface,
> {
  protected context: C;
  private onSessionSent: boolean;

  constructor(context: C) {
    this.context = context;
    this.onSessionSent = getPageViewCount() > 1;
  }

  public async sendPushDeviceRecordUpdate(): Promise<void> {
    if (!User.singletonInstance?.onesignalId) {
      Log.debug(
        'Not sending the update because user is not registered with OneSignal (no onesignal_id)',
      );
      return;
    }

    if (!this.onSessionSent) {
      await this.sendOnSessionUpdate();
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  public async sendOnSessionUpdate(): Promise<void> {
    if (this.onSessionSent) {
      return;
    }

    if (!isFirstPageView()) {
      return;
    }

    const existingUser =
      await this.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log.debug(
        'Not sending the on session because user is not registered with OneSignal (no device id)',
      );
      return;
    }

    const subscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      subscriptionModel?.notification_types !== NotificationType.Subscribed &&
      OneSignal.config?.enableOnSession !== true
    ) {
      return;
    }

    try {
      // Not sending on_session here but from SW instead.

      // Not awaiting here on purpose
      this.context.sessionManager.upsertSession(SessionOrigin.UserNewSession);
      this.onSessionSent = true;
    } catch (e) {
      if (e instanceof Error) {
        Log.error(
          `Failed to update user session. Error "${e.message}" ${e.stack}`,
        );
      }
    }
  }
}
