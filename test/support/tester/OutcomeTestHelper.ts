import Random from '../../support/tester/Random';
import Database, {
  TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
} from '../../../src/shared/services/Database';
import {
  initializeNewSession,
  Session,
} from '../../../src/shared/models/Session';
import {
  OutcomesNotificationClicked,
  OutcomesNotificationReceived,
} from 'src/shared/models/OutcomesNotificationEvents';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export default class OutcomeTestHelper {
  static setupReceivedNotifications = async () => {
    const now = new Date().getTime();
    const timeframeMs =
      OneSignal.config!.userConfig.outcomes!.indirect.influencedTimePeriodMin *
      60 *
      1000;
    const beginningOfTimeframe = new Date(new Date().getTime() - timeframeMs);
    const maxTimestamp = beginningOfTimeframe.getTime();
    const limit =
      OneSignal.config!.userConfig.outcomes!.indirect
        .influencedNotificationsLimit;

    const receivedNotificationIdsWithinTimeframe: string[] = [];
    for (let i = 0; i < limit + 3; i++) {
      const timestamp = new Date(now - i * TEN_MINUTES_MS).getTime();
      const notificationReceived: OutcomesNotificationReceived = {
        notificationId: Random.getRandomUuid(),
        appId: OneSignal.config!.appId!,
        timestamp,
      };
      if (
        notificationReceived.timestamp >= maxTimestamp &&
        receivedNotificationIdsWithinTimeframe.length < limit
      ) {
        receivedNotificationIdsWithinTimeframe.push(
          notificationReceived.notificationId,
        );
      }
      await Database.put(
        TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
        notificationReceived,
      );
    }

    return receivedNotificationIdsWithinTimeframe;
  };

  static generateNotification() {
    return {
      notificationId: Random.getRandomUuid(),
      appId: OneSignal.config!.appId!,
      url: 'https://localhost:3001',
      timestamp: new Date().getTime(),
    } as OutcomesNotificationClicked;
  }

  static async initializeSession() {
    const appId = Random.getRandomUuid();
    const deviceId = Random.getRandomUuid();
    const deviceType = 1;
    const session: Session = initializeNewSession({
      deviceId,
      appId,
      deviceType,
    });
    await Database.upsertSession(session);
  }
}
