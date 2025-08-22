import {
  MessageType,
  MessageTypePage,
  MessageTypeSW,
} from 'src/shared/helpers/log/constants';
import Log from 'src/shared/helpers/log/LogBase';
import { IS_SERVICE_WORKER } from 'src/shared/utils/EnvVariables';

self.OneSignalLog = (type, data?) => {
  // service worker messages
  if (IS_SERVICE_WORKER) {
    switch (type) {
      case MessageTypeSW.ServiceWorkerSessionUpsert:
        Log.debug('[Service Worker] Received SessionUpsert', data);
        break;
      case MessageTypeSW.ServiceWorkerSessionDeactivate:
        Log.debug('[Service Worker] Received SessionDeactivate', data);
        break;
      case MessageTypeSW.ServiceWorkerSetupListeners:
        Log.debug('Setting up message listeners.');
        break;
      case MessageTypeSW.ServiceWorkerWorkerVersion:
        Log.debug('[Service Worker] Received worker version message.');
        break;
      case MessageTypeSW.ServiceWorkerSubscribe:
        Log.debug('[Service Worker] Received subscribe message.');
        break;
      case MessageTypeSW.ServiceWorkerSubscribeNew:
        Log.debug('[Service Worker] Received subscribe new message.');
        break;
      case MessageTypeSW.ServiceWorkerRawNotification:
        Log.debug('Raw Notification from OneSignal:', data);
        break;
      case MessageTypeSW.ServiceWorkerError:
        Log.error(data);
        break;
      case MessageTypeSW.ServiceWorkerConfirmedDelivery:
        Log.debug(
          `Called sendConfirmedDelivery(${JSON.stringify(data, null, 4)})`,
        );
        break;
      case MessageTypeSW.ServiceWorkerNotificationDisplay:
        Log.debug('Failed to display a notification:', data);
        break;
      case MessageTypeSW.ServiceWorkerRefreshSession:
        Log.debug('[Service Worker] refreshSession');
        break;
      case MessageTypeSW.ServiceWorkerHasActiveSessions:
        Log.debug('[Service Worker] hasAnyActiveSessions', data);
        break;
      case MessageTypeSW.ServiceWorkerUpdateSession:
        Log.debug('updateSessionBasedOnHasActive', data);
        break;
      case MessageTypeSW.ServiceWorkerDebounceRefresh:
        Log.debug('[Service Worker] debounceRefreshSession', data);
        break;
      case MessageTypeSW.ServiceWorkerImageResource:
        Log.error('ensureImageResourceHttps: ', data);
        break;
      case MessageTypeSW.NotificationClicked:
        Log.info('NotificationClicked', data);
        break;
      case MessageTypeSW.NotificationSaveError:
        Log.error('Failed to save clicked notification.', data);
        break;
      case MessageTypeSW.NotificationOriginError:
        Log.error(`Failed to get the HTTP site's actual origin:`, data);
        break;
      case MessageTypeSW.ServiceWorkerVisibilityResponse:
        Log.debug('[Service Worker] Received response for AreYouVisible', data);
        break;
      case MessageTypeSW.ServiceWorkerPushReceived:
        Log.debug(
          `Called onPushReceived(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case MessageTypeSW.ServiceWorkerActivated:
        Log.info(
          `OneSignal Service Worker activated (version ${data.version || 'unknown'})`,
        );
        break;
      case MessageTypeSW.ServiceWorkerPushSubscriptionChange:
        Log.debug(
          `Called onPushSubscriptionChange(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case MessageTypeSW.ServiceWorkerPushPayload:
        Log.debug('Received a valid encrypted push payload.');
        break;
      case MessageTypeSW.ServiceWorkerLaunchUrl:
        Log.debug(data.message, data.details);
        break;
      case MessageTypeSW.ServiceWorkerFocusError:
        Log.error('Failed to focus:', data.client, data.error);
        break;
      case MessageTypeSW.ServiceWorkerNavigateError:
        Log.error(
          'Failed to navigate:',
          data.client,
          data.launchUrl,
          data.error,
        );
        break;
      case MessageTypeSW.ServiceWorkerRedirectUrl:
        Log.debug(`Redirecting HTTPS site to (${data.launchUrl}).`);
        break;
      case MessageTypeSW.ServiceWorkerNoNavigation:
        Log.debug('Not navigating because link is special.');
        break;
      case MessageTypeSW.ServiceWorkerOpenUrl:
        Log.debug('Opening notification URL:', data.url);
        break;
      case MessageTypeSW.ServiceWorkerOpenUrlError:
        Log.warn(`Failed to open the URL '${data.url}':`, data.error);
        break;
      case MessageTypeSW.ServiceWorkerLaunchUrlParseError:
        Log.error(`Failed parse launchUrl:`, data);
        break;
      case MessageTypeSW.ServiceWorkerJSONParseError:
        Log.debug('isValidPushPayload: Parsing to JSON failed with:', data);
        break;
      case MessageTypeSW.ServiceWorkerDisplayNotification:
        Log.debug(
          `Called displayNotification(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case MessageTypeSW.ServiceWorkerNotificationClosed:
        Log.debug(
          `Called onNotificationClosed(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case MessageTypeSW.ServiceWorkerNotificationClicked:
        Log.debug(
          `Called onNotificationClicked(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case MessageTypeSW.ServiceWorkerInvalidPayload:
        Log.debug(
          'isValidPushPayload: Valid JSON but missing notification UUID:',
          data,
        );
        break;

      // SW - API Errors
      case MessageTypeSW.ApiUserIdError:
        Log.debug(
          'Error getting user ID from subscription identifier:',
          data.error,
        );
        break;
      case MessageTypeSW.ApiSessionError:
        Log.debug('Error updating user session:', data.error);
        break;
      case MessageTypeSW.ApiDurationError:
        Log.debug('Error sending session duration:', data.error);
        break;

      // SW - Worker Messenger
      case MessageTypePage.WorkerMessengerSWListening:
        Log.debug(
          '[Worker Messenger] Service worker is now listening for messages.',
        );
        break;
      case MessageTypePage.WorkerMessengerSWReceived:
        Log.debug(`[Worker Messenger] Service worker received message:`, data);
        break;
      case MessageTypePage.WorkerMessengerSWBroadcast:
        Log.debug(
          `[Worker Messenger] [SW -> Page] Broadcasting '${data.command}' to window client ${data.url}.`,
        );
        break;
      case MessageTypePage.WorkerMessengerSWUnicast:
        Log.debug(
          `[Worker Messenger] [SW -> Page] Unicasting '${data.command}' to window client ${data.url}.`,
        );
        break;

      // SW - Utils
      case MessageTypePage.CancelableTimeoutCancel:
        Log.debug('Cancel called');
        break;

      // SW - Webhook
      case MessageTypePage.OSWebhookExecute:
        Log.debug(
          `Executing ${data.event} webhook ${data.corsEnabled ? 'with' : 'without'} CORS POST ${data.url}`,
          data.payload,
        );
        break;
    }
  } else {
    // page messages
    switch (type) {
      case MessageTypePage.CustomEvents:
        Log.debug(
          `CustomEventsOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case MessageTypePage.IdentityOp:
        Log.debug(
          `IdentityOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case MessageTypePage.LoginUser:
        Log.debug(
          `LoginUserOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case MessageTypePage.LoginUserFailConflict:
        Log.debug(`Handling 409 for externalId: ${data.externalId}`);
        break;
      case MessageTypePage.LoginUserFailNoRetry:
        Log.debug(
          `Recovering from SetAlias failure for externalId: ${data.externalId}`,
        );
        break;
      case MessageTypePage.RefreshUserExecute:
        Log.debug(
          `RefreshUserOperationExecutor(operation: ${JSON.stringify(data)})`,
        );
        break;

      // Page - Session Manager
      case MessageTypePage.SessionManagerUpsert:
        Log.debug('Notify SW to upsert session');
        break;
      case MessageTypePage.SessionManagerDeactivate:
        Log.debug('Notify SW to deactivate session');
        break;
      case MessageTypePage.SessionManagerVisibilityChange:
        Log.debug('handleVisibilityChange', data);
        break;
      case MessageTypePage.SessionManagerVisibilityError:
        Log.error('Error handling visibility change:', data);
        break;
      case MessageTypePage.SessionManagerUnhandledVisibility:
        Log.warn('Unhandled visibility state happened', data);
        break;
      case MessageTypePage.SessionManagerBeforeUnload:
        Log.debug('Notify SW to deactivate session (beforeunload)');
        break;
      case MessageTypePage.SessionManagerFocus:
        Log.debug('handleOnFocus', data);
        break;
      case MessageTypePage.SessionManagerBlur:
        Log.debug('handleOnBlur', data);
        break;
      case MessageTypePage.SessionManagerError:
        Log.error(data.message, data.error);
        break;
      case MessageTypePage.SessionManagerSetup:
        Log.debug('setupOnFocusAndOnBlurForSession');
        break;
      case MessageTypePage.SessionManagerUpdate:
        Log.debug(data.message, data.details);
        break;

      // Page -Service Worker Manager
      case MessageTypePage.ServiceWorkerManagerWorkerState:
        Log.debug('[shouldInstallWorker] workerState', data);
        break;
      case MessageTypePage.ServiceWorkerManagerInstall:
        Log.info(data.message);
        break;
      case MessageTypePage.ServiceWorkerManagerInstallPermissions:
        Log.info(
          '[shouldInstallWorker] Notification Permissions enabled, will install ServiceWorker',
        );
        break;
      case MessageTypePage.ServiceWorkerManagerInstallNoRegistration:
        Log.info(
          `[changedServiceWorkerParams] workerRegistration not found at scope: ${data.scope}`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerInstallThirdParty:
        Log.info(
          '[Service Worker Installation] 3rd party service worker detected.',
        );
        break;
      case MessageTypePage.ServiceWorkerManagerInstallStarting:
        Log.info(
          `[Service Worker Installation] Installing service worker ${data.workerHref} ${data.scope}.`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerScopeChange:
        Log.info(
          '[changedServiceWorkerParams] ServiceWorker scope changing',
          data,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerHrefChange:
        Log.info(
          '[changedServiceWorkerParams] ServiceWorker href changing:',
          data,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerVersionCheck:
        Log.info('[Service Worker Update] Checking service worker version...');
        break;
      case MessageTypePage.ServiceWorkerManagerVersionUpdate:
        Log.info(data.message, data.details);
        break;
      case MessageTypePage.ServiceWorkerManagerVersionUpdateTimeout:
        Log.info(
          '[Service Worker Update] Worker did not reply to version query; assuming older version and updating.',
        );
        break;
      case MessageTypePage.ServiceWorkerManagerVersionUpdateNeeded:
        Log.info(
          `[Service Worker Update] Updating service worker from ${data.oldVersion} --> ${data.newVersion}.`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerVersionUpdateCurrent:
        Log.info(
          `[Service Worker Update] Service worker version is current at ${data.version} (no update required).`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerEstablishChannel:
        Log.debug('establishServiceWorkerChannel');
        break;
      case MessageTypePage.ServiceWorkerManagerNotificationDisplay:
        Log.debug(
          data.origin,
          'Received notification display event from service worker.',
          data.notification,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerNotificationStore:
        Log.debug(
          'notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.',
        );
        break;
      case MessageTypePage.ServiceWorkerManagerInstallWorker:
        Log.info('Installing worker...');
        break;
      case MessageTypePage.ServiceWorkerManagerInstallError:
        Log.error(
          `[Service Worker Installation] Installing service worker failed ${data}`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerInstallComplete:
        Log.debug(
          '[Service Worker Installation] Service worker installed. Waiting for activation',
        );
        break;
      case MessageTypePage.ServiceWorkerManagerWorkerActive:
        Log.debug(`[Service Worker Installation] Service worker active`);
        break;
      case MessageTypePage.ServiceWorkerManagerInstallBeta:
        Log.info(
          `[Service Worker Installation] Attempting to install v16 Beta Worker ${data.workerHref} ${data.scope}.`,
        );
        break;
      case MessageTypePage.ServiceWorkerManagerDeprecationError:
        Log.error(data.error);
        break;
      case MessageTypePage.ServiceWorkerManagerAkamaiSW:
        Log.debug(
          "Found a ServiceWorker under Akamai's akam-sw.js?othersw=",
          data,
        );
        break;
      case MessageTypePage.ServiceWorkerRegistrationError:
        Log.warn(
          '[Service Worker Status] Error Checking service worker registration',
          data.scope,
          data.error,
        );
        break;
      case MessageTypePage.ServiceWorkerInstanceNotFound:
        Log.warn('Could not find an available ServiceWorker instance!');
        break;

      // Page - Update Manager
      case MessageTypePage.UpdateManagerNotRegistered:
        Log.debug(
          'Not sending the update because user is not registered with OneSignal (no onesignal_id)',
        );
        break;
      case MessageTypePage.UpdateManagerNoDevice:
        Log.debug(
          'Not sending the on session because user is not registered with OneSignal (no device id)',
        );
        break;
      case MessageTypePage.UpdateManagerError:
        Log.error(
          `Failed to update user session. Error "${data.message}" ${data.stack}`,
        );
        break;
      case MessageTypePage.UpdateManagerOutcomeAborted:
        Log.warn(
          'Send outcome aborted because pushSubscriptionModel is not available.',
        );
        break;

      // Page - Custom Link Manager
      case MessageTypePage.CustomLinkManagerInit:
        Log.info('OneSignal: initializing customlink');
        break;
      case MessageTypePage.CustomLinkManagerMissingText:
        Log.error(
          "CustomLink: required property 'text' is missing in the config",
        );
        break;
      case MessageTypePage.CustomLinkManagerSubscribeClicked:
        Log.info('CustomLink: subscribe clicked');
        break;
      case MessageTypePage.CustomLinkManagerStylesFailure:
        Log.debug(
          'Not initializing custom link button because styles failed to load.',
        );
        break;

      // Page - Init
      case MessageTypePage.InitInternalInit:
        Log.debug('Called internalInit()');
        break;
      case MessageTypePage.InitSessionInit:
        Log.debug('Called sessionInit()');
        break;
      case MessageTypePage.InitSessionAlreadyRunning:
        Log.debug(
          'Returning from sessionInit because it has already been called.',
        );
        break;
      case MessageTypePage.InitError:
        Log.error(data);
        break;
      case MessageTypePage.InitSubscriptionExpiration:
        Log.debug('Checking subscription expiration...');
        break;
      case MessageTypePage.InitSubscriptionNotExpired:
        Log.debug('Subscription is not considered expired.');
        break;
      case MessageTypePage.InitSubscriptionExpiring:
        Log.debug('Subscription is considered expiring.');
        break;
      case MessageTypePage.InitNotifyButtonPredicate:
        if (data.show) {
          Log.debug(
            'Showing notify button because display predicate returned true.',
          );
        } else {
          Log.debug(
            'Notify button display predicate returned false so not showing the notify button.',
          );
        }
        break;
      case MessageTypePage.InitPermissionHookError:
        Log.warn(
          `Could not install native notification permission change hook w/ error: ${data}`,
        );
        break;
      case MessageTypePage.InitPageTitle:
        Log.info(`OneSignal: Set pageTitle to be '${data.title}'.`);
        break;
      case MessageTypePage.InitAutoResubscribe:
        Log.info('handleAutoResubscribe', data);
        break;
      case MessageTypePage.InitSdkDoubleLoad:
        Log.debug(
          `OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
            `Occurred ${data.loadCount} times.`,
        );
        break;
      case MessageTypePage.InitFinalConfig:
        Log.debug('OneSignal: Final web app config:', data.appConfig);
        break;
      case MessageTypePage.InitBrowserEnvironment:
        Log.debug(
          `Browser Environment: ${data.browserName} ${data.browserVersion}`,
        );
        break;
      case MessageTypePage.InitWaitingForDom:
        Log.debug(
          'OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
            ' initialization...',
        );
        break;
      case MessageTypePage.InitCurrentPageUrl:
        Log.debug(`Current Page URL: ${data.url}`);
        break;

      // Page - Listeners
      case MessageTypePage.ListenersPushStateChanged:
        Log.info('Push Subscription state changed: ', data);
        break;
      case MessageTypePage.ListenersUserStateChanged:
        Log.info('User state changed: ', data);
        break;
      case MessageTypePage.ListenersNotifyButton:
        if (data.show) {
          Log.debug(
            'Showing notify button because display predicate returned true.',
          );
        } else {
          Log.debug(
            'Hiding notify button because display predicate returned false.',
          );
        }
        break;
      case MessageTypePage.ListenersWelcomeNotification:
        if (data.skip) {
          Log.debug(
            'Not showing welcome notification because user has previously subscribed.',
          );
        } else {
          Log.debug('Sending welcome notification.');
        }
        break;

      // Page - Service Worker Helper
      case MessageTypePage.ServiceWorkerHelperSessionActive:
        Log.debug('Session already active', data);
        break;
      case MessageTypePage.ServiceWorkerHelperSessionInvalid:
        Log.debug('Session is in invalid state', data);
        break;
      case MessageTypePage.ServiceWorkerHelperNoActiveSession:
        Log.debug('No active session found. Cannot deactivate.');
        break;
      case MessageTypePage.ServiceWorkerHelperInvalidStateDeactivate:
        Log.warn(`Session in invalid state ${data.status}. Cannot deactivate.`);
        break;
      case MessageTypePage.ServiceWorkerHelperFinalizeSession:
        Log.debug(
          'Finalize session',
          `started: ${new Date(data.startTimestamp)}`,
          `duration: ${data.accumulatedDuration}`,
        );
        break;
      case MessageTypePage.ServiceWorkerHelperSendFocus:
        Log.debug(
          `send on_focus reporting session duration -> ${data.duration}s`,
        );
        break;
      case MessageTypePage.ServiceWorkerHelperSendFocusAttribution:
        Log.debug('send on_focus with attribution', data);
        break;
      case MessageTypePage.ServiceWorkerHelperFinalizeComplete:
        Log.debug(
          'Finalize session finished',
          `started: ${new Date(data.startTimestamp)}`,
          `duration: ${data.accumulatedDuration}`,
        );
        break;
      case MessageTypePage.ServiceWorkerHelperDatabaseError:
        Log.error('Database.getLastNotificationClickedForOutcomes', data);
        break;

      case MessageTypePage.OneSignalEventTrigger:
        if (data.displayData !== undefined) {
          Log.debug(
            `(${data.windowEnvString}) » ${data.eventName}:`,
            data.displayData,
          );
        } else {
          Log.debug(`(${data.windowEnvString}) » ${data.eventName}`);
        }
        break;
      case MessageTypePage.PageViewIncremented:
        Log.debug(
          `Incremented page view count: newCountSingleTab: ${data.newCountSingleTab}, newCountCumulative: ${data.newCountCumulative}`,
        );
        break;
      case MessageTypePage.DomElementNotFound:
        Log.debug(`No instance of ${data.selector} found. Returning stub.`);
        break;

      case MessageTypePage.SubscriptionHelperError:
        Log.error(data);
        break;

      // Page - Outcomes
      case MessageTypePage.OutcomesNotSupported:
        Log.debug('Outcomes feature not supported by main application yet.');
        break;
      case MessageTypePage.OutcomesNameRequired:
        Log.error('Outcome name is required');
        break;
      case MessageTypePage.OutcomesSubscribedOnly:
        Log.warn('Reporting outcomes is supported only for subscribed users.');
        break;
      case MessageTypePage.OutcomesRetryWarning:
        Log.warn(
          data.outcomeName
            ? `'${data.outcomeName}' was already reported for all notifications.`
            : '(Unattributed) unique outcome was already sent during this session',
        );
        break;
      case MessageTypePage.OutcomesOutcomeEventFailed:
        Log.warn(
          'You are on a free plan. Please upgrade to use this functionality.',
        );
        break;
      case MessageTypePage.OutcomesInfluenceChannel:
        Log.debug(
          `\tFound total of ${data.count} received notifications`,
          data.details,
        );
        break;
      case MessageTypePage.OutcomesDirectChannel:
        Log.debug(
          `\tTotal of ${data.count} received notifications are within reporting window.`,
          data.details,
        );
        break;
      case MessageTypePage.OutcomesIndirectChannel:
        Log.debug(
          `\t${data.count} received notifications will be deleted.`,
          data.details,
        );
        break;
      case MessageTypePage.OutcomesConfigMissing:
        Log.error(
          `Could not send ${data.outcomeName}. No outcomes config found.`,
        );
        break;
      case MessageTypePage.OutcomesWeightInvalid:
        Log.error('Outcome weight can only be a number if present.');
        break;

      // Page - Operation Repo
      case MessageTypePage.OperationRepoEnqueue:
        Log.debug(`OperationRepo.enqueue(operation: ${data.operation})`);
        break;
      case MessageTypePage.OperationRepoEnqueueAndWait:
        Log.debug(`OperationRepo.enqueueAndWaitoperation: ${data.operation})`);
        break;
      case MessageTypePage.OperationRepoInternalEnqueueExists:
        Log.debug(
          `OperationRepo: internalEnqueue - operation.modelId: ${data.modelId} already exists in the queue.`,
        );
        break;
      case MessageTypePage.OperationRepoPaused:
        Log.debug('OpRepo is paused');
        break;
      case MessageTypePage.OperationRepoInProgress:
        Log.debug('Operations in progress');
        break;
      case MessageTypePage.OperationRepoProcessQueue:
        Log.debug(`processQueueForever:ops:\n${data.operations}`);
        break;
      case MessageTypePage.OperationRepoExecuteResponse:
        Log.debug(`OperationRepo: execute response = ${data.result}`);
        break;
      case MessageTypePage.OperationRepoFailNoRetry:
        Log.error(
          `Operation execution failed without retry: ${data.operations}`,
        );
        break;
      case MessageTypePage.OperationRepoFailRetry:
        Log.error(`Operation execution failed, retrying: ${data.operations}`);
        break;
      case MessageTypePage.OperationRepoFailPause:
        Log.error(
          `Operation execution failed with eventual retry, pausing the operation repo: ${data.operations}`,
        );
        break;
      case MessageTypePage.OperationRepoExecuteError:
        Log.error(
          `Error attempting to execute operation: ${data.operations}`,
          data.error,
        );
        break;
      case MessageTypePage.OperationRepoRetrySeconds:
        Log.debug(`retryAfterSeconds: ${data.seconds}`);
        break;
      case MessageTypePage.OperationRepoDelay:
        Log.error(`Operations being delay for: ${data.delayMs} ms`);
        break;

      // Page - Main Helper
      case MessageTypePage.MainHelperServiceWorkerError:
        Log.error('Service worker registration not available.');
        break;
      case MessageTypePage.MainHelperApiCallFailed:
        Log.error(`API call ${data.url}`, 'failed with:', data.errors);
        break;

      // Page - Operation Model Store
      case MessageTypePage.OperationModelStoreNullObject:
        Log.error('null jsonObject sent to OperationModelStore.create');
        break;
      case MessageTypePage.OperationModelStoreMissingName:
        Log.error("jsonObject must have 'name' attribute");
        break;
      case MessageTypePage.OperationModelStoreInvalidOperation:
        Log.error(
          `${data.operationName} jsonObject must have 'onesignalId' attribute`,
        );
        break;

      // Page - Executors
      case MessageTypePage.UpdateUserOperationExecutor:
        Log.debug(`UpdateUserOperationExecutor(operation: ${data.operations})`);
        break;
      case MessageTypePage.SubscriptionOperationExecutor:
        Log.debug(
          `SubscriptionOperationExecutor(operations: ${data.operations})`,
        );
        break;

      // Page - Bell
      case MessageTypePage.BellMessageDisplay:
        Log.debug(
          `Calling display(${data.type}, ${data.content}, ${data.duration}).`,
        );
        break;
      case MessageTypePage.BellLauncherShow:
        Log.debug(data.message);
        break;
      case MessageTypePage.BellNotifyButtonStylesError:
        Log.debug('Not showing notify button because styles failed to load.');
        break;
      case MessageTypePage.BellNotifyButtonShow:
        Log.info('Showing the notify button.');
        break;
      case MessageTypePage.BellActiveElementTransition:
        Log.debug(`Ending activate() transition (alternative).`);
        break;
      case MessageTypePage.BellActiveElementActivationTimeout:
        Log.debug(
          `Element did not completely activate (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case MessageTypePage.BellActiveElementInactivationTimeout:
        Log.debug(
          `Element did not completely inactivate (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case MessageTypePage.BellAnimatedElementShowTimeout:
        Log.debug(`Element did not completely show (state: ${data.state}).`);
        break;
      case MessageTypePage.BellAnimatedElementHideTimeout:
        Log.debug(`Element did not completely hide (state: ${data.state}).`);
        break;
      case MessageTypePage.BellLauncherResizeTimeout:
        Log.debug(
          `Launcher did not completely resize (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case MessageTypePage.BellDomElementNotFound:
        Log.error('Could not find bell dom element');
        break;
      case MessageTypePage.BellActiveAnimatedElementNotFound:
        Log.error('Could not find active animated element');
        break;
      case MessageTypePage.BellAnimatedElementNotFound:
        Log.error(
          `Could not find animated element with selector ${data.selector}`,
        );
        break;

      // Page - Tag Manager
      case MessageTypePage.TagManagerLocalTags:
        Log.info('Category Slidedown Local Tags:', data.tags);
        break;
      case MessageTypePage.TagManagerError:
        Log.warn(
          'OneSignal: no change detected in Category preferences. Skipping tag update.',
        );
        break;

      // Page - Slidedown Manager
      case MessageTypePage.SlidedownManagerSubscribed:
        Log.info(new Error('User is already subscribed'));
        break;
      case MessageTypePage.SlidedownManagerDismissError:
        Log.info(
          new Error(
            `${data.slidedownType || 'unknown'} was previously dismissed`,
          ),
        );
        break;
      case MessageTypePage.SlidedownManagerTaggingContainerError:
        Log.error(
          'OneSignal: Attempted to create tagging container with error',
          data.error,
        );
        break;
      case MessageTypePage.SlidedownManagerChannelCaptureError:
        Log.error(
          'OneSignal: Attempted to create channel capture container with error',
          data.error,
        );
        break;
      case MessageTypePage.SlidedownManagerUpdateError:
        Log.warn('OneSignal Slidedown failed to update:', data.error);
        break;
      case MessageTypePage.SlidedownManagerDismiss:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case MessageTypePage.SlidedownManagerShowError:
        Log.warn('checkIfSlidedownShouldBeShown returned an error', data.error);
        break;
      case MessageTypePage.SlidedownManagerShowDebug:
        Log.error(
          'There was an error showing the OneSignal Slidedown:',
          data.error,
        );
        break;
      case MessageTypePage.SlidedownManagerShow:
        Log.debug('Showing OneSignal Slidedown');
        break;
      case MessageTypePage.SlidedownInternationalTelephoneInputError:
        Log.error(
          'OneSignal: there was a problem initializing International Telephone Input',
        );
        break;
      case MessageTypePage.SlidedownValidationElementNotFound:
        Log.error("OneSignal: couldn't find slidedown validation element");
        break;

      // Page - Prompts Manager
      case MessageTypePage.PromptsManagerInvalidDelay:
        Log.error('internalShowDelayedPrompt: timeDelay not a number');
        break;
      case MessageTypePage.PromptsManagerInvalidType:
        Log.error('Invalid Delayed Prompt type');
        break;
      case MessageTypePage.PromptsManagerAutopromptShowing:
        Log.debug('Already showing autoprompt. Abort showing a native prompt.');
        break;
      case MessageTypePage.PromptsManagerStylesFailure:
        Log.debug(
          'Not showing slidedown permission message because styles failed to load.',
        );
        break;
      case MessageTypePage.PromptsManagerDismissPush:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case MessageTypePage.PromptsManagerDismissNonPush:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case MessageTypePage.PromptsManagerDefaultTextSettings:
        Log.warn(
          `The OneSignal 'push' slidedown will be shown with default text settings. To customize, see the OneSignal documentation.`,
        );
        break;
      case MessageTypePage.PromptsManagerSlidedownConfigError:
        Log.error(
          `OneSignal: slidedown of type '${data.slidedownType}' couldn't be shown. Check your configuration on the OneSignal dashboard or your custom code initialization.`,
        );
        break;

      // Page - Login Manager
      case MessageTypePage.LoginManagerAlreadySet:
        Log.debug('Login: External ID already set, skipping login');
        break;
      case MessageTypePage.LoginManagerNotLoggedIn:
        Log.debug('Logout: User is not logged in, skipping logout');
        break;
      case MessageTypePage.UserTagSync:
        Log.warn('Not logged in, tags will not be synced');
        break;
      case MessageTypePage.UserNotLoggedIn:
        Log.warn('User must be logged in first');
        break;
      case MessageTypePage.UserCustomEventPropertiesNotSerializable:
        Log.error('Properties must be JSON-serializable');
        break;
      case MessageTypePage.UserDirectorNoSubscriptionOrId:
        Log.info(
          'No subscriptions or external ID found, skipping user creation',
        );
        break;

      // Page - OneSignal SDK
      case MessageTypePage.OneSignalSdkLoaded:
        Log.info(
          `OneSignal Web SDK loaded (version ${data.version}, ${data.environment} environment).`,
        );
        break;

      // Page - Utils
      case MessageTypePage.UtilsLogMethodCall:
        Log.debug(`Called ${data.methodName}(${data.args})`);
        break;
      case MessageTypePage.UtilsOnceNoEvent:
        Log.error('Cannot call on() with no event: ', data.event);
        break;
      case MessageTypePage.UtilsOnceNoTask:
        Log.error('Cannot call on() with no task: ', data.task);
        break;
      case MessageTypePage.DismissHelperPromptDismissed:
        Log.debug(
          `(${data.windowEnvString} environment) OneSignal: User dismissed the ${data.type} ` +
            `notification prompt; reprompt after ${data.dismissDays} days.`,
        );
        break;

      // Page - PushSubscription Namespace
      case MessageTypePage.PushSubscriptionNamespaceInitSkipped:
        Log.warn(
          `PushSubscriptionNamespace: skipping initialization. One or more required params are falsy: initialize: ${data.initialize}, subscription: ${data.subscription}`,
        );
        break;

      // Page - Subscription Manager
      case MessageTypePage.SubscriptionNoPushYet:
        Log.info('No Push Subscription yet to update notification_types.');
        break;
      case MessageTypePage.SubscriptionSafariInstalling:
        Log.info('Installing SW on Safari');
        break;
      case MessageTypePage.SubscriptionSafariInstalled:
        Log.info('SW on Safari successfully installed');
        break;
      case MessageTypePage.SubscriptionSafariError:
        Log.error('SW on Safari failed to install.');
        break;
      case MessageTypePage.SubscriptionDebugPermissionDismissed:
        Log.debug(
          'Exiting subscription and not registering worker because the permission was dismissed.',
        );
        break;
      case MessageTypePage.SubscriptionDebugPermissionBlocked:
        Log.debug(
          'Exiting subscription and not registering worker because the permission was blocked.',
        );
        break;
      case MessageTypePage.SubscriptionDebugWorkerReady:
        Log.debug('Service worker is ready to continue subscribing.');
        break;

      // Page - API Errors
      case MessageTypePage.ApiError:
        Log.error(
          new Error(
            `OneSignal: Network timed out while calling ${data.url}. Retrying...`,
          ),
        );
        break;

      // Session Manager Specific Errors
      case MessageTypePage.SessionManagerVisibilityChangeError:
        Log.error('Error handling visibility change:', data.error);
        break;
      case MessageTypePage.SessionManagerBeforeUnloadError:
        Log.error('Error handling onbeforeunload:', data.error);
        break;
      case MessageTypePage.SessionManagerFocusError:
        Log.error('Error handling focus:', data.error);
        break;
      case MessageTypePage.SessionManagerBlurError:
        Log.error('Error handling blur:', data.error);
        break;
      case MessageTypePage.SessionManagerUpdateError:
        Log.error('Error updating user session:', data.error);
        break;
      case MessageTypePage.SessionManagerUpdateFailedError:
        Log.error(
          `Failed to update user session. Error "${data.error.message}" ${data.error.stack}`,
          data.error,
        );
        break;
    }
  }

  // shared messages
  switch (type) {
    // Shared - Error
    case MessageType.Error:
      Log.error(data satisfies Error);
      break;

    // Shared - Database
    case MessageType.DatabaseBlocked:
      Log.debug('IndexedDB: Blocked event');
      break;

    // Shared - API
    case MessageType.ApiOutcomePayload:
      Log.info('Outcome payload:', data.payload);
      break;
    case MessageType.ApiOutcomeError:
      Log.error('sendOutcome', data.error);
      break;

    // Page - Worker Messenger
    case MessageTypePage.WorkerMessengerPageReceived:
      Log.debug(`[Worker Messenger] Page received message:`, data.eventData);
      break;
    case MessageTypePage.WorkerMessengerPageListening:
      Log.debug(
        `(${data.origin}) [Worker Messenger] Page is now listening for messages.`,
      );
      break;
    case MessageTypePage.WorkerMessengerPageUnicast:
      Log.debug(
        `[Worker Messenger] [Page -> SW] Unicasting '${data.command}' to service worker.`,
      );
      break;
    case MessageTypePage.WorkerMessengerPageDirect:
      Log.debug(
        `[Worker Messenger] [Page -> SW] Direct command '${data.command}' to service worker.`,
      );
      break;
    case MessageTypePage.WorkerMessengerPageRegistrationError:
      Log.error(
        '[Worker Messenger] [Page -> SW] Could not get ServiceWorkerRegistration to postMessage!',
      );
      break;
    case MessageTypePage.WorkerMessengerPageServiceWorkerError:
      Log.error(
        '[Worker Messenger] [Page -> SW] Could not get ServiceWorker to postMessage!',
      );
      break;
    case MessageTypePage.WorkerMessengerSWListening:
      Log.debug(
        '[Worker Messenger] Service worker is now listening for messages.',
      );
      break;
    case MessageTypePage.WorkerMessengerSWReceived:
      Log.debug(`[Worker Messenger] Service worker received message:`, data);
      break;
    case MessageTypePage.WorkerMessengerSWBroadcast:
      Log.debug(
        `[Worker Messenger] [SW -> Page] Broadcasting '${data.command}' to window client ${data.url}.`,
      );
      break;
    case MessageTypePage.WorkerMessengerSWUnicast:
      Log.debug(
        `[Worker Messenger] [SW -> Page] Unicasting '${data.command}' to window client ${data.url}.`,
      );
      break;

    // Page - Subscription Manager
    case MessageTypePage.SubscriptionManagerExistingPushWithOptions:
      Log.debug(
        "[Subscription Manager] An existing push subscription exists and it's options is not null.",
      );
      break;
    case MessageTypePage.SubscriptionManagerExistingPushNoOptions:
      Log.debug(
        '[Subscription Manager] An existing push subscription exists and options is null. Unsubscribing from push first now.',
      );
      break;
    case MessageTypePage.SubscriptionManagerSubscribeOptions:
      Log.debug(
        '[Subscription Manager] Subscribing to web push with these options:',
        data,
      );
      break;
    case MessageTypePage.SubscriptionManagerUnsubscribing:
      Log.debug(
        '[Subscription Manager] Unsubscribing existing push subscription.',
      );
      break;
    case MessageTypePage.SubscriptionManagerUnsubscribeResult:
      Log.debug(
        `[Subscription Manager] Unsubscribing existing push subscription result: ${data.result}`,
      );
      break;
    case MessageTypePage.SubscriptionManagerApplicationServerKeyChange:
      Log.warn(
        `[Subscription Manager] Couldn't re-subscribe due to applicationServerKey changing, unsubscribe and attempting to subscribe with new key.`,
        data.error,
      );
      break;

    // Page - Webhook
    case MessageTypePage.OSWebhookExecute:
      Log.debug(
        `Executing ${data.event} webhook ${data.corsEnabled ? 'with' : 'without'} CORS POST ${data.url}`,
        data.payload,
      );
      break;

    // Shared - Utils
    case MessageTypePage.CancelableTimeoutCancel:
      Log.debug('Cancel called');
      break;
    case MessageTypePage.CancelableTimeoutCallbackError:
      Log.error('Failed to execute callback', data.error);
      break;

    default:
      break;
  }
};

export const noop = () => {};
