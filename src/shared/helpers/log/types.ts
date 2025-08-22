import type { OperationQueueItem } from 'src/core/operationRepo/OperationRepo';
import type { WorkerMessengerPayload } from 'src/shared/libraries/workerMessenger/types';
import type { Subscription } from 'src/shared/models/Subscription';
import type { Operation } from '../../../core/operations/Operation';
import type { UpsertOrDeactivateSessionPayload } from '../../session/types';
import type { LogMessage } from './constants';

export interface LogMessageMap {
  // Shared Messages
  [LogMessage.Error]: unknown; // actually an error object
  [LogMessage.DatabaseBlocked]: void;
  [LogMessage.ApiOutcomePayload]: { payload: unknown };
  [LogMessage.ApiOutcomeError]: { error: unknown };

  // Service Worker Messages
  [LogMessage.ServiceWorkerSessionUpsert]: WorkerMessengerPayload;
  [LogMessage.ServiceWorkerSessionDeactivate]: WorkerMessengerPayload;
  [LogMessage.ServiceWorkerSetupListeners]: void;
  [LogMessage.ServiceWorkerWorkerVersion]: void;
  [LogMessage.ServiceWorkerSubscribe]: void;
  [LogMessage.ServiceWorkerSubscribeNew]: void;
  [LogMessage.ServiceWorkerRawNotification]: object;
  [LogMessage.ServiceWorkerNotificationDisplay]: unknown;
  [LogMessage.ServiceWorkerRefreshSession]: void;
  [LogMessage.ServiceWorkerHasActiveSessions]: boolean;
  [LogMessage.ServiceWorkerUpdateSession]: ServiceWorkerGlobalScope['clientsStatus'];
  [LogMessage.ServiceWorkerDebounceRefresh]: UpsertOrDeactivateSessionPayload;
  [LogMessage.ServiceWorkerImageResource]: unknown;
  [LogMessage.ServiceWorkerActivated]: { version?: string };
  [LogMessage.ServiceWorkerPushSubscriptionChange]: unknown;
  [LogMessage.NotificationClicked]: object;
  [LogMessage.NotificationSaveError]: unknown;
  [LogMessage.NotificationOriginError]: unknown;
  [LogMessage.ServiceWorkerVisibilityResponse]: unknown;
  [LogMessage.ServiceWorkerPushReceived]: unknown;
  [LogMessage.ServiceWorkerPushPayload]: void;
  [LogMessage.ServiceWorkerFocus]: void;
  [LogMessage.ServiceWorkerFocusError]: {
    client: unknown;
    error: unknown;
  };
  [LogMessage.ServiceWorkerNavigateError]: {
    client: unknown;
    launchUrl: string;
    error: unknown;
  };
  [LogMessage.ServiceWorkerRedirectUrl]: { launchUrl: string };
  [LogMessage.ServiceWorkerNoNavigation]: void;
  [LogMessage.ServiceWorkerOpenUrl]: { url: string };
  [LogMessage.ServiceWorkerOpenUrlError]: { url: string; error: unknown };
  [LogMessage.ServiceWorkerLaunchUrlParseError]: unknown;
  [LogMessage.ServiceWorkerJSONParseError]: unknown;
  [LogMessage.ServiceWorkerConfirmedDelivery]: object;
  [LogMessage.ServiceWorkerDisplayNotification]: object;
  [LogMessage.ServiceWorkerNotificationClosed]: unknown;
  [LogMessage.ServiceWorkerNotificationClicked]: NotificationEvent;
  [LogMessage.ServiceWorkerInvalidPayload]: object;
  [LogMessage.ApiUserIdError]: { error: unknown };
  [LogMessage.ApiSessionError]: { error: unknown };
  [LogMessage.ApiDurationError]: { error: unknown };

