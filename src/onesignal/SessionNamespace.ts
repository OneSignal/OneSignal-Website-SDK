import OutcomesHelper from "../shared/helpers/OutcomesHelper";
import Log from "../shared/libraries/Log";
import { OutcomeAttributionType } from "../shared/models/Outcomes";

export class SessionNamespace {
  async sendOutcome(outcomeName: string, outcomeWeight?: number | undefined): Promise<void> {
    const config = OneSignal.config!.userConfig.outcomes;
    if (!config) {
      Log.error(`Could not send ${outcomeName}. No outcomes config found.`);
      return;
    }

    const outcomesHelper = new OutcomesHelper(OneSignal.config!.appId, config, outcomeName, false);
    if (typeof outcomeWeight !== "undefined" && typeof outcomeWeight !== "number") {
      Log.error("Outcome weight can only be a number if present.");
      return;
    }

    if (!await outcomesHelper.beforeOutcomeSend()) {
      return;
    }

    const outcomeAttribution = await outcomesHelper.getAttribution();

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: outcomeAttribution.notificationIds,
      weight: outcomeWeight
    });
  }

  async sendUniqueOutcome(outcomeName: string): Promise<void> {
    const config = OneSignal.config!.userConfig.outcomes;
    if (!config) {
      Log.error(`Could not send ${outcomeName}. No outcomes config found.`);
      return;
    }

    const outcomesHelper = new OutcomesHelper(OneSignal.config!.appId, config, outcomeName, true);

    if (!await outcomesHelper.beforeOutcomeSend()) {
      return;
    }
    const outcomeAttribution = await outcomesHelper.getAttribution();

    if (outcomeAttribution.type === OutcomeAttributionType.NotSupported) {
      Log.warn("You are on a free plan. Please upgrade to use this functionality.");
      return;
    }

    // all notifs in attribution window
    const { notificationIds } = outcomeAttribution;
    // only new notifs that ought to be attributed
    const newNotifsToAttributeWithOutcome = await outcomesHelper.getNotifsToAttributeWithUniqueOutcome(notificationIds);

    if (!outcomesHelper.shouldSendUnique(outcomeAttribution, newNotifsToAttributeWithOutcome)) {
      Log.warn(`'${outcomeName}' was already reported for all notifications.`);
      return;
    }

    await outcomesHelper.send({
      type: outcomeAttribution.type,
      notificationIds: newNotifsToAttributeWithOutcome,
    });
  }
}
