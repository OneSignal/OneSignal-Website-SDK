import UserNamespace from 'src/onesignal/UserNamespace';
import type { SubscriptionChangeEvent } from 'src/page/models/SubscriptionChangeEvent';
import type { UserChangeEvent } from 'src/page/models/UserChangeEvent';
import { debug, info } from 'src/shared/libraries/log';
import { db, getOptionsValue } from './database/client';
import { getAppState, setAppState } from './database/config';
import { decodeHtmlEntities } from './helpers/dom';
import { getCurrentPushToken, showLocalNotification } from './helpers/main';
import { CustomLinkManager } from './managers/CustomLinkManager';
import { UserState } from './models/UserState';
import type {
  NotificationClickEvent,
  NotificationClickEventInternal,
} from './notifications/types';
import { isCategorySlidedownConfigured } from './prompts/helpers';
import { limitStorePut } from './services/limitStore';
import OneSignalEvent from './services/OneSignalEvent';
import { logMethodCall } from './utils/utils';

export async function checkAndTriggerSubscriptionChanged() {
  logMethodCall('checkAndTriggerSubscriptionChanged');
  const context = OneSignal._context;
  // isPushEnabled = subscribed && is not opted out
  const isPushEnabled: boolean =
    await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
  // isOptedIn = native permission granted && is not opted out
  const isOptedIn: boolean =
    await OneSignal._context._subscriptionManager._isOptedIn!();

  const appState = await getAppState();
  const {
    lastKnownPushEnabled,
    lastKnownPushId,
    lastKnownPushToken,
    lastKnownOptedIn,
  } = appState;
  const currentPushToken = await getCurrentPushToken();

  const pushModel = await OneSignal._coreDirector._getPushSubscriptionModel();
  const pushSubscriptionId = pushModel?.id;

  const didStateChange =
    isPushEnabled !== lastKnownPushEnabled ||
    currentPushToken !== lastKnownPushToken ||
    pushSubscriptionId !== lastKnownPushId;

  if (!didStateChange) {
    return;
  }

  // update notification_types via core module
  await context._subscriptionManager._updateNotificationTypes!();

  appState.lastKnownPushEnabled = isPushEnabled;
  appState.lastKnownPushToken = currentPushToken;
  appState.lastKnownPushId = pushSubscriptionId;
  appState.lastKnownOptedIn = isOptedIn;
  await setAppState(appState);

  const change: SubscriptionChangeEvent = {
    previous: {
      id: lastKnownPushId,
      token: lastKnownPushToken,
      // default to true if not stored yet
      optedIn: lastKnownOptedIn ?? true,
    },
    current: {
      id: pushSubscriptionId,
      token: currentPushToken,
      optedIn: isOptedIn,
    },
  };
  info('Push Subscription state changed: ', change);
  triggerSubscriptionChanged(change);
}

function triggerSubscriptionChanged(change: SubscriptionChangeEvent) {
  OneSignalEvent._trigger('change', change);
}

export function triggerNotificationClick(
  event: NotificationClickEventInternal,
): Promise<void> {
  const publicEvent: NotificationClickEvent = {
    notification: event.notification,
    result: event.result,
  };
  return OneSignalEvent._trigger('click', publicEvent);
}

const getUserState = async (): Promise<UserState> => {
  const userState = new UserState();
  userState.previousOneSignalId = '';
  userState.previousExternalId = '';
  // previous<OneSignalId|ExternalId> are used to track changes to the user's state.
  // Displayed in the `current` & `previous` fields of the `userChange` event.
  userState.previousOneSignalId = await getOptionsValue<string>(
    'previousOneSignalId',
  );
  userState.previousExternalId =
    await getOptionsValue<string>('previousExternalId');
  return userState;
};

const setUserState = async (userState: UserState) => {
  await db.put('Options', {
    key: 'previousOneSignalId',
    value: userState.previousOneSignalId,
  });
  await db.put('Options', {
    key: 'previousExternalId',
    value: userState.previousExternalId,
  });
};