  // Page Messages - Core Operations
  [LogMessage.CustomEvents]: Operation[];
  [LogMessage.IdentityOp]: Operation[];
  [LogMessage.LoginUser]: Operation[];
  [LogMessage.LoginUserFailConflict]: { externalId?: string };
  [LogMessage.LoginUserFailNoRetry]: { externalId?: string };
  [LogMessage.RefreshUserExecute]: Operation[];

  // Page Messages - Session Manager
  [LogMessage.SessionManagerUpsert]: void;
  [LogMessage.SessionManagerDeactivate]: void;
  [LogMessage.SessionManagerVisibilityChange]: string;
  [LogMessage.SessionManagerVisibilityError]: string;
  [LogMessage.SessionManagerUnhandledVisibility]: string;
  [LogMessage.SessionManagerBeforeUnload]: void;
  [LogMessage.SessionManagerFocus]: Event;
  [LogMessage.SessionManagerBlur]: Event;
  [LogMessage.SessionManagerSetup]: void;
  [LogMessage.SessionManagerSupportsSW]: void;
  [LogMessage.SessionManagerNoOnesignalId]: void;
  [LogMessage.SessionManagerVisibilityChangeError]: { error: unknown };
  [LogMessage.SessionManagerBeforeUnloadError]: { error: unknown };
  [LogMessage.SessionManagerFocusError]: { error: unknown };
  [LogMessage.SessionManagerBlurError]: { error: unknown };
  [LogMessage.SessionManagerUpdateError]: { error: unknown };
  [LogMessage.SessionManagerUpdateFailedError]: {
    error: { message: string; stack?: string };
  };

  // Page Messages - Service Worker Manager
  [LogMessage.ServiceWorkerManagerWorkerState]: string | { state: string };
  [LogMessage.ServiceWorkerManagerScopeChange]: unknown;
  [LogMessage.ServiceWorkerManagerHrefChange]: unknown;
  [LogMessage.ServiceWorkerManagerVersionCheck]: void;
  [LogMessage.ServiceWorkerManagerVersionUpdateTimeout]: void;
  [LogMessage.ServiceWorkerManagerVersionUpdateNeeded]: {
    oldVersion: string;
    newVersion: string;
  };
  [LogMessage.ServiceWorkerManagerVersionUpdateCurrent]: {
    version: string;
  };
  [LogMessage.ServiceWorkerManagerEstablishChannel]: void;
  [LogMessage.ServiceWorkerManagerNotificationDisplay]: {
    origin: string;
    notification: unknown;
  };
  [LogMessage.ServiceWorkerManagerNotificationStore]: void;
  [LogMessage.ServiceWorkerManagerInstallWorker]: void;
  [LogMessage.ServiceWorkerManagerInstallError]: unknown;
  [LogMessage.ServiceWorkerManagerInstallComplete]: void;
  [LogMessage.ServiceWorkerManagerWorkerActive]: void;
  [LogMessage.ServiceWorkerManagerInstallBeta]: {
    workerHref: string;
    scope: string;
  };
  [LogMessage.ServiceWorkerManagerAkamaiSW]: unknown;
  [LogMessage.ServiceWorkerManagerInstallPermissions]: void;
  [LogMessage.ServiceWorkerManagerInstallNoRegistration]: {
    scope: string;
  };
  [LogMessage.ServiceWorkerManagerInstallThirdParty]: void;
  [LogMessage.ServiceWorkerManagerInstallStarting]: {
    workerHref: string;
    scope: string;
  };
  [LogMessage.ServiceWorkerRegistrationError]: {
    scope: string;
    error: unknown;
  };
  [LogMessage.ServiceWorkerInstanceNotFound]: void;

  // Page Messages - Update Manager
  [LogMessage.UpdateManagerNotRegistered]: void;
  [LogMessage.UpdateManagerNoDevice]: void;
  [LogMessage.UpdateManagerError]: { message: string; stack?: string };
  [LogMessage.UpdateManagerOutcomeAborted]: void;

  // Page Messages - Custom Link Manager
  [LogMessage.CustomLinkManagerInit]: void;
  [LogMessage.CustomLinkManagerMissingText]: void;
  [LogMessage.CustomLinkManagerSubscribeClicked]: void;
  [LogMessage.CustomLinkManagerStylesFailure]: void;

