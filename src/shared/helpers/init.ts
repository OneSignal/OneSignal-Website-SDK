import Bell from '../../page/bell/Bell';
import type { AppConfig } from '../config/types';
import type { ContextInterface } from '../context/types';
import { db } from '../database/client';
import { getSubscription, setSubscription } from '../database/subscription';
import type { OptionKey } from '../database/types';
import Log from '../libraries/Log';
import { CustomLinkManager } from '../managers/CustomLinkManager';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import { limitStorePut } from '../services/limitStore2';
import OneSignalEvent from '../services/OneSignalEvent';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { once } from '../utils/utils';
import MainHelper from './MainHelper';
import { incrementPageViewCount } from './pageview';
import { triggerNotificationPermissionChanged } from './permissions';
import { registerForPush } from './subscription';

export async function internalInit() {
  Log._debug('Called internalInit()');

  // Always check for an updated service worker
  await OneSignal._context._serviceWorkerManager._installWorker();

  const sessionManager = OneSignal._context._sessionManager;
  OneSignal._emitter.on(
    OneSignal.EVENTS.SESSION_STARTED,
    sessionManager._sendOnSessionUpdateFromPage.bind(sessionManager),
  );
  incrementPageViewCount();

  if (document.visibilityState !== 'visible') {
    postponeSessionInitUntilPageIsInFocus();
    return;
  }

  await sessionInit();
}

function postponeSessionInitUntilPageIsInFocus(): void {
  once(
    document,
    'visibilitychange',
    (_: unknown, destroyEventListener: () => void) => {
      if (document.visibilityState === 'visible') {
        destroyEventListener();
        sessionInit();
      }
    },
    true,
  );
}

async function sessionInit(): Promise<void> {
  Log._debug(`Called sessionInit()`);

  if (OneSignal._sessionInitAlreadyRunning) {
    Log._debug(
      'Returning from sessionInit because it has already been called.',
    );
    return;
  }
  OneSignal._sessionInitAlreadyRunning = true;

  try {
    await doInitialize();
  } catch (err) {
    if (err instanceof Error) return;
    throw err;
  }

  /**
   * We don't want to resubscribe if the user is opted out, and we can't check on HTTP, because the promise will
   * prevent the popup from opening.
   */
  const isOptedOut =
    (await OneSignal._context._subscriptionManager._isOptedOut()) ?? false;
  // saves isOptedOut to localStorage. used for require user interaction functionality
  const subscription = await getSubscription();
  subscription.optedOut = isOptedOut;

  await setSubscription(subscription);
  await handleAutoResubscribe(isOptedOut);

  const isSubscribed =
    await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
  // saves isSubscribed to IndexedDb. used for require user interaction functionality
  await db.put('Options', { key: 'isPushEnabled', value: !!isSubscribed });

  if (OneSignal.config?.userConfig.promptOptions?.autoPrompt && !isOptedOut) {
    OneSignal._context.promptsManager._spawnAutoPrompts();
  }

  OneSignal._sessionInitAlreadyRunning = false;
  await OneSignalEvent._trigger(OneSignal.EVENTS.SDK_INITIALIZED);
}

export async function registerForPushNotifications(): Promise<boolean> {
  return !!(await registerForPush());
}

/**
 * This event occurs after init.
 */
export async function onSdkInitialized() {
  const wasUserResubscribed: boolean = await processExpiringSubscriptions();

  /**
   * If user's subscription was expiring and we processed it, our backend would get a player#create request.
   * If user was not subscribed before and autoPrompting is on, user would get subscribed through player#create if
   *  he clicks allow in an automatic prompt.
   * If user has granted notification permissions but cleared the data and autoResubscribe is on, we will
   *  resubscribe with autoResubscribe flag.
   * In all other cases we would send an on_session request.
   */
  const isExistingUser: boolean =
    await OneSignal._context._subscriptionManager._isAlreadyRegisteredWithOneSignal();
  if (isExistingUser) {
    OneSignal._context._sessionManager._setupSessionEventListeners();
    if (!wasUserResubscribed) {
      await OneSignal._context._updateManager._sendOnSessionUpdate();
    }
  } else if (
    !OneSignal.config?.userConfig.promptOptions?.autoPrompt &&
    !OneSignal.config?.userConfig.autoResubscribe
  ) {
    await OneSignal._context._updateManager._sendOnSessionUpdate();
  }

  await OneSignalEvent._trigger(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC);
}

