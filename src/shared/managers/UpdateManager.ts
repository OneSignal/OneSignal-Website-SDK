import { NotificationType } from 'src/core/types/subscription';
import { isCompleteSubscriptionObject } from '../../core/utils/typePredicates';
import User from '../../onesignal/User';
import type { OutcomeRequestData } from '../../page/models/OutcomeRequestData';
import FuturePushSubscriptionRecord from '../../page/userModel/FuturePushSubscriptionRecord';
import OneSignalApiShared from '../api/OneSignalApiShared';
import Log from '../libraries/Log';
import type { ContextSWInterface } from '../models/ContextSW';
import { SessionOrigin } from '../models/Session';
import { logMethodCall } from '../utils/utils';

export class UpdateManager {
  private context: ContextSWInterface;

  private onSessionSent: boolean;

  constructor(context: ContextSWInterface) {
    this.context = context;
    this.onSessionSent = context.pageViewManager.getPageViewCount() > 1;
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

    if (!this.context.pageViewManager.isFirstPageView()) {
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

  public async sendOutcomeDirect(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeDirect');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        notification_ids: notificationIds,
        direct: true,
        subscription: {
          id: pushSubscriptionModel.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async sendOutcomeInfluenced(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeInfluenced');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        notification_ids: notificationIds,
        direct: false,
        subscription: {
          id: pushSubscriptionModel.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async sendOutcomeUnattributed(
    appId: string,
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeUnattributed');
    const pushSubscriptionModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    if (
      pushSubscriptionModel &&
      isCompleteSubscriptionObject(pushSubscriptionModel)
    ) {
      const outcomeRequestData: OutcomeRequestData = {
        id: outcomeName,
        app_id: appId,
        subscription: {
          id: pushSubscriptionModel.id,
          type: FuturePushSubscriptionRecord.getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    Log.warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }
}
