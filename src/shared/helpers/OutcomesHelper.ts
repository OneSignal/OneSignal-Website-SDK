import { sortArrayOfObjects } from '../context/helpers';
import { db, getCurrentSession } from '../database/client';
import {
  getAllNotificationClickedForOutcomes,
  getAllNotificationReceivedForOutcomes,
} from '../database/notifications';
import Log from '../libraries/Log';
import type { OutcomeProps } from '../models/OutcomeProps';
import {
  type OutcomeAttribution,
  OutcomeAttributionType,
  type SentUniqueOutcome,
} from '../models/Outcomes';
import type { OutcomesNotificationReceived } from '../models/OutcomesNotificationEvents';
import type { OutcomesConfig } from '../outcomes/types';
import { awaitOneSignalInitAndSupported, logMethodCall } from '../utils/utils';

const SEND_OUTCOME = 'sendOutcome';
const SEND_UNIQUE_OUTCOME = 'sendUniqueOutcome';

export default class OutcomesHelper {
  private outcomeName: string;
  private config: OutcomesConfig;
  private appId: string;
  private isUnique: boolean;

  /**
   * @param  {string} appId
   * @param  {OutcomesConfig} config - refers specifically to outcomes config
   * @param  {boolean} isUnique
   * @param  {string} outcomeName
   */
  constructor(
    appId: string,
    config: OutcomesConfig,
    outcomeName: string,
    isUnique: boolean,
  ) {
    this.outcomeName = outcomeName;
    this.config = config;
    this.appId = appId;
    this.isUnique = isUnique;
  }
  /**
   * Returns `OutcomeAttribution` object which includes
   *    1) attribution type
   *    2) notification ids
   *
   * Note: this just looks at notifications that fall within the attribution window and
   *       does not check if they have been previously attributed (used in both sendOutcome & sendUniqueOutcome)
   * @returns Promise
   */
  async getAttribution(): Promise<OutcomeAttribution> {
    return await getConfigAttribution(this.config);
  }

  /**
   * Performs logging of method call and returns whether Outcomes are supported
   * @param  {boolean} isUnique
   * @returns Promise
   */
  async beforeOutcomeSend(): Promise<boolean> {
    const outcomeMethodString = this.isUnique
      ? SEND_UNIQUE_OUTCOME
      : SEND_OUTCOME;
    logMethodCall(outcomeMethodString, this.outcomeName);

    if (!this.config) {
      Log.debug('Outcomes feature not supported by main application yet.');
      return false;
    }

    if (!this.outcomeName) {
      Log.error('Outcome name is required');
      return false;
    }

    await awaitOneSignalInitAndSupported();

    const isSubscribed =
      await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
    if (!isSubscribed) {
      Log.warn('Reporting outcomes is supported only for subscribed users.');
      return false;
    }
    return true;
  }

  /**
   * Returns array of notification ids outcome is currently attributed with
   * @param  {string} outcomeName
   * @returns Promise
   */
  async getAttributedNotifsByUniqueOutcomeName(): Promise<string[]> {
    const sentOutcomes = await db.getAll('SentUniqueOutcome');
    return sentOutcomes
      .filter((o) => o.outcomeName === this.outcomeName)
      .reduce((acc: string[], curr: SentUniqueOutcome) => {
        const notificationIds = curr.notificationIds || [];
        return [...acc, ...notificationIds];
      }, []);
  }

  /**
   * Returns array of new notifications that have never been attributed to the outcome
   * @param  {string} outcomeName
   * @param  {string[]} notificationIds
   */
  async getNotifsToAttributeWithUniqueOutcome(notificationIds: string[]) {
    const previouslyAttributedArr: string[] =
      await this.getAttributedNotifsByUniqueOutcomeName();

    return notificationIds.filter(
      (id) => previouslyAttributedArr.indexOf(id) === -1,
    );
  }

  shouldSendUnique(outcomeAttribution: OutcomeAttribution, notifArr: string[]) {
    // we should only send if type is unattributed OR there are notifs to attribute
    if (outcomeAttribution.type === OutcomeAttributionType.Unattributed) {
      return true;
    }
    return notifArr.length > 0;
  }

  async saveSentUniqueOutcome(newNotificationIds: string[]): Promise<void> {
    const outcomeName = this.outcomeName;
    const existingSentOutcome = await db.get('SentUniqueOutcome', outcomeName);
    const currentSession = await getCurrentSession();

    const existingNotificationIds = !!existingSentOutcome
      ? existingSentOutcome.notificationIds
      : [];
    const notificationIds = [...existingNotificationIds, ...newNotificationIds];

    const timestamp = currentSession ? currentSession.startTimestamp : null;
    await db.put('SentUniqueOutcome', {
      outcomeName,
      notificationIds,
      sentDuringSession: timestamp,
    });
  }

