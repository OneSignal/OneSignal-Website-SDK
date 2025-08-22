import { isServiceWorker } from 'src/shared/environment/detect';
import { LogMessage } from 'src/shared/helpers/log/constants';
import Log from 'src/shared/helpers/log/LogBase';
import type { LogFunction } from 'src/shared/helpers/log/types';

const typedLogger: LogFunction = (...args) => {
  const [type, data] = args;
  // service worker messages
  // Not using IS_SERVICE_WORKER because this will be a shared bundle used by both the page and the service worker
  if (isServiceWorker(self)) {
    switch (type) {
      case LogMessage.ServiceWorkerSessionUpsert:
        Log.debug('[Service Worker] Received SessionUpsert', data);
        break;
      case LogMessage.ServiceWorkerSessionDeactivate:
        Log.debug('[Service Worker] Received SessionDeactivate', data);
        break;
      case LogMessage.ServiceWorkerSetupListeners:
        Log.debug('Setting up message listeners.');
        break;
      case LogMessage.ServiceWorkerWorkerVersion:
        Log.debug('[Service Worker] Received worker version message.');
        break;
      case LogMessage.ServiceWorkerSubscribe:
        Log.debug('[Service Worker] Received subscribe message.');
        break;
      case LogMessage.ServiceWorkerSubscribeNew:
        Log.debug('[Service Worker] Received subscribe new message.');
        break;
      case LogMessage.ServiceWorkerRawNotification:
        Log.debug('Raw Notification from OneSignal:', data);
        break;
      case LogMessage.ServiceWorkerConfirmedDelivery:
        Log.debug(
          `Called sendConfirmedDelivery(${JSON.stringify(data, null, 4)})`,
        );
        break;
      case LogMessage.ServiceWorkerNotificationDisplay:
        Log.debug('Failed to display a notification:', data);
        break;
      case LogMessage.ServiceWorkerRefreshSession:
        Log.debug('[Service Worker] refreshSession');
        break;
      case LogMessage.ServiceWorkerHasActiveSessions:
        Log.debug('[Service Worker] hasAnyActiveSessions', data);
        break;
      case LogMessage.ServiceWorkerUpdateSession:
        Log.debug('updateSessionBasedOnHasActive', data);
        break;
      case LogMessage.ServiceWorkerDebounceRefresh:
        Log.debug('[Service Worker] debounceRefreshSession', data);
        break;
      case LogMessage.ServiceWorkerImageResource:
        Log.error('ensureImageResourceHttps: ', data);
        break;
      case LogMessage.NotificationClicked:
        Log.info('NotificationClicked', data);
        break;
      case LogMessage.NotificationSaveError:
        Log.error('Failed to save clicked notification.', data);
        break;
      case LogMessage.NotificationOriginError:
        Log.error(`Failed to get the HTTP site's actual origin:`, data);
        break;
      case LogMessage.ServiceWorkerVisibilityResponse:
        Log.debug('[Service Worker] Received response for AreYouVisible', data);
        break;
      case LogMessage.ServiceWorkerPushReceived:
        Log.debug(
          `Called onPushReceived(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case LogMessage.ServiceWorkerActivated:
        Log.info(
          `OneSignal Service Worker activated (version ${data.version || 'unknown'})`,
        );
        break;
      case LogMessage.ServiceWorkerPushSubscriptionChange:
        Log.debug(
          `Called onPushSubscriptionChange(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case LogMessage.ServiceWorkerPushPayload:
        Log.debug('Received a valid encrypted push payloadata.');
        break;
      case LogMessage.ServiceWorkerFocus:
        Log.debug(
          'Client is standard HTTPS site. Attempting to focus() client.',
        );
        break;
      case LogMessage.ServiceWorkerFocusError:
        Log.error('Failed to focus:', data.client, data.error);
        break;
      case LogMessage.ServiceWorkerNavigateError:
        Log.error(
          'Failed to navigate:',
          data.client,
          data.launchUrl,
          data.error,
        );
        break;
      case LogMessage.ServiceWorkerRedirectUrl:
        Log.debug(`Redirecting HTTPS site to (${data.launchUrl}).`);
        break;
      case LogMessage.ServiceWorkerNoNavigation:
        Log.debug('Not navigating because link is special.');
        break;
      case LogMessage.ServiceWorkerOpenUrl:
        Log.debug('Opening notification URL:', data.url);
        break;
      case LogMessage.ServiceWorkerOpenUrlError:
        Log.warn(`Failed to open the URL '${data.url}':`, data.error);
        break;
      case LogMessage.ServiceWorkerLaunchUrlParseError:
        Log.error(`Failed parse launchUrl:`, data);
        break;
      case LogMessage.ServiceWorkerJSONParseError:
        Log.debug('isValidPushPayload: Parsing to JSON failed with:', data);
        break;
      case LogMessage.ServiceWorkerDisplayNotification:
        Log.debug(
          `Called displayNotification(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case LogMessage.ServiceWorkerNotificationClosed:
        Log.debug(
          `Called onNotificationClosed(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case LogMessage.ServiceWorkerNotificationClicked:
        Log.debug(
          `Called onNotificationClicked(${JSON.stringify(data, null, 4)}):`,
          data,
        );
        break;
      case LogMessage.ServiceWorkerInvalidPayload:
        Log.debug(
          'isValidPushPayload: Valid JSON but missing notification UUID:',
          data,
        );
        break;

      // SW - API Errors
      case LogMessage.ApiUserIdError:
        Log.debug(
          'Error getting user ID from subscription identifier:',
          data.error,
        );
        break;
      case LogMessage.ApiSessionError:
        Log.debug('Error updating user session:', data.error);
        break;
      case LogMessage.ApiDurationError:
        Log.debug('Error sending session duration:', data.error);
        break;

      // SW - Utils
      case LogMessage.CancelableTimeoutCancel:
        Log.debug('Cancel called');
        break;
      case LogMessage.CancelableTimeoutCallbackError:
        Log.error('Failed to execute callback', data.error);
        break;

      // SW - Webhook
      case LogMessage.OSWebhookExecute:
        Log.debug(
          `Executing ${data.event} webhook ${data.corsEnabled ? 'with' : 'without'} CORS POST ${data.url}`,
          data.payload,
        );
        break;
    }
  } else {
    // page messages
    switch (type) {
      case LogMessage.CustomEvents:
        Log.debug(
          `CustomEventsOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case LogMessage.IdentityOp:
        Log.debug(
          `IdentityOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case LogMessage.LoginUser:
        Log.debug(
          `LoginUserOperationExecutor(operations: ${JSON.stringify(data)})`,
        );
        break;
      case LogMessage.LoginUserFailConflict:
        Log.debug(`Handling 409 for externalId: ${data.externalId}`);
        break;
      case LogMessage.LoginUserFailNoRetry:
        Log.debug(
          `Recovering from SetAlias failure for externalId: ${data.externalId}`,
        );
        break;
      case LogMessage.RefreshUserExecute:
        Log.debug(
          `RefreshUserOperationExecutor(operation: ${JSON.stringify(data)})`,
        );
        break;

      // Page - Session Manager
      case LogMessage.SessionManagerUpsert:
        Log.debug('Notify SW to upsert session');
        break;
      case LogMessage.SessionManagerDeactivate:
        Log.debug('Notify SW to deactivate session');
        break;
      case LogMessage.SessionManagerVisibilityChange:
        Log.debug('handleVisibilityChange', data);
        break;
      case LogMessage.SessionManagerVisibilityError:
        Log.error('Error handling visibility change:', data);
        break;
      case LogMessage.SessionManagerUnhandledVisibility:
        Log.warn('Unhandled visibility state happened', data);
        break;
      case LogMessage.SessionManagerBeforeUnload:
        Log.debug('Notify SW to deactivate session (beforeunload)');
        break;
      case LogMessage.SessionManagerFocus:
        Log.debug('handleOnFocus', data);
        break;
      case LogMessage.SessionManagerBlur:
        Log.debug('handleOnBlur', data);
        break;
      case LogMessage.SessionManagerSetup:
        Log.debug('setupOnFocusAndOnBlurForSession');
        break;
      case LogMessage.SessionManagerSupportsSW:
        Log.debug(
          'Not setting session event listeners. No service worker possible.',
        );
        break;
      case LogMessage.SessionManagerNoOnesignalId:
        Log.debug(
          'Not sending the on session because user is not registered with OneSignal (no onesignal id)',
        );
        break;

      // Page -Service Worker Manager
      case LogMessage.ServiceWorkerManagerWorkerState:
        Log.debug('[shouldInstallWorker] workerState', data);
        break;
      case LogMessage.ServiceWorkerManagerInstallPermissions:
        Log.info(
          '[shouldInstallWorker] Notification Permissions enabled, will install ServiceWorker',
        );
        break;
      case LogMessage.ServiceWorkerManagerInstallNoRegistration:
        Log.info(
          `[changedServiceWorkerParams] workerRegistration not found at scope: ${data.scope}`,
        );
        break;
      case LogMessage.ServiceWorkerManagerInstallThirdParty:
        Log.info(
          '[Service Worker Installation] 3rd party service worker detectedata.',
        );
        break;
      case LogMessage.ServiceWorkerManagerInstallStarting:
        Log.info(
          `[Service Worker Installation] Installing service worker ${data.workerHref} ${data.scope}.`,
        );
        break;
      case LogMessage.ServiceWorkerManagerScopeChange:
        Log.info(
          '[changedServiceWorkerParams] ServiceWorker scope changing',
          data,
        );
        break;
      case LogMessage.ServiceWorkerManagerHrefChange:
        Log.info(
          '[changedServiceWorkerParams] ServiceWorker href changing:',
          data,
        );
        break;
      case LogMessage.ServiceWorkerManagerVersionCheck:
        Log.info('[Service Worker Update] Checking service worker version...');
        break;
      case LogMessage.ServiceWorkerManagerVersionUpdateTimeout:
        Log.info(
          '[Service Worker Update] Worker did not reply to version query; assuming older version and updating.',
        );
        break;
      case LogMessage.ServiceWorkerManagerVersionUpdateNeeded:
        Log.info(
          `[Service Worker Update] Updating service worker from ${data.oldVersion} --> ${data.newVersion}.`,
        );
        break;
      case LogMessage.ServiceWorkerManagerVersionUpdateCurrent:
        Log.info(
          `[Service Worker Update] Service worker version is current at ${data.version} (no update required).`,
        );
        break;
      case LogMessage.ServiceWorkerManagerEstablishChannel:
        Log.debug('establishServiceWorkerChannel');
        break;
      case LogMessage.ServiceWorkerManagerNotificationDisplay:
        Log.debug(
          data.origin,
          'Received notification display event from service worker.',
          data.notification,
        );
        break;
      case LogMessage.ServiceWorkerManagerNotificationStore:
        Log.debug(
          'notification.clicked event received, but no event listeners; storing event in IndexedDb for later retrieval.',
        );
        break;
      case LogMessage.ServiceWorkerManagerInstallWorker:
        Log.info('Installing worker...');
        break;
      case LogMessage.ServiceWorkerManagerInstallError:
        Log.error(
          `[Service Worker Installation] Installing service worker failed ${data}`,
        );
        break;
      case LogMessage.ServiceWorkerManagerInstallComplete:
        Log.debug(
          '[Service Worker Installation] Service worker installedata. Waiting for activation',
        );
        break;
      case LogMessage.ServiceWorkerManagerWorkerActive:
        Log.debug(`[Service Worker Installation] Service worker active`);
        break;
      case LogMessage.ServiceWorkerManagerInstallBeta:
        Log.info(
          `[Service Worker Installation] Attempting to install v16 Beta Worker ${data.workerHref} ${data.scope}.`,
        );
        break;
      case LogMessage.ServiceWorkerManagerAkamaiSW:
        Log.debug(
          "Found a ServiceWorker under Akamai's akam-sw.js?othersw=",
          data,
        );
        break;
      case LogMessage.ServiceWorkerRegistrationError:
        Log.warn(
          '[Service Worker Status] Error Checking service worker registration',
          data.scope,
          data.error,
        );
        break;
      case LogMessage.ServiceWorkerInstanceNotFound:
        Log.warn('Could not find an available ServiceWorker instance!');
        break;

      // Page - Update Manager
      case LogMessage.UpdateManagerNotRegistered:
        Log.debug(
          'Not sending the update because user is not registered with OneSignal (no onesignal_id)',
        );
        break;
      case LogMessage.UpdateManagerNoDevice:
        Log.debug(
          'Not sending the on session because user is not registered with OneSignal (no device id)',
        );
        break;
      case LogMessage.UpdateManagerError:
        Log.error(
          `Failed to update user session. Error "${data.message}" ${data.stack}`,
        );
        break;
      case LogMessage.UpdateManagerOutcomeAborted:
        Log.warn(
          'Send outcome aborted because pushSubscriptionModel is not available.',
        );
        break;

      // Page - Custom Link Manager
      case LogMessage.CustomLinkManagerInit:
        Log.info('OneSignal: initializing customlink');
        break;
      case LogMessage.CustomLinkManagerMissingText:
        Log.error(
          "CustomLink: required property 'text' is missing in the config",
        );
        break;
      case LogMessage.CustomLinkManagerSubscribeClicked:
        Log.info('CustomLink: subscribe clicked');
        break;
      case LogMessage.CustomLinkManagerStylesFailure:
        Log.debug(
          'Not initializing custom link button because styles failed to loadata.',
        );
        break;

      // Page - Init
      case LogMessage.InitInternalInit:
        Log.debug('Called internalInit()');
        break;
      case LogMessage.InitSessionInit:
        Log.debug('Called sessionInit()');
        break;
      case LogMessage.InitSessionAlreadyRunning:
        Log.debug(
          'Returning from sessionInit because it has already been calledata.',
        );
        break;
      case LogMessage.InitSubscriptionExpiration:
        Log.debug('Checking subscription expiration...');
        break;
      case LogMessage.InitSubscriptionNotExpired:
        Log.debug('Subscription is not considered expiredata.');
        break;
      case LogMessage.InitSubscriptionExpiring:
        Log.debug('Subscription is considered expiring.');
        break;
      case LogMessage.InitNotifyButtonPredicate:
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
      case LogMessage.InitPermissionHookError:
        Log.warn(
          `Could not install native notification permission change hook w/ error: ${data}`,
        );
        break;
      case LogMessage.InitPageTitle:
        Log.info(`OneSignal: Set pageTitle to be '${data.title}'.`);
        break;
      case LogMessage.InitAutoResubscribe:
        Log.info('handleAutoResubscribe', data);
        break;
      case LogMessage.InitSdkDoubleLoad:
        Log.debug(
          `OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
            `Occurred ${data.loadCount} times.`,
        );
        break;
      case LogMessage.InitFinalConfig:
        Log.debug('OneSignal: Final web app config:', data.appConfig);
        break;
      case LogMessage.InitBrowserEnvironment:
        Log.debug(
          `Browser Environment: ${data.browserName} ${data.browserVersion}`,
        );
        break;
      case LogMessage.InitWaitingForDom:
        Log.debug(
          'OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
            ' initialization...',
        );
        break;
      case LogMessage.InitCurrentPageUrl:
        Log.debug(`Current Page URL: ${data.url}`);
        break;

      // Page - Listeners
      case LogMessage.ListenersPushStateChanged:
        Log.info('Push Subscription state changed: ', data);
        break;
      case LogMessage.ListenersUserStateChanged:
        Log.info('User state changed: ', data);
        break;
      case LogMessage.ListenersNotifyButton:
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
      case LogMessage.ListenersWelcomeNotification:
        if (data.skip) {
          Log.debug(
            'Not showing welcome notification because user has previously subscribedata.',
          );
        } else {
          Log.debug('Sending welcome notification.');
        }
        break;

      // Page - Service Worker Helper
      case LogMessage.ServiceWorkerHelperSessionActive:
        Log.debug('Session already active', data);
        break;
      case LogMessage.ServiceWorkerHelperSessionInvalid:
        Log.debug('Session is in invalid state', data);
        break;
      case LogMessage.ServiceWorkerHelperNoActiveSession:
        Log.debug('No active session foundata. Cannot deactivate.');
        break;
      case LogMessage.ServiceWorkerHelperInvalidStateDeactivate:
        Log.warn(`Session in invalid state ${data.status}. Cannot deactivate.`);
        break;
      case LogMessage.ServiceWorkerHelperFinalizeSession:
        Log.debug(
          'Finalize session',
          `started: ${new Date(data.startTimestamp)}`,
          `duration: ${data.accumulatedDuration}`,
        );
        break;
      case LogMessage.ServiceWorkerHelperSendFocus:
        Log.debug(
          `send on_focus reporting session duration -> ${data.duration}s`,
        );
        break;
      case LogMessage.ServiceWorkerHelperSendFocusAttribution:
        Log.debug('send on_focus with attribution', data);
        break;
      case LogMessage.ServiceWorkerHelperFinalizeComplete:
        Log.debug(
          'Finalize session finished',
          `started: ${new Date(data.startTimestamp)}`,
          `duration: ${data.accumulatedDuration}`,
        );
        break;
      case LogMessage.ServiceWorkerHelperDatabaseError:
        Log.error('Database.getLastNotificationClickedForOutcomes', data);
        break;

      case LogMessage.OneSignalEventTrigger:
        if (data.displayData !== undefined) {
          Log.debug(
            `(${data.windowEnvString}) » ${data.eventName}:`,
            data.displayData,
          );
        } else {
          Log.debug(`(${data.windowEnvString}) » ${data.eventName}`);
        }
        break;
      case LogMessage.PageViewIncremented:
        Log.debug(
          `Incremented page view count: newCountSingleTab: ${data.newCountSingleTab}, newCountCumulative: ${data.newCountCumulative}`,
        );
        break;
      case LogMessage.DomElementNotFound:
        Log.debug(`No instance of ${data.selector} foundata. Returning stub.`);
        break;

      // Page - Outcomes
      case LogMessage.OutcomesNotSupported:
        Log.debug('Outcomes feature not supported by main application yet.');
        break;
      case LogMessage.OutcomesNameRequired:
        Log.error('Outcome name is required');
        break;
      case LogMessage.OutcomesSubscribedOnly:
        Log.warn('Reporting outcomes is supported only for subscribed users.');
        break;
      case LogMessage.OutcomesSentDuringSession:
        Log.warn(
          '(Unattributed) unique outcome was already sent during this session',
        );
        break;
      case LogMessage.SessionOutcomeReported:
        Log.warn(
          `'${data.outcomeName}' was already reported for all notifications.`,
        );
        break;
      case LogMessage.OutcomesOutcomeEventFailed:
        Log.warn(
          'You are on a free plan. Please upgrade to use this functionality.',
        );
        break;
      case LogMessage.OutcomesInfluenceChannel:
        Log.debug(
          `\tFound total of ${data.count} received notifications`,
          data.details,
        );
        break;
      case LogMessage.OutcomesDirectChannel:
        Log.debug(
          `\tTotal of ${data.count} received notifications are within reporting window.`,
          data.details,
        );
        break;
      case LogMessage.OutcomesIndirectChannel:
        Log.debug(
          `\t${data.count} received notifications will be deletedata.`,
          data.details,
        );
        break;
      case LogMessage.OutcomesConfigMissing:
        Log.error(
          `Could not send ${data.outcomeName}. No outcomes config foundata.`,
        );
        break;
      case LogMessage.OutcomesWeightInvalid:
        Log.error('Outcome weight can only be a number if present.');
        break;

      // Page - Operation Repo
      case LogMessage.OperationRepoEnqueue:
        Log.debug(`OperationRepo.enqueue(operation: ${data.operation})`);
        break;
      case LogMessage.OperationRepoEnqueueAndWait:
        Log.debug(`OperationRepo.enqueueAndWaitoperation: ${data.operation})`);
        break;
      case LogMessage.OperationRepoInternalEnqueueExists:
        Log.debug(
          `OperationRepo: internalEnqueue - operation.modelId: ${data.modelId} already exists in the queue.`,
        );
        break;
      case LogMessage.OperationRepoPaused:
        Log.debug('OpRepo is paused');
        break;
      case LogMessage.OperationRepoInProgress:
        Log.debug('Operations in progress');
        break;
      case LogMessage.OperationRepoProcessQueue:
        Log.debug(`processQueueForever:ops:\n${data.operations}`);
        break;
      case LogMessage.OperationRepoExecuteResponse:
        Log.debug(`OperationRepo: execute response = ${data.result}`);
        break;
      case LogMessage.OperationRepoFailNoRetry:
        Log.error(
          `Operation execution failed without retry: ${data.operations}`,
        );
        break;
      case LogMessage.OperationRepoFailRetry:
        Log.error(`Operation execution failed, retrying: ${data.operations}`);
        break;
      case LogMessage.OperationRepoFailPause:
        Log.error(
          `Operation execution failed with eventual retry, pausing the operation repo: ${data.operations}`,
        );
        break;
      case LogMessage.OperationRepoExecuteError:
        Log.error(
          `Error attempting to execute operation: ${data.operations}`,
          data.error,
        );
        break;
      case LogMessage.OperationRepoRetrySeconds:
        Log.debug(`retryAfterSeconds: ${data.seconds}`);
        break;
      case LogMessage.OperationRepoDelay:
        Log.error(`Operations being delay for: ${data.delayMs} ms`);
        break;

      // Page - Main Helper
      case LogMessage.MainHelperServiceWorkerError:
        Log.error('Service worker registration not available.');
        break;
      case LogMessage.MainHelperApiCallFailed:
        Log.error(`API call ${data.url}`, 'failed with:', data.errors);
        break;

      // Page - Operation Model Store
      case LogMessage.OperationModelStoreNullObject:
        Log.error('null jsonObject sent to OperationModelStore.create');
        break;
      case LogMessage.OperationModelStoreMissingName:
        Log.error("jsonObject must have 'name' attribute");
        break;
      case LogMessage.OperationModelStoreInvalidOperation:
        Log.error(
          `${data.operationName} jsonObject must have 'onesignalId' attribute`,
        );
        break;

      // Page - Executors
      case LogMessage.UpdateUserOperationExecutor:
        Log.debug(`UpdateUserOperationExecutor(operation: ${data.operations})`);
        break;
      case LogMessage.SubscriptionOperationExecutor:
        Log.debug(
          `SubscriptionOperationExecutor(operations: ${data.operations})`,
        );
        break;

      // Page - Bell
      case LogMessage.BellMessageDisplay:
        Log.debug(
          `Calling display(${data.type}, ${data.content}, ${data.duration}).`,
        );
        break;
      case LogMessage.BellNotifyButtonStylesError:
        Log.debug(
          'Not showing notify button because styles failed to loadata.',
        );
        break;
      case LogMessage.BellNotifyButtonShow:
        Log.info('Showing the notify button.');
        break;
      case LogMessage.BellActiveElementTransition:
        Log.debug(`Ending activate() transition (alternative).`);
        break;
      case LogMessage.BellActiveElementActivationTimeout:
        Log.debug(
          `Element did not completely activate (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case LogMessage.BellActiveElementInactivationTimeout:
        Log.debug(
          `Element did not completely inactivate (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case LogMessage.BellAnimatedElementShowTimeout:
        Log.debug(`Element did not completely show (state: ${data.state}).`);
        break;
      case LogMessage.BellAnimatedElementHideTimeout:
        Log.debug(`Element did not completely hide (state: ${data.state}).`);
        break;
      case LogMessage.BellLauncherResizeTimeout:
        Log.debug(
          `Launcher did not completely resize (state: ${data.state}, activeState: ${data.activeState}).`,
        );
        break;
      case LogMessage.BellDomElementNotFound:
        Log.error('Could not find bell dom element');
        break;
      case LogMessage.BellActiveAnimatedElementNotFound:
        Log.error('Could not find active animated element');
        break;
      case LogMessage.BellAnimatedElementNotFound:
        Log.error(
          `${data.operation} could not find animated element with selector ${data.selector}`,
        );
        break;

      // Page - Tag Manager
      case LogMessage.TagManagerLocalTags:
        Log.info('Category Slidedown Local Tags:', data.tags);
        break;
      case LogMessage.TagManagerError:
        Log.warn(
          'OneSignal: no change detected in Category preferences. Skipping tag update.',
        );
        break;

      // Page - Slidedown Manager
      case LogMessage.SlidedownManagerSubscribed:
        Log.info(new Error('User is already subscribed'));
        break;
      case LogMessage.SlidedownManagerDismissError:
        Log.info(
          new Error(
            `${data.slidedownType || 'unknown'} was previously dismissed`,
          ),
        );
        break;
      case LogMessage.SlidedownManagerTaggingContainerError:
        Log.error(
          'OneSignal: Attempted to create tagging container with error',
          data.error,
        );
        break;
      case LogMessage.SlidedownManagerChannelCaptureError:
        Log.error(
          'OneSignal: Attempted to create channel capture container with error',
          data.error,
        );
        break;
      case LogMessage.SlidedownManagerUpdateError:
        Log.warn('OneSignal Slidedown failed to update:', data.error);
        break;
      case LogMessage.SlidedownManagerDismiss:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case LogMessage.SlidedownManagerShowError:
        Log.warn('checkIfSlidedownShouldBeShown returned an error', data.error);
        break;
      case LogMessage.SlidedownManagerShowDebug:
        Log.error(
          'There was an error showing the OneSignal Slidedown:',
          data.error,
        );
        break;
      case LogMessage.SlidedownManagerShow:
        Log.debug('Showing OneSignal Slidedown');
        break;
      case LogMessage.SlidedownInternationalTelephoneInputError:
        Log.error(
          'OneSignal: there was a problem initializing International Telephone Input',
        );
        break;
      case LogMessage.SlidedownValidationElementNotFound:
        Log.error("OneSignal: couldn't find slidedown validation element");
        break;

      // Page - Prompts Manager
      case LogMessage.PromptsManagerInvalidDelay:
        Log.error('internalShowDelayedPrompt: timeDelay not a number');
        break;
      case LogMessage.PromptsManagerInvalidType:
        Log.error('Invalid Delayed Prompt type');
        break;
      case LogMessage.PromptsManagerAutopromptShowing:
        Log.debug('Already showing autoprompt. Abort showing a native prompt.');
        break;
      case LogMessage.PromptsManagerStylesFailure:
        Log.debug(
          'Not showing slidedown permission message because styles failed to loadata.',
        );
        break;
      case LogMessage.PromptsManagerDismissPush:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case LogMessage.PromptsManagerDismissNonPush:
        Log.debug('Setting flag to not show the slidedown to the user again.');
        break;
      case LogMessage.PromptsManagerDefaultTextSettings:
        Log.warn(
          `The OneSignal 'push' slidedown will be shown with default text settings. To customize, see the OneSignal documentation.`,
        );
        break;
      case LogMessage.PromptsManagerSlidedownConfigError:
        Log.error(
          `OneSignal: slidedown of type '${data.slidedownType}' couldn't be shown. Check your configuration on the OneSignal dashboard or your custom code initialization.`,
        );
        break;

      // Page - Login Manager
      case LogMessage.LoginManagerAlreadySet:
        Log.debug('Login: External ID already set, skipping login');
        break;
      case LogMessage.LoginManagerNotLoggedIn:
        Log.debug('Logout: User is not logged in, skipping logout');
        break;
      case LogMessage.UserTagSync:
        Log.warn('Not logged in, tags will not be synced');
        break;
      case LogMessage.UserNotLoggedIn:
        Log.warn('User must be logged in first');
        break;
      case LogMessage.UserCustomEventPropertiesNotSerializable:
        Log.error('Properties must be JSON-serializable');
        break;
      case LogMessage.UserDirectorNoSubscriptionOrId:
        Log.info(
          'No subscriptions or external ID found, skipping user creation',
        );
        break;

      // Page - OneSignal SDK
      case LogMessage.OneSignalSdkLoaded:
        Log.info(
          `OneSignal Web SDK loaded (version ${data.version}, ${data.environment} environment).`,
        );
        break;

      // Page - Utils
      case LogMessage.UtilsLogMethodCall:
        Log.debug(`Called ${data.methodName}(${data.args})`);
        break;
      case LogMessage.UtilsOnceNoEvent:
        Log.error('Cannot call on() with no event: ', data.event);
        break;
      case LogMessage.UtilsOnceNoTask:
        Log.error('Cannot call on() with no task: ', data.task);
        break;
      case LogMessage.DismissHelperPromptDismissed:
        Log.debug(
          `(${data.windowEnvString} environment) OneSignal: User dismissed the ${data.type} ` +
            `notification prompt; reprompt after ${data.dismissDays} days.`,
        );
        break;

      // Page - PushSubscription Namespace
      case LogMessage.PushSubscriptionNamespaceInitSkipped:
        Log.warn(
          `PushSubscriptionNamespace: skipping initialization. One or more required params are falsy: initialize: ${data.initialize}, subscription: ${data.subscription}`,
        );
        break;

      // Page - Subscription Manager
      case LogMessage.SubscriptionNoPushYet:
        Log.info('No Push Subscription yet to update notification_types.');
        break;
      case LogMessage.SubscriptionSafariInstalling:
        Log.info('Installing SW on Safari');
        break;
      case LogMessage.SubscriptionSafariInstalled:
        Log.info('SW on Safari successfully installed');
        break;
      case LogMessage.SubscriptionSafariError:
        Log.error('SW on Safari failed to install.');
        break;
      case LogMessage.SubscriptionDebugPermissionDismissed:
        Log.debug(
          'Exiting subscription and not registering worker because the permission was dismissedata.',
        );
        break;
      case LogMessage.SubscriptionDebugPermissionBlocked:
        Log.debug(
          'Exiting subscription and not registering worker because the permission was blockedata.',
        );
        break;
      case LogMessage.SubscriptionDebugWorkerReady:
        Log.debug('Service worker is ready to continue subscribing.');
        break;

      // Page - API Errors
      case LogMessage.ApiError:
        Log.error(
          new Error(
            `OneSignal: Network timed out while calling ${data.url}. Retrying...`,
          ),
        );
        break;

      // Session Manager Specific Errors
      case LogMessage.SessionManagerVisibilityChangeError:
        Log.error('Error handling visibility change:', data.error);
        break;
      case LogMessage.SessionManagerBeforeUnloadError:
        Log.error('Error handling onbeforeunload:', data.error);
        break;
      case LogMessage.SessionManagerFocusError:
        Log.error('Error handling focus:', data.error);
        break;
      case LogMessage.SessionManagerBlurError:
        Log.error('Error handling blur:', data.error);
        break;
      case LogMessage.SessionManagerUpdateError:
        Log.error('Error updating user session:', data.error);
        break;
      case LogMessage.SessionManagerUpdateFailedError:
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
    case LogMessage.Error:
      Log.error(data);
      break;

    // Shared - Database
    case LogMessage.DatabaseBlocked:
      Log.debug('IndexedDB: Blocked event');
      break;

    // Shared - API
    case LogMessage.ApiOutcomePayload:
      Log.info('Outcome payload:', data.payload);
      break;
    case LogMessage.ApiOutcomeError:
      Log.error('sendOutcome', data.error);
      break;

    // Page - Worker Messenger
    case LogMessage.WorkerMessengerPageReceived:
      Log.debug(`[Worker Messenger] Page received message:`, data.eventData);
      break;
    case LogMessage.WorkerMessengerPageListening:
      Log.debug(
        `(${data.origin}) [Worker Messenger] Page is now listening for messages.`,
      );
      break;
    case LogMessage.WorkerMessengerPageUnicast:
      Log.debug(
        `[Worker Messenger] [Page -> SW] Unicasting '${data.command}' to service worker.`,
      );
      break;
    case LogMessage.WorkerMessengerPageDirect:
      Log.debug(
        `[Worker Messenger] [Page -> SW] Direct command '${data.command}' to service worker.`,
      );
      break;
    case LogMessage.WorkerMessengerPageRegistrationError:
      Log.error(
        '[Worker Messenger] [Page -> SW] Could not get ServiceWorkerRegistration to postMessage!',
      );
      break;
    case LogMessage.WorkerMessengerPageServiceWorkerError:
      Log.error(
        '[Worker Messenger] [Page -> SW] Could not get ServiceWorker to postMessage!',
      );
      break;
    case LogMessage.WorkerMessengerSWListening:
      Log.debug(
        '[Worker Messenger] Service worker is now listening for messages.',
      );
      break;
    case LogMessage.WorkerMessengerSWReceived:
      Log.debug(`[Worker Messenger] Service worker received message:`, data);
      break;
    case LogMessage.WorkerMessengerSWBroadcast:
      Log.debug(
        `[Worker Messenger] [SW -> Page] Broadcasting '${data.command}' to window client ${data.url}.`,
      );
      break;
    case LogMessage.WorkerMessengerSWUnicast:
      Log.debug(
        `[Worker Messenger] [SW -> Page] Unicasting '${data.command}' to window client ${data.url}.`,
      );
      break;

    // Page - Subscription Manager
    case LogMessage.SubscriptionManagerExistingPushWithOptions:
      Log.debug(
        "[Subscription Manager] An existing push subscription exists and it's options is not null.",
      );
      break;
    case LogMessage.SubscriptionManagerExistingPushNoOptions:
      Log.debug(
        '[Subscription Manager] An existing push subscription exists and options is null. Unsubscribing from push first now.',
      );
      break;
    case LogMessage.SubscriptionManagerSubscribeOptions:
      Log.debug(
        '[Subscription Manager] Subscribing to web push with these options:',
        data,
      );
      break;
    case LogMessage.SubscriptionManagerUnsubscribing:
      Log.debug(
        '[Subscription Manager] Unsubscribing existing push subscription.',
      );
      break;
    case LogMessage.SubscriptionManagerUnsubscribeResult:
      Log.debug(
        `[Subscription Manager] Unsubscribing existing push subscription result: ${data.result}`,
      );
      break;
    case LogMessage.SubscriptionManagerApplicationServerKeyChange:
      Log.warn(
        `[Subscription Manager] Couldn't re-subscribe due to applicationServerKey changing, unsubscribe and attempting to subscribe with new key.`,
        data.error,
      );
      break;

    default:
      break;
  }
};

self.OneSignalLog = typedLogger;
