import { isCompleteSubscriptionObject } from 'src/core/utils/typePredicates';
import OneSignalApiShared from 'src/shared/api/OneSignalApiShared';
import type { ContextInterface } from 'src/shared/context/types';
import { getSubscriptionType } from 'src/shared/environment/detect';
import Log from 'src/shared/libraries/Log';
import type { OutcomeRequestData } from 'src/shared/outcomes/types';
import { logMethodCall } from 'src/shared/utils/utils';
import { UpdateManagerBase } from './base';

export class UpdateManagerPage extends UpdateManagerBase<ContextInterface> {
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
          type: getSubscriptionType(),
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
          type: getSubscriptionType(),
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