export async function checkAndTriggerUserChanged() {
  logMethodCall('checkAndTriggerUserChanged');

  const userState = await getUserState();
  const { previousOneSignalId, previousExternalId } = userState;

  const identityModel = await OneSignal._coreDirector._getIdentityModel();
  const currentOneSignalId = identityModel?._onesignalId;
  const currentExternalId = identityModel?._externalId;

  const didStateChange =
    currentOneSignalId !== previousOneSignalId ||
    currentExternalId !== previousExternalId;
  if (!didStateChange) {
    return;
  }

  userState.previousOneSignalId = currentOneSignalId;
  userState.previousExternalId = currentExternalId;
  await setUserState(userState);

  const change: UserChangeEvent = {
    current: {
      onesignalId: currentOneSignalId,
      externalId: currentExternalId,
    },
  };
  info('User state changed: ', change);
  triggerUserChanged(change);
}

function triggerUserChanged(change: UserChangeEvent) {
  UserNamespace._emitter._emit('change', change);
}

async function onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate() {
  if (!OneSignal.config?.userConfig.notifyButton) return;

  const displayPredicate =
    OneSignal.config.userConfig.notifyButton.displayPredicate;
  if (
    displayPredicate &&
    typeof displayPredicate === 'function' &&
    OneSignal._notifyButton
  ) {
    const predicateResult = await displayPredicate();
    if (predicateResult !== false) {
      debug('Showing notify button because display predicate returned true.');
      OneSignal._notifyButton._launcher._show();
    } else {
      debug('Hiding notify button because display predicate returned false.');
      OneSignal._notifyButton._launcher._hide();
    }
  }
}

function onSubscriptionChanged_updateCustomLink() {
  if (OneSignal.config?.userConfig.promptOptions) {
    new CustomLinkManager(
      OneSignal.config?.userConfig.promptOptions.customlink,
    )._initialize();
  }
}

export async function onInternalSubscriptionSet(optedOut: boolean) {
  limitStorePut('subscription.optedOut', optedOut);
}

async function onSubscriptionChanged_showWelcomeNotification(
  isSubscribed: boolean | undefined,
  pushSubscriptionId: string | undefined | null,
) {
  if (OneSignal._doNotShowWelcomeNotification) {
    debug(
      'Not showing welcome notification because user has previously subscribed.',
    );
    return;
  }
  const welcome_notification_opts =
    OneSignal.config?.userConfig.welcomeNotification;
  const welcome_notification_disabled =
    welcome_notification_opts !== undefined &&
    welcome_notification_opts['disable'] === true;

  if (welcome_notification_disabled) {
    return;
  }

  if (isSubscribed !== true) {
    return;
  }

  if (!pushSubscriptionId) {
    return;
  }

  let title =
    welcome_notification_opts !== undefined &&
    welcome_notification_opts['title'] !== undefined &&
    welcome_notification_opts['title'] !== null
      ? welcome_notification_opts['title']
      : '';
  let message =
    welcome_notification_opts !== undefined &&
    welcome_notification_opts['message'] !== undefined &&
    welcome_notification_opts['message'] !== null &&
    welcome_notification_opts['message'].length > 0
      ? welcome_notification_opts['message']
      : 'Thanks for subscribing!';
  const unopenableWelcomeNotificationUrl =
    new URL(location.href).origin + '?_osp=do_not_open';
  const url =
    welcome_notification_opts &&
    welcome_notification_opts['url'] &&
    welcome_notification_opts['url'].length > 0
      ? welcome_notification_opts['url']
      : unopenableWelcomeNotificationUrl;
  title = decodeHtmlEntities(title);
  message = decodeHtmlEntities(message);

  debug('Sending welcome notification.');
  showLocalNotification(
    title,
    message,
    url,
    undefined,
    { __isOneSignalWelcomeNotification: true },
    undefined,
  );
  OneSignalEvent._trigger('sendWelcomeNotification', {
    title: title,
    message: message,
    url: url,
  });
}

async function onSubscriptionChanged_sendCategorySlidedownTags(
  isSubscribed?: boolean | null,
) {
  if (isSubscribed !== true) return;

  const prompts =
    OneSignal._context._appConfig.userConfig.promptOptions?.slidedown?.prompts;
  if (isCategorySlidedownConfigured(prompts)) {
    await OneSignal._context._tagManager._sendTags();
  }
}

export function _onSubscriptionChanged(
  change: SubscriptionChangeEvent | undefined,
) {
  onSubscriptionChanged_showWelcomeNotification(
    change?.current?.optedIn,
    change?.current?.id,
  );
  onSubscriptionChanged_sendCategorySlidedownTags(change?.current?.optedIn);
  onSubscriptionChanged_evaluateNotifyButtonDisplayPredicate();
  onSubscriptionChanged_updateCustomLink();
}
