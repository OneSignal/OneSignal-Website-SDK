import { NotificationReceived, NotificationClicked } from '../../../src/models/Notification';
import Random from '../../support/tester/Random';
import Database from '../../../src/services/Database';

const TEN_MINUTES_MS = 10 * 60 * 1000;
export const OUTCOME_NAME="test_outcome";

export const setupReceivedNotifications = async () => {
  const now = new Date().getTime();
  const timeframeMs = OneSignal.config!.userConfig.outcomes!.indirect.influencedTimePeriodMin * 60 * 1000;
  const beginningOfTimeframe = new Date(new Date().getTime() - timeframeMs);
  const maxTimestamp = beginningOfTimeframe.getTime();
  const limit = OneSignal.config!.userConfig.outcomes!.indirect.influencedNotificationsLimit;

  const receivedNotificationIdsWithinTimeframe: string[] = [];
  for (let i = 0; i < limit + 3; i++) {
    const timestamp = new Date(now - i * TEN_MINUTES_MS).getTime();
    const notificationReceived: NotificationReceived = {
      notificationId: Random.getRandomUuid(),
      appId: OneSignal.config!.appId!,
      url: "https://localhost:3001",
      timestamp,
    };
    if (notificationReceived.timestamp >= maxTimestamp && receivedNotificationIdsWithinTimeframe.length < limit) {
      receivedNotificationIdsWithinTimeframe.push(notificationReceived.notificationId);
    }
    await Database.put("NotificationReceived", notificationReceived);
  }

  return receivedNotificationIdsWithinTimeframe;
};

export function generateNotificationClicked() {
  return {
    notificationId: Random.getRandomUuid(),
    appId: OneSignal.config!.appId!,
    url: "https://localhost:3001",
    timestamp: new Date().getTime(),
  } as NotificationClicked;
}