  async wasSentDuringSession() {
    const sentOutcome = await db.get('SentUniqueOutcome', this.outcomeName);

    if (!sentOutcome) {
      return false;
    }

    const session = await getCurrentSession();

    const sessionExistsAndWasPreviouslySent =
      session && sentOutcome.sentDuringSession === session.startTimestamp;
    const sessionWasClearedButWasPreviouslySent =
      !session && !!sentOutcome.sentDuringSession;

    return (
      sessionExistsAndWasPreviouslySent || sessionWasClearedButWasPreviouslySent
    );
  }

  async send(outcomeProps: OutcomeProps): Promise<void> {
    const { type, notificationIds, weight } = outcomeProps;

    switch (type) {
      case OutcomeAttributionType.Direct:
        if (this.isUnique) {
          await this.saveSentUniqueOutcome(notificationIds);
        }
        await OneSignal.context.updateManager.sendOutcomeDirect(
          this.appId,
          notificationIds,
          this.outcomeName,
          weight,
        );
        return;
      case OutcomeAttributionType.Indirect:
        if (this.isUnique) {
          await this.saveSentUniqueOutcome(notificationIds);
        }
        await OneSignal.context.updateManager.sendOutcomeInfluenced(
          this.appId,
          notificationIds,
          this.outcomeName,
          weight,
        );
        return;
      case OutcomeAttributionType.Unattributed:
        if (this.isUnique) {
          if (await this.wasSentDuringSession()) {
            Log.warn(
              `(Unattributed) unique outcome was already sent during this session`,
            );
            return;
          }
          await this.saveSentUniqueOutcome([]);
        }
        await OneSignal.context.updateManager.sendOutcomeUnattributed(
          this.appId,
          this.outcomeName,
          weight,
        );
        return;
      default:
        Log.warn(
          'You are on a free plan. Please upgrade to use this functionality.',
        );
        return;
    }
  }

  // statics
}

/**
 * Static method: returns `OutcomeAttribution` object which includes
 *    1) attribution type
 *    2) notification ids
 *
 * Note: this just looks at notifications that fall within the attribution window and
 *       does not check if they have been previously attributed (used in both sendOutcome & sendUniqueOutcome)
 * @param  {OutcomesConfig} config
 * @returns Promise
 */
export async function getConfigAttribution(
  config: OutcomesConfig,
): Promise<OutcomeAttribution> {
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
  if (config.direct && config.direct.enabled) {
    const clickedNotifications = await getAllNotificationClickedForOutcomes();
    if (clickedNotifications.length > 0) {
      return {
        type: OutcomeAttributionType.Direct,
        notificationIds: [clickedNotifications[0].notificationId],
      };
    }
  }

  /* influencing notifications */
  if (config.indirect && config.indirect.enabled) {
    const timeframeMs = config.indirect.influencedTimePeriodMin * 60 * 1000;
    const beginningOfTimeframe = new Date(new Date().getTime() - timeframeMs);
    const maxTimestamp = beginningOfTimeframe.getTime();

    const allReceivedNotification =
      await getAllNotificationReceivedForOutcomes();
    Log.debug(
      `\tFound total of ${allReceivedNotification.length} received notifications`,
    );

    if (allReceivedNotification.length > 0) {
      const max: number = config.indirect.influencedNotificationsLimit;
      /**
       * To handle correctly the case when user got subscribed to a new app id
       * we check the appId on notifications to match the current app.
       */

      const allReceivedNotificationSorted = sortArrayOfObjects(
        allReceivedNotification,
        (notif: OutcomesNotificationReceived) => notif.timestamp,
        true,
        false,
      );
      const matchingNotificationIds = allReceivedNotificationSorted
        .filter((notif) => notif.timestamp >= maxTimestamp)
        .slice(0, max)
        .map((notif) => notif.notificationId);
      Log.debug(
        `\tTotal of ${matchingNotificationIds.length} received notifications are within reporting window.`,
      );

      // Deleting all unmatched received notifications
      const notificationIdsToDelete = allReceivedNotificationSorted
        .filter(
          (notif) =>
            matchingNotificationIds.indexOf(notif.notificationId) === -1,
        )
        .map((notif) => notif.notificationId);
      notificationIdsToDelete.forEach((id) =>
        db.delete('Outcomes.NotificationReceived', id),
      );
      Log.debug(
        `\t${notificationIdsToDelete.length} received notifications will be deleted.`,
      );

      if (matchingNotificationIds.length > 0) {
        return {
          type: OutcomeAttributionType.Indirect,
          notificationIds: matchingNotificationIds,
        };
      }
    }
  }

  /* unattributed outcome report */
  if (config.unattributed && config.unattributed.enabled) {
    return {
      type: OutcomeAttributionType.Unattributed,
      notificationIds: [],
    };
  }

  return {
    type: OutcomeAttributionType.NotSupported,
    notificationIds: [],
  };
}