/** Helper methods */
async function storeInitialValues() {
  const isPushEnabled =
    await OneSignal._context._subscriptionManager._isPushNotificationsEnabled();
  const notificationPermission =
    await OneSignal._context._permissionManager._getPermissionStatus();
  const isOptedOut =
    await OneSignal._context._subscriptionManager._isOptedOut();
  limitStorePut('subscription.optedOut', isOptedOut);
  await db.put('Options', {
    key: 'isPushEnabled',
    value: isPushEnabled,
  });
  await db.put('Options', {
    key: 'notificationPermission',
    value: notificationPermission,
  });
}

async function setWelcomeNotificationFlag(): Promise<void> {
  /*
   * If the user has already granted permission, the user has previously
   * already subscribed. Don't show welcome notifications if the user is
   * automatically resubscribed.
   */
  const permission: NotificationPermission =
    await OneSignal._context._permissionManager._getNotificationPermission(
      OneSignal._context._appConfig.safariWebId,
    );
  if (permission === 'granted') {
    OneSignal._doNotShowWelcomeNotification = true;
  }
}

async function establishServiceWorkerChannel(): Promise<void> {
  if (navigator.serviceWorker && window.isSecureContext) {
    try {
      await OneSignal._context._serviceWorkerManager._establishServiceWorkerChannel();
    } catch (e) {
      Log._error(e);
    }
  }
}

/** Entry method for any environment that sets expiring subscriptions. */
export async function processExpiringSubscriptions(): Promise<boolean> {
  const context: ContextInterface = OneSignal._context;

  Log._debug('Checking subscription expiration...');
  const isSubscriptionExpiring =
    await context._subscriptionManager._isSubscriptionExpiring();
  if (!isSubscriptionExpiring) {
    Log._debug('Subscription is not considered expired.');
    return false;
  }

  Log._debug('Subscription is considered expiring.');
  const rawPushSubscription = await context._subscriptionManager._subscribe(
    SubscriptionStrategyKind.SubscribeNew,
  );
  await context._subscriptionManager._registerSubscription(rawPushSubscription);
  return true;
}

async function doInitialize(): Promise<void> {
  const promises: Promise<void>[] = [];

  // Store initial values of notification permission, user ID, and manual subscription status
  // This is done so that the values can be later compared to see if anything changed
  promises.push(storeInitialValues());
  promises.push(installNativePromptPermissionChangedHook());
  promises.push(setWelcomeNotificationFlag());
  promises.push(establishServiceWorkerChannel());
  promises.push(showNotifyButton());
  promises.push(showPromptsFromWebConfigEditor());

  try {
    await Promise.all(promises);
  } catch (e) {
    Log._error(e);
    throw new Error('Unknown init error');
  }
}

async function showNotifyButton() {
  if (!IS_SERVICE_WORKER && !OneSignal._notifyButton) {
    OneSignal.config!.userConfig.notifyButton =
      OneSignal.config!.userConfig.notifyButton || {};
    if (OneSignal.config!.userConfig.bell) {
      // If both bell and notifyButton, notifyButton's options take precedence
      OneSignal.config!.userConfig.bell = {
        ...OneSignal.config!.userConfig.bell,
        ...OneSignal.config!.userConfig.notifyButton,
      };
      OneSignal.config!.userConfig.notifyButton = {
        ...OneSignal.config!.userConfig.notifyButton,
        ...OneSignal.config!.userConfig.bell,
      };
    }

    const displayPredicate =
      OneSignal.config!.userConfig.notifyButton!.displayPredicate;
    if (displayPredicate && typeof displayPredicate === 'function') {
      OneSignal._emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, async () => {
        const predicateValue = await Promise.resolve(
          OneSignal.config!.userConfig.notifyButton!.displayPredicate?.(),
        );
        if (predicateValue !== false) {
          OneSignal._notifyButton = new Bell(
            OneSignal.config!.userConfig.notifyButton!,
          );
          OneSignal._notifyButton._create();
        } else {
          Log._debug(
            'Notify button display predicate returned false so not showing the notify button.',
          );
        }
      });
    } else {
      OneSignal._notifyButton = new Bell(
        OneSignal.config!.userConfig.notifyButton!,
      );
      OneSignal._notifyButton._create();
    }
  }
}

