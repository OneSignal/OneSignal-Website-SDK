import { isCompleteSubscriptionObject } from 'src/core/utils/typePredicates';
import User from 'src/onesignal/User';
import type { ContextInterface } from 'src/shared/context/types';
import { getPageViewCount, isFirstPageView } from 'src/shared/helpers/pageview';
import Log from 'src/shared/libraries/Log';
import { SessionOrigin } from 'src/shared/session/constants';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { sendOutcome } from '../api/shared';
import { getSubscriptionType } from '../environment/detect';
import type { OutcomeRequestData } from '../outcomes/types';
import { logMethodCall } from '../utils/utils';

export class UpdateManager {
  protected _context: ContextInterface;
  private _onSessionSent: boolean;

  constructor(context: ContextInterface) {
    this._context = context;
    this._onSessionSent = getPageViewCount() > 1;
  }

  public async _sendPushDeviceRecordUpdate(): Promise<void> {
    if (!User._singletonInstance?.onesignalId) {
      Log._debug(
        'Not sending the update because user is not registered with OneSignal (no onesignal_id)',
      );
      return;
    }

    if (!this._onSessionSent) {
      await this._sendOnSessionUpdate();
    }
  }

  // If user has been subscribed before, send the on_session update to our backend on the first page view.
  public async _sendOnSessionUpdate(): Promise<void> {
    if (this._onSessionSent) {
      return;
    }

    if (!isFirstPageView()) {
      return;
    }

    const existingUser =
      await this._context._subscriptionManager._isAlreadyRegisteredWithOneSignal();
    if (!existingUser) {
      Log._debug(
        'Not sending the on session because user is not registered with OneSignal (no device id)',
      );
      return;
    }

    const subscriptionModel =
      await OneSignal._coreDirector._getPushSubscriptionModel();

    if (
      subscriptionModel?.notification_types !== NotificationType.Subscribed &&
      OneSignal.config?.enableOnSession !== true
    ) {
      return;
    }

    try {
      // Not sending on_session here but from SW instead.

      // Not awaiting here on purpose
      this._context._sessionManager._upsertSession(
        SessionOrigin.UserNewSession,
      );
      this._onSessionSent = true;
    } catch (e) {
      if (e instanceof Error) {
        Log._error(
          `Failed to update user session. Error "${e.message}" ${e.stack}`,
        );
      }
    }
  }

  public async _sendOutcomeDirect(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeDirect');
    const pushSubscriptionModel =
      await OneSignal._coreDirector._getPushSubscriptionModel();

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
      await sendOutcome(outcomeRequestData);
      return;
    }
    Log._warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async _sendOutcomeInfluenced(
    appId: string,
    notificationIds: string[],
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeInfluenced');
    const pushSubscriptionModel =
      await OneSignal._coreDirector._getPushSubscriptionModel();

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
      await sendOutcome(outcomeRequestData);
      return;
    }
    Log._warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }

  public async _sendOutcomeUnattributed(
    appId: string,
    outcomeName: string,
    value?: number,
  ) {
    logMethodCall('sendOutcomeUnattributed');
    const pushSubscriptionModel =
      await OneSignal._coreDirector._getPushSubscriptionModel();

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
      await sendOutcome(outcomeRequestData);
      return;
    }
    Log._warn(
      `Send outcome aborted because pushSubscriptionModel is not available.`,
    );
  }
}
