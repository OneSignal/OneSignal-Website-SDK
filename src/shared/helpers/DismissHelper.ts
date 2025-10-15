import { getItem, setItem } from 'src/page/modules/timedStorage';
import { db, getOptionsValue } from 'src/shared/database/client';
import {
  DismissCountKey,
  DismissPrompt,
  type DismissPromptValue,
  DismissTimeKey,
} from '../../page/models/Dismiss';
import { windowEnvString } from '../environment/detect';
import Log from '../libraries/Log';

const DISMISS_TYPE_COUNT_MAP = {
  [DismissPrompt._Push]: DismissCountKey._PromptDismissCount,
  [DismissPrompt._NonPush]: DismissCountKey._NonPushPromptsDismissCount,
};

const DISMISS_TYPE_TIME_MAP = {
  [DismissPrompt._Push]: DismissTimeKey._OneSignalNotificationPrompt,
  [DismissPrompt._NonPush]: DismissTimeKey._OneSignalNonPushPrompt,
};

/**
 * Creates an expiring local storage entry to note that the user does not want to be disturbed.
 */
export async function markPromptDismissedWithType(type: DismissPromptValue) {
  const countKey = DISMISS_TYPE_COUNT_MAP[type];
  const timeKey = DISMISS_TYPE_TIME_MAP[type];

  let dismissCount = await getOptionsValue<number>(countKey);
  if (!dismissCount) {
    dismissCount = 0;
  }
  dismissCount += 1;

  let dismissDays = 3;
  if (dismissCount == 2) {
    dismissDays = 7;
  } else if (dismissCount > 2) {
    dismissDays = 30;
  }
  Log._debug(
    `(${windowEnvString} environment) OneSignal: User dismissed the ${type} ` +
      `notification prompt; reprompt after ${dismissDays} days.`,
  );
  await db.put('Options', { key: countKey, value: dismissCount });

  const dismissMinutes = dismissDays * 24 * 60;
  return setItem(timeKey, 'dismissed', dismissMinutes);
}

/**
 * Returns true if a LocalStorage entry exists for noting the user dismissed the prompt.
 */
export function wasPromptOfTypeDismissed(type: DismissPromptValue): boolean {
  switch (type) {
    case DismissPrompt._Push:
      return (
        getItem(DismissTimeKey._OneSignalNotificationPrompt) === 'dismissed'
      );
    case DismissPrompt._NonPush:
      return getItem(DismissTimeKey._OneSignalNonPushPrompt) === 'dismissed';
    default:
      break;
  }
  return false;
}
