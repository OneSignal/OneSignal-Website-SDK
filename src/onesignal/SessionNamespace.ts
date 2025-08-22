import OutcomesHelper from '../shared/helpers/OutcomesHelper';
import log from '../shared/helpers/log';
import { MessageTypePage } from '../shared/helpers/log/constants';
import { OutcomeAttributionType } from '../shared/models/Outcomes';

export class SessionNamespace {
  async sendOutcome(
    outcomeName: string,
    outcomeWeight?: number | undefined,
  ): Promise<void> {
    const config = OneSignal.config?.userConfig.outcomes;
    if (!config) {
      log(MessageTypePage.OutcomesConfigMissing, {
        outcomeName,
      });
      return;
    }

    const outcomesHelper = new OutcomesHelper(
      OneSignal.config!.appId,
      config,
      outcomeName,
      false,
    );
    if (
      typeof outcomeWeight !== 'undefined' &&
      typeof outcomeWeight !== 'number'
    ) {
      log(MessageTypePage.OutcomesWeightInvalid);
      return;
    }

    if (!(await outcomesHelper.beforeOutcomeSend())) {
      return;
    }

    const outcomeAttribution = await outcomesHelper.getAttribution();

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: outcomeAttribution.notificationIds,
      weight: outcomeWeight,
    });
  }

  async sendUniqueOutcome(outcomeName: string): Promise<void> {
    const config = OneSignal.config?.userConfig.outcomes;
    if (!config) {
      log(MessageTypePage.OutcomesConfigMissing, {
        outcomeName,
      });
      return;
    }

    const outcomesHelper = new OutcomesHelper(
      OneSignal.config!.appId,
      config,
      outcomeName,
      true,
    );

    if (!(await outcomesHelper.beforeOutcomeSend())) {
      return;
    }
    const outcomeAttribution = await outcomesHelper.getAttribution();

    if (outcomeAttribution.type === OutcomeAttributionType.NotSupported) {
      log(MessageTypePage.OutcomesOutcomeEventFailed);
      return;
    }

    // all notifs in attribution window
    const { notificationIds } = outcomeAttribution;
    // only new notifs that ought to be attributed
    const newNotifsToAttributeWithOutcome =
      await outcomesHelper.getNotifsToAttributeWithUniqueOutcome(
        notificationIds,
      );

    if (
      !outcomesHelper.shouldSendUnique(
        outcomeAttribution,
        newNotifsToAttributeWithOutcome,
      )
    ) {
      log(MessageTypePage.OutcomesRetryWarning, {
        outcomeName,
      });
      return;
    }

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }
}
