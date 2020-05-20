import { OutcomesConfig, OutcomeAttribution, OutcomeAttributionType, SentUniqueOutcome } from '../../models/Outcomes';
import { NotificationClicked, NotificationReceived } from '../../models/Notification';
import Database from "../../services/Database";
import Log from "../../libraries/Log";
import { Utils } from "../../context/shared/utils/Utils";

export default class OutcomesHelper {
  static async getAttribution(outcomesConfig: OutcomesConfig): Promise<OutcomeAttribution> {
    /**
     * Flow:
     * 1. check if the url was opened as a result of a notif;
     * 2. if so, send an api call reporting direct notification outcome
     *    (currently takes into account the match strategy selected in the app's settings);
     * 3. else check all received notifs within timeframe from config;
     * 4. send an api call reporting an influenced outcome for each matching notification
     *    respecting the limit from config too;
     * 5. if no influencing notification found, report unattributed outcome to the api.
     */

    /* direct notifications */
    if (outcomesConfig.direct && outcomesConfig.direct.enabled) {
      const clickedNotifications = await Database.getAll<NotificationClicked>("NotificationClicked");
      if (clickedNotifications.length > 0) {
        return {
          type: OutcomeAttributionType.Direct,
          notificationIds: [clickedNotifications[0].notificationId]
        };
      }
    }

    /* influencing notifications */
    if (outcomesConfig.indirect && outcomesConfig.indirect.enabled) {
      const timeframeMs = outcomesConfig.indirect.influencedTimePeriodMin * 60 * 1000;
      const beginningOfTimeframe = new Date(new Date().getTime() - timeframeMs);
      const maxTimestamp = beginningOfTimeframe.getTime();

      const allReceivedNotification = await Database.getAll<NotificationReceived>("NotificationReceived");
      Log.debug(`Found total of ${allReceivedNotification.length} received notifications`);

      if (allReceivedNotification.length > 0) {
        const max: number = outcomesConfig.indirect.influencedNotificationsLimit;
        /**
         * To handle correctly the case when user got subscribed to a new app id
         * we check the appId on notifications to match the current app.
         */

        const allReceivedNotificationSorted = Utils.sortArrayOfObjects(
          allReceivedNotification, (notif: NotificationReceived) => notif.timestamp, true, false
        );
        const matchingNotificationIds = allReceivedNotificationSorted
          .filter(notif => notif.timestamp >= maxTimestamp)
          .slice(0, max)
          .map(notif => notif.notificationId);
        Log.debug(`Total of ${matchingNotificationIds.length} received notifications are within reporting window.`);

        // Deleting all unmatched received notifications
        const notificationIdsToDelete = allReceivedNotificationSorted
          .filter(notif => matchingNotificationIds.indexOf(notif.notificationId) === -1)
          .map(notif => notif.notificationId);
        notificationIdsToDelete.forEach(id => Database.remove("NotificationReceived", id));
        Log.debug(`${notificationIdsToDelete.length} received notifications will be deleted.`);

        if (matchingNotificationIds.length > 0) {
          return {
            type: OutcomeAttributionType.Indirect,
            notificationIds: matchingNotificationIds,
          }
        }
      }
    }

    /* unattributed outcome report */
    if (outcomesConfig.unattributed && outcomesConfig.unattributed.enabled) {
      return {
        type: OutcomeAttributionType.Unattributed,
        notificationIds: []
      };
    }

    return {
      type: OutcomeAttributionType.NotSupported,
      notificationIds: [],
    };
  }
  /**
   * Returns array of notification ids outcome is currently attributed to
   * @param  {string} outcomeName
   * @returns Promise
   */
  static async getAttributedNotifsByOutcomeName(outcomeName: string): Promise<string[] | undefined> {
    const sentOutcomes = await Database.getAll<SentUniqueOutcome>("SentUniqueOutcome");
    if (!sentOutcomes.length) {
      return [];
    }

    for (const elem of sentOutcomes) {
      if (elem.outcomeName === outcomeName) {
        return elem.notificationIds;
      }
    }

    return undefined;
  }

  static async saveSentUniqueOutcome(outcomeName: string, newNotificationIds: string[]): Promise<void>{
    const sentOutcome = await Database.get<SentUniqueOutcome>("SentUniqueOutcome", outcomeName);
    const notificationIds = [...sentOutcome.notificationIds, ...newNotificationIds];
    await Database.put("SentUniqueOutcome", {
      outcomeName,
      notificationIds,
      sentDuringCurrentSession: true
    });
  }

  static async wasSentDuringCurrentSession(outcomeName: string) {
    const sentOutcome = await Database.get<SentUniqueOutcome>("SentUniqueOutcome", outcomeName);
    return sentOutcome && sentOutcome.sentDuringCurrentSession;
  }
}
