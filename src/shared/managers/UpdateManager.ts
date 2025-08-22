import { isCompleteSubscriptionObject } from 'src/core/utils/typePredicates';
import User from 'src/onesignal/User';
import type { ContextInterface } from 'src/shared/context/types';
import log from 'src/shared/helpers/log';
import { MessageTypePage } from 'src/shared/helpers/log/constants';
import { getPageViewCount, isFirstPageView } from 'src/shared/helpers/pageview';
import { SessionOrigin } from 'src/shared/session/constants';
import { NotificationType } from 'src/shared/subscriptions/constants';
import OneSignalApiShared from '../api/OneSignalApiShared';
import { getSubscriptionType } from '../environment/detect';
import type { OutcomeRequestData } from '../outcomes/types';
import { logMethodCall } from '../utils/utils';

export class UpdateManager {
  protected context: ContextInterface;
  private onSessionSent: boolean;

  constructor(context: ContextInterface) {
    this.context = context;
    this.onSessionSent = getPageViewCount() > 1;
  }

  public async sendPushDeviceRecordUpdate(): Promise<void> {
    if (!User.singletonInstance?.onesignalId) {
      log(MessageTypePage.UpdateManagerNotRegistered);
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
      log(MessageTypePage.UpdateManagerNoDevice);
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
        log(MessageTypePage.UpdateManagerError, {
          message: e.message,
          stack: e.stack,
        });
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
          type: getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    log(MessageTypePage.UpdateManagerOutcomeAborted);
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
          type: getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    log(MessageTypePage.UpdateManagerOutcomeAborted);
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
          type: getSubscriptionType(),
        },
      };
      if (value !== undefined) {
        outcomeRequestData.weight = value;
      }
      await OneSignalApiShared.sendOutcome(outcomeRequestData);
      return;
    }
    log(MessageTypePage.UpdateManagerOutcomeAborted);
  }
}