async function showPromptsFromWebConfigEditor() {
  const config: AppConfig = OneSignal.config!;
  if (config.userConfig.promptOptions) {
    await new CustomLinkManager(
      config.userConfig.promptOptions.customlink,
    )._initialize();
  }
}

async function installNativePromptPermissionChangedHook() {
  try {
    if (navigator.permissions) {
      const permissionStatus = await navigator.permissions.query({
        name: 'notifications',
      });
      // NOTE: Safari 16.4 has a bug where onchange callback never fires
      permissionStatus.onchange = function () {
        triggerNotificationPermissionChanged();
      };
    }
  } catch (e) {
    // Some browsers (Safari 16.3 and older) have the API navigator.permissions.query, but don't support the
    // { name: 'notifications' } param and throws.
    Log._warn(
      `Could not install native notification permission change hook w/ error: ${e}`,
    );
  }
}

export async function saveInitOptions() {
  const opPromises: Promise<any>[] = [];

  const persistNotification = OneSignal.config?.userConfig.persistNotification;
  opPromises.push(
    db.put('Options', {
      key: 'persistNotification',
      value: persistNotification != null ? persistNotification : true,
    }),
  );

  const webhookOptions = OneSignal.config?.userConfig.webhooks;
  [
    'notification.willDisplay',
    'notification.clicked',
    'notification.dismissed',
  ].forEach((event) => {
    if (
      webhookOptions &&
      webhookOptions[event as keyof typeof webhookOptions]
    ) {
      opPromises.push(
        db.put('Options', {
          key: `webhooks.${event}` as OptionKey,
          value: webhookOptions[event as keyof typeof webhookOptions],
        }),
      );
    } else {
      opPromises.push(
        db.put('Options', {
          key: `webhooks.${event}` as OptionKey,
          value: false,
        }),
      );
    }
  });
  if (webhookOptions && webhookOptions.cors) {
    opPromises.push(db.put('Options', { key: `webhooks.cors`, value: true }));
  } else {
    opPromises.push(db.put('Options', { key: `webhooks.cors`, value: false }));
  }

  if (OneSignal.config?.userConfig.notificationClickHandlerMatch) {
    opPromises.push(
      db.put('Options', {
        key: 'notificationClickHandlerMatch',
        value: OneSignal.config.userConfig.notificationClickHandlerMatch,
      }),
    );
  } else {
    opPromises.push(
      db.put('Options', {
        key: 'notificationClickHandlerMatch',
        value: 'exact',
      }),
    );
  }

  if (OneSignal.config?.userConfig.notificationClickHandlerAction) {
    opPromises.push(
      db.put('Options', {
        key: 'notificationClickHandlerAction',
        value: OneSignal.config.userConfig.notificationClickHandlerAction,
      }),
    );
  } else {
    opPromises.push(
      db.put('Options', {
        key: 'notificationClickHandlerAction',
        value: 'navigate',
      }),
    );
  }
  return Promise.all(opPromises);
}

export async function initSaveState(overridingPageTitle?: string) {
  const appId = MainHelper._getAppId();
  const config: AppConfig = OneSignal.config!;
  await db.put('Ids', { type: 'appId', id: appId });
  const pageTitle: string =
    overridingPageTitle || config.siteName || document.title || 'Notification';
  await db.put('Options', { key: 'pageTitle', value: pageTitle });
  Log._info(`OneSignal: Set pageTitle to be '${pageTitle}'.`);
}

async function handleAutoResubscribe(isOptedOut: boolean) {
  Log._info('handleAutoResubscribe', {
    autoResubscribe: OneSignal.config?.userConfig.autoResubscribe,
    isOptedOut,
  });
  if (OneSignal.config?.userConfig.autoResubscribe && !isOptedOut) {
    const currentPermission: NotificationPermission =
      await OneSignal._context._permissionManager._getNotificationPermission(
        OneSignal._context._appConfig.safariWebId,
      );
    if (currentPermission == 'granted') {
      await registerForPush();
    }
  }
}

export function errorIfInitAlreadyCalled() {
  if (OneSignal._initCalled) throw new Error('SDK already initialized');
  OneSignal._initCalled = true;
}
