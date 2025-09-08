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
  [DismissPrompt.Push]: DismissCountKey.PromptDismissCount,
  [DismissPrompt.NonPush]: DismissCountKey.NonPushPromptsDismissCount,
};

const DISMISS_TYPE_TIME_MAP = {
  [DismissPrompt.Push]: DismissTimeKey.OneSignalNotificationPrompt,
  [DismissPrompt.NonPush]: DismissTimeKey.OneSignalNonPushPrompt,
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
    case DismissPrompt.Push:
      return (
        getItem(DismissTimeKey.OneSignalNotificationPrompt) === 'dismissed'
      );
    case DismissPrompt.NonPush:
      return getItem(DismissTimeKey.OneSignalNonPushPrompt) === 'dismissed';
    default:
      break;
  }
  return false;
}