  // Page Messages - Init
  [LogMessage.InitInternalInit]: void;
  [LogMessage.InitSessionInit]: void;
  [LogMessage.InitSessionAlreadyRunning]: void;
  [LogMessage.InitSubscriptionExpiration]: void;
  [LogMessage.InitSubscriptionNotExpired]: void;
  [LogMessage.InitSubscriptionExpiring]: void;
  [LogMessage.InitNotifyButtonPredicate]: { show: boolean };
  [LogMessage.InitPermissionHookError]: unknown;
  [LogMessage.InitPageTitle]: { title: string };
  [LogMessage.InitAutoResubscribe]: {
    autoResubscribe?: boolean;
    isOptedOut: boolean;
  };
  [LogMessage.InitSdkDoubleLoad]: { loadCount: number };
  [LogMessage.InitFinalConfig]: { appConfig: unknown };
  [LogMessage.InitBrowserEnvironment]: {
    browserName: string;
    browserVersion: number;
  };
  [LogMessage.InitWaitingForDom]: void;
  [LogMessage.InitCurrentPageUrl]: { url: string };

  // Page Messages - Listeners
  [LogMessage.ListenersPushStateChanged]: object;
  [LogMessage.ListenersUserStateChanged]: object;
  [LogMessage.ListenersNotifyButton]: { show: boolean };
  [LogMessage.ListenersWelcomeNotification]: { skip: boolean };

  // Page Messages - Service Worker Helper
  [LogMessage.ServiceWorkerHelperSessionActive]: unknown;
  [LogMessage.ServiceWorkerHelperSessionInvalid]: unknown;
  [LogMessage.ServiceWorkerHelperNoActiveSession]: void;
  [LogMessage.ServiceWorkerHelperInvalidStateDeactivate]: {
    status: unknown;
  };
  [LogMessage.ServiceWorkerHelperFinalizeSession]: {
    startTimestamp: number;
    accumulatedDuration: number;
  };
  [LogMessage.ServiceWorkerHelperSendFocus]: { duration: number };
  [LogMessage.ServiceWorkerHelperSendFocusAttribution]: unknown;
  [LogMessage.ServiceWorkerHelperFinalizeComplete]: {
    startTimestamp: number;
    accumulatedDuration: number;
  };
  [LogMessage.ServiceWorkerHelperDatabaseError]: unknown;

  // Page Messages - Events and Utils
  [LogMessage.OneSignalEventTrigger]: {
    windowEnvString: string;
    eventName: string;
    displayData?: unknown;
  };
  [LogMessage.PageViewIncremented]: {
    newCountSingleTab: number;
    newCountCumulative: number;
  };
  [LogMessage.DomElementNotFound]: { selector: string };

  // Page Messages - Outcomes
  [LogMessage.OutcomesNotSupported]: void;
  [LogMessage.OutcomesNameRequired]: void;
  [LogMessage.OutcomesSubscribedOnly]: void;
  [LogMessage.OutcomesSentDuringSession]: void;
  [LogMessage.SessionOutcomeReported]: { outcomeName?: string };
  [LogMessage.OutcomesOutcomeEventFailed]: void;
  [LogMessage.OutcomesInfluenceChannel]: {
    count: number;
    details: unknown;
  };
  [LogMessage.OutcomesDirectChannel]: {
    count: number;
    details: unknown;
  };
  [LogMessage.OutcomesIndirectChannel]: {
    count: number;
    details: unknown;
  };
  [LogMessage.OutcomesConfigMissing]: { outcomeName: string };
  [LogMessage.OutcomesWeightInvalid]: void;

