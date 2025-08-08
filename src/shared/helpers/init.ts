import Bell from '../../page/bell/Bell';
import type { AppConfig } from '../config/types';
import type { ContextInterface } from '../context/types';
import Log from '../libraries/Log';
import { CustomLinkManager } from '../managers/CustomLinkManager';
import { NotificationPermission } from '../models/NotificationPermission';
import { SubscriptionStrategyKind } from '../models/SubscriptionStrategyKind';
import Database from '../services/Database';
import LimitStore from '../services/LimitStore';
import OneSignalEvent from '../services/OneSignalEvent';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { once } from '../utils/utils';
import MainHelper from './MainHelper';
import { incrementPageViewCount } from './pageview';
import { triggerNotificationPermissionChanged } from './permissions';
import SubscriptionHelper from './SubscriptionHelper';

export async function internalInit() {
  Log.debug('Called internalInit()');

  // Always check for an updated service worker
  await OneSignal.context.serviceWorkerManager.installWorker();

  const sessionManager = OneSignal.context.sessionManager;
  OneSignal.emitter.on(
    OneSignal.EVENTS.SESSION_STARTED,
    sessionManager.sendOnSessionUpdateFromPage.bind(sessionManager),
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
  Log.debug(`Called sessionInit()`);

  if (OneSignal._sessionInitAlreadyRunning) {
    Log.debug('Returning from sessionInit because it has already been called.');
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
    (await OneSignal.context.subscriptionManager.isOptedOut()) ?? false;
  // saves isOptedOut to localStorage. used for require user interaction functionality
  const subscription = await Database.getSubscription();
  subscription.optedOut = isOptedOut;

  await Database.setSubscription(subscription);
  await handleAutoResubscribe(isOptedOut);

  const isSubscribed =
    await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
  // saves isSubscribed to IndexedDb. used for require user interaction functionality
  await Database.setIsPushEnabled(!!isSubscribed);

  if (OneSignal.config?.userConfig.promptOptions?.autoPrompt && !isOptedOut) {
    OneSignal.context.promptsManager.spawnAutoPrompts();
  }

  OneSignal._sessionInitAlreadyRunning = false;
  await OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
}

export async function registerForPushNotifications(): Promise<void> {
  await SubscriptionHelper.registerForPush();
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
    await OneSignal.context.subscriptionManager.isAlreadyRegisteredWithOneSignal();
  if (isExistingUser) {
    OneSignal.context.sessionManager.setupSessionEventListeners();
    if (!wasUserResubscribed) {
      await OneSignal.context.updateManager.sendOnSessionUpdate();
    }
  } else if (
    !OneSignal.config?.userConfig.promptOptions?.autoPrompt &&
    !OneSignal.config?.userConfig.autoResubscribe
  ) {
    await OneSignal.context.updateManager.sendOnSessionUpdate();
  }

  await OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC);
}

/** Helper methods */
async function storeInitialValues() {
  const isPushEnabled =
    await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
  const notificationPermission =
    await OneSignal.context.permissionManager.getPermissionStatus();
  const isOptedOut = await OneSignal.context.subscriptionManager.isOptedOut();
  LimitStore.put('subscription.optedOut', isOptedOut);
  await Database.put('Options', {
    key: 'isPushEnabled',
    value: isPushEnabled,
  });
  await Database.put('Options', {
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
    await OneSignal.context.permissionManager.getNotificationPermission(
      OneSignal.context.appConfig.safariWebId,
    );
  if (permission === NotificationPermission.Granted) {
    OneSignal.__doNotShowWelcomeNotification = true;
  }
}

async function establishServiceWorkerChannel(): Promise<void> {
  if (navigator.serviceWorker && window.isSecureContext) {
    try {
      await OneSignal.context.serviceWorkerManager.establishServiceWorkerChannel();
    } catch (e) {
      Log.error(e);
    }
  }
}

/** Entry method for any environment that sets expiring subscriptions. */
export async function processExpiringSubscriptions(): Promise<boolean> {
  const context: ContextInterface = OneSignal.context;

  Log.debug('Checking subscription expiration...');
  const isSubscriptionExpiring =
    await context.subscriptionManager.isSubscriptionExpiring();
  if (!isSubscriptionExpiring) {
    Log.debug('Subscription is not considered expired.');
    return false;
  }

  Log.debug('Subscription is considered expiring.');
  const rawPushSubscription = await context.subscriptionManager.subscribe(
    SubscriptionStrategyKind.SubscribeNew,
  );
  await context.subscriptionManager.registerSubscription(rawPushSubscription);
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
    Log.error(e);
    throw new Error('Unknown init error');
  }
}

async function showNotifyButton() {
  if (!IS_SERVICE_WORKER && !OneSignal.notifyButton) {
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
      OneSignal.emitter.once(OneSignal.EVENTS.SDK_INITIALIZED, async () => {
        const predicateValue = await Promise.resolve(
          OneSignal.config!.userConfig.notifyButton!.displayPredicate?.(),
        );
        if (predicateValue !== false) {
          OneSignal.notifyButton = new Bell(
            OneSignal.config!.userConfig.notifyButton!,
          );
          OneSignal.notifyButton.create();
        } else {
          Log.debug(
            'Notify button display predicate returned false so not showing the notify button.',
          );
        }
      });
    } else {
      OneSignal.notifyButton = new Bell(
        OneSignal.config!.userConfig.notifyButton!,
      );
      OneSignal.notifyButton.create();
    }
  }
}

async function showPromptsFromWebConfigEditor() {
  const config: AppConfig = OneSignal.config!;
  if (config.userConfig.promptOptions) {
    await new CustomLinkManager(
      config.userConfig.promptOptions.customlink,
    ).initialize();
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
    Log.warn(
      `Could not install native notification permission change hook w/ error: ${e}`,
    );
  }
}

export async function saveInitOptions() {
  const opPromises: Promise<any>[] = [];

  const persistNotification = OneSignal.config?.userConfig.persistNotification;
  opPromises.push(
    Database.put('Options', {
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
        Database.put('Options', {
          key: `webhooks.${event}`,
          value: webhookOptions[event as keyof typeof webhookOptions],
        }),
      );
    } else {
      opPromises.push(
        Database.put('Options', { key: `webhooks.${event}`, value: false }),
      );
    }
  });
  if (webhookOptions && webhookOptions.cors) {
    opPromises.push(
      Database.put('Options', { key: `webhooks.cors`, value: true }),
    );
  } else {
    opPromises.push(
      Database.put('Options', { key: `webhooks.cors`, value: false }),
    );
  }

  if (OneSignal.config?.userConfig.notificationClickHandlerMatch) {
    opPromises.push(
      Database.put('Options', {
        key: 'notificationClickHandlerMatch',
        value: OneSignal.config.userConfig.notificationClickHandlerMatch,
      }),
    );
  } else {
    opPromises.push(
      Database.put('Options', {
        key: 'notificationClickHandlerMatch',
        value: 'exact',
      }),
    );
  }

  if (OneSignal.config?.userConfig.notificationClickHandlerAction) {
    opPromises.push(
      Database.put('Options', {
        key: 'notificationClickHandlerAction',
        value: OneSignal.config.userConfig.notificationClickHandlerAction,
      }),
    );
  } else {
    opPromises.push(
      Database.put('Options', {
        key: 'notificationClickHandlerAction',
        value: 'navigate',
      }),
    );
  }
  return Promise.all(opPromises);
}

export async function initSaveState(overridingPageTitle?: string) {
  const appId = MainHelper.getAppId();
  const config: AppConfig = OneSignal.config!;
  await Database.put('Ids', { type: 'appId', id: appId });
  const pageTitle: string =
    overridingPageTitle || config.siteName || document.title || 'Notification';
  await Database.put('Options', { key: 'pageTitle', value: pageTitle });
  Log.info(`OneSignal: Set pageTitle to be '${pageTitle}'.`);
}

async function handleAutoResubscribe(isOptedOut: boolean) {
  Log.info('handleAutoResubscribe', {
    autoResubscribe: OneSignal.config?.userConfig.autoResubscribe,
    isOptedOut,
  });
  if (OneSignal.config?.userConfig.autoResubscribe && !isOptedOut) {
    const currentPermission: NotificationPermission =
      await OneSignal.context.permissionManager.getNotificationPermission(
        OneSignal.context.appConfig.safariWebId,
      );
    if (currentPermission == NotificationPermission.Granted) {
      await SubscriptionHelper.registerForPush();
    }
  }
}

export function errorIfInitAlreadyCalled() {
  if (OneSignal._initCalled) throw new Error('SDK already initialized');
  OneSignal._initCalled = true;
}
