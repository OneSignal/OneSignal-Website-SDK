import OutcomesHelper from '../shared/helpers/OutcomesHelper';
import Log from '../shared/libraries/Log';
import { OutcomeAttributionType } from '../shared/models/Outcomes';

export class SessionNamespace {
  async sendOutcome(
    outcomeName: string,
    outcomeWeight?: number | undefined,
  ): Promise<void> {
    const config = OneSignal.config?.userConfig.outcomes;
    if (!config) {
      Log._error(`Could not send ${outcomeName}. No outcomes config found.`);
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
      Log._error('Outcome weight can only be a number if present.');
      return;
    }

    if (!(await outcomesHelper._beforeOutcomeSend())) {
      return;
    }

    const outcomeAttribution = await outcomesHelper._getAttribution();

    await outcomesHelper._send({
      type: outcomeAttribution.type,
      notificationIds: outcomeAttribution.notificationIds,
      weight: outcomeWeight,
    });
  }

  async sendUniqueOutcome(outcomeName: string): Promise<void> {
    const config = OneSignal.config?.userConfig.outcomes;
    if (!config) {
      Log._error(`Could not send ${outcomeName}. No outcomes config found.`);
      return;
    }

    const outcomesHelper = new OutcomesHelper(
      OneSignal.config!.appId,
      config,
      outcomeName,
      true,
    );

    if (!(await outcomesHelper._beforeOutcomeSend())) {
      return;
    }
    const outcomeAttribution = await outcomesHelper._getAttribution();

    if (outcomeAttribution.type === OutcomeAttributionType.NotSupported) {
      Log._warn(
        'You are on a free plan. Please upgrade to use this functionality.',
      );
      return;
    }

    // all notifs in attribution window
    const { notificationIds } = outcomeAttribution;
    // only new notifs that ought to be attributed
    const newNotifsToAttributeWithOutcome =
      await outcomesHelper._getNotifsToAttributeWithUniqueOutcome(
        notificationIds,
      );

    if (
      !outcomesHelper._shouldSendUnique(
        outcomeAttribution,
        newNotifsToAttributeWithOutcome,
      )
    ) {
      Log._warn(`'${outcomeName}' was already reported for all notifications.`);
      return;
    }

    await outcomesHelper._send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }
}