  // Page Messages - Operation Repo
  [LogMessage.OperationRepoEnqueue]: { operation: Operation };
  [LogMessage.OperationRepoEnqueueAndWait]: { operation: Operation };
  [LogMessage.OperationRepoInternalEnqueueExists]: { modelId: string };
  [LogMessage.OperationRepoPaused]: void;
  [LogMessage.OperationRepoInProgress]: void;
  [LogMessage.OperationRepoProcessQueue]: {
    operations: OperationQueueItem[] | null;
  };
  [LogMessage.OperationRepoExecuteResponse]: { result: unknown };
  [LogMessage.OperationRepoFailNoRetry]: { operations: Operation[] };
  [LogMessage.OperationRepoFailRetry]: { operations: Operation[] };
  [LogMessage.OperationRepoFailPause]: { operations: Operation[] };
  [LogMessage.OperationRepoExecuteError]: {
    operations: OperationQueueItem[];
    error: unknown;
  };
  [LogMessage.OperationRepoRetrySeconds]: { seconds?: number };
  [LogMessage.OperationRepoDelay]: { delayMs: number };

  // Page Messages - Main Helper
  [LogMessage.MainHelperServiceWorkerError]: void;
  [LogMessage.MainHelperApiCallFailed]: { url: string; errors: unknown };

  // Page Messages - Operation Model Store
  [LogMessage.OperationModelStoreNullObject]: void;
  [LogMessage.OperationModelStoreMissingName]: void;
  [LogMessage.OperationModelStoreInvalidOperation]: {
    operationName: string;
  };

  // Page Messages - Executors
  [LogMessage.UpdateUserOperationExecutor]: { operations: Operation[] };
  [LogMessage.SubscriptionOperationExecutor]: { operations: Operation[] };

  // Page Messages - Bell Components
  [LogMessage.BellMessageDisplay]: {
    type: string;
    content: string;
    duration: number;
  };
  [LogMessage.BellNotifyButtonStylesError]: void;
  [LogMessage.BellNotifyButtonShow]: void;
  [LogMessage.BellActiveElementTransition]: void;
  [LogMessage.BellActiveElementActivationTimeout]: {
    state: string;
    activeState?: string;
  };
  [LogMessage.BellActiveElementInactivationTimeout]: {
    state: string;
    activeState?: string;
  };
  [LogMessage.BellAnimatedElementShowTimeout]: { state: string };
  [LogMessage.BellAnimatedElementHideTimeout]: { state: string };
  [LogMessage.BellLauncherResizeTimeout]: {
    state: string;
    activeState?: string;
  };
  [LogMessage.BellDomElementNotFound]: void;
  [LogMessage.BellActiveAnimatedElementNotFound]: void;
  [LogMessage.BellAnimatedElementNotFound]: {
    selector: string;
    operation: 'hide' | 'show';
  };

  // Page Messages - Tag Manager
  [LogMessage.TagManagerLocalTags]: { tags: unknown };
  [LogMessage.TagManagerError]: void;

  // Page Messages - Slidedown Manager
  [LogMessage.SlidedownManagerSubscribed]: void;
  [LogMessage.SlidedownManagerDismissError]: { slidedownType?: string };
  [LogMessage.SlidedownManagerTaggingContainerError]: { error: unknown };
  [LogMessage.SlidedownManagerChannelCaptureError]: { error: unknown };
  [LogMessage.SlidedownManagerUpdateError]: { error: unknown };
  [LogMessage.SlidedownManagerDismiss]: void;
  [LogMessage.SlidedownManagerShowError]: { error: unknown };
  [LogMessage.SlidedownManagerShowDebug]: { error: unknown };
  [LogMessage.SlidedownManagerShow]: void;
  [LogMessage.SlidedownInternationalTelephoneInputError]: void;
  [LogMessage.SlidedownValidationElementNotFound]: void;

  // Page Messages - Prompts Manager
  [LogMessage.PromptsManagerInvalidDelay]: void;
  [LogMessage.PromptsManagerInvalidType]: void;
  [LogMessage.PromptsManagerAutopromptShowing]: void;
  [LogMessage.PromptsManagerStylesFailure]: void;
  [LogMessage.PromptsManagerDismissPush]: void;
  [LogMessage.PromptsManagerDismissNonPush]: void;
  [LogMessage.PromptsManagerDefaultTextSettings]: void;
  [LogMessage.PromptsManagerSlidedownConfigError]: {
    slidedownType: string;
  };

