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
      Log._error(`No outcomes config for ${outcomeName}`);
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
      Log._error('Outcome weight must be a number');
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
      Log._error(`No outcomes config for ${outcomeName}`);
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

    if (outcomeAttribution.type === OutcomeAttributionType._NotSupported) {
      Log._warn('Upgrade required for this feature');
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
      Log._warn(`'${outcomeName}' already reported`);
      return;
    }

    await outcomesHelper._send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }
}
