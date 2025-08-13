import { WrongTypeArgumentError } from 'src/shared/errors/common';
import OutcomesHelper from '../shared/helpers/OutcomesHelper';
import Log from '../shared/libraries/Log';
import { OutcomeAttributionType } from '../shared/outcomes/constants';

export class SessionNamespace {
  async sendOutcome(
    outcomeName: string,
    outcomeWeight?: number | undefined,
  ): Promise<void> {
    const config = OneSignal.config?.userConfig.outcomes;
    if (!config) {
      Log.error(`No config for:${outcomeName}`);
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
      throw WrongTypeArgumentError('outcomeWeight');
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
      Log.error(`No config for: ${outcomeName}`);
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
      Log.warn('Upgrade your plan to use this feature.');
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
      Log.warn(`'${outcomeName}' already reported.`);
      return;
    }

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }
}