  // Page Messages - Login Manager and User
  [LogMessage.LoginManagerAlreadySet]: void;
  [LogMessage.LoginManagerNotLoggedIn]: void;
  [LogMessage.UserTagSync]: void;
  [LogMessage.UserNotLoggedIn]: void;
  [LogMessage.UserCustomEventPropertiesNotSerializable]: void;
  [LogMessage.UserDirectorNoSubscriptionOrId]: void;

  // Page Messages - OneSignal SDK
  [LogMessage.OneSignalSdkLoaded]: {
    version: string;
    environment: string;
  };

  // Page Messages - Utils
  [LogMessage.UtilsLogMethodCall]: { methodName: string; args: string };
  [LogMessage.UtilsOnceNoEvent]: { event: unknown };
  [LogMessage.UtilsOnceNoTask]: { task: unknown };
  [LogMessage.DismissHelperPromptDismissed]: {
    windowEnvString: string;
    type: string;
    dismissDays: number;
  };

  // Page Messages - PushSubscription Namespace
  [LogMessage.PushSubscriptionNamespaceInitSkipped]: {
    initialize: boolean;
    subscription?: Subscription;
  };

  // Page Messages - Subscription Manager
  [LogMessage.SubscriptionNoPushYet]: void;
  [LogMessage.SubscriptionSafariInstalling]: void;
  [LogMessage.SubscriptionSafariInstalled]: void;
  [LogMessage.SubscriptionSafariError]: void;
  [LogMessage.SubscriptionDebugPermissionDismissed]: void;
  [LogMessage.SubscriptionDebugPermissionBlocked]: void;
  [LogMessage.SubscriptionDebugWorkerReady]: void;
  [LogMessage.SubscriptionManagerExistingPushWithOptions]: void;
  [LogMessage.SubscriptionManagerExistingPushNoOptions]: void;
  [LogMessage.SubscriptionManagerSubscribeOptions]: unknown;
  [LogMessage.SubscriptionManagerUnsubscribing]: void;
  [LogMessage.SubscriptionManagerUnsubscribeResult]: { result: unknown };
  [LogMessage.SubscriptionManagerApplicationServerKeyChange]: {
    error: Error;
  };

  // Page Messages - API Errors
  [LogMessage.ApiError]: { url: string };

  // Page Messages - Worker Messenger
  [LogMessage.WorkerMessengerPageReceived]: { eventData: unknown };
  [LogMessage.WorkerMessengerPageListening]: { origin: string };
  [LogMessage.WorkerMessengerPageUnicast]: { command: string };
  [LogMessage.WorkerMessengerPageDirect]: { command: string };
  [LogMessage.WorkerMessengerPageRegistrationError]: void;
  [LogMessage.WorkerMessengerPageServiceWorkerError]: void;
  [LogMessage.WorkerMessengerSWListening]: void;
  [LogMessage.WorkerMessengerSWReceived]: unknown;
  [LogMessage.WorkerMessengerSWBroadcast]: {
    command: string;
    url: string;
  };
  [LogMessage.WorkerMessengerSWUnicast]: {
    command: string;
    url: string;
  };

  [LogMessage.OSWebhookExecute]: {
    event: string;
    corsEnabled: boolean | null;
    url: string;
    payload: unknown;
  };
  [LogMessage.CancelableTimeoutCancel]: void;
  [LogMessage.CancelableTimeoutCallbackError]: { error: unknown };
}

type LogArgs = {
  [K in keyof LogMessageMap]: LogMessageMap[K] extends void
    ? [K] | [K, void]
    : [K, LogMessageMap[K]];
}[keyof LogMessageMap];

export type LogFunction = (...args: LogArgs) => void;
