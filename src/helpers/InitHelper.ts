import {DEV_FRAME_HOST} from "../vars";
import Environment from "../Environment";
import * as log from "loglevel";
import LimitStore from "../LimitStore";
import Event from "../Event";
import Database from "../services/Database";
import * as Browser from "bowser";
import {getConsoleStyle, once} from "../utils";
import Postmam from "../Postmam";
import MainHelper from "./MainHelper";
import ServiceWorkerHelper from "./ServiceWorkerHelper";
import SubscriptionHelper from "./SubscriptionHelper";
import EventHelper from "./EventHelper";
import {InvalidStateError, InvalidStateReason} from "../errors/InvalidStateError";
import AlreadySubscribedError from "../errors/AlreadySubscribedError";
import ServiceUnavailableError from "../errors/ServiceUnavailableError";
import PermissionMessageDismissedError from '../errors/PermissionMessageDismissedError';

declare var OneSignal: any;


export default class InitHelper {

  static storeInitialValues() {
    return Promise.all([
                         OneSignal.isPushNotificationsEnabled(),
                         OneSignal.getNotificationPermission(),
                         OneSignal.getUserId(),
                         OneSignal.isOptedOut()
                       ])
                  .then(([isPushEnabled, notificationPermission, userId, isOptedOut]) => {
                    LimitStore.put('subscription.optedOut', isOptedOut);
                    return Promise.all([
                                         Database.put('Options', { key: 'isPushEnabled', value: isPushEnabled }),
                                         Database.put('Options', {
                                           key: 'notificationPermission',
                                           value: notificationPermission
                                         })
                                       ]);
                  });
  }

  /**
   * This event occurs after init.
   * For HTTPS sites, this event is called after init.
   * For HTTP sites, this event is called after the iFrame is created, and a message is received from the iFrame signaling cross-origin messaging is ready.
   * @private
   */
  static async onSdkInitialized() {
    // Store initial values of notification permission, user ID, and manual subscription status
    // This is done so that the values can be later compared to see if anything changed
    // This is done here for HTTPS, it is done after the call to _addSessionIframe in sessionInit for HTTP sites, since the iframe is needed for communication
    InitHelper.storeInitialValues();
    InitHelper.installNativePromptPermissionChangedHook();

    if (navigator.serviceWorker &&
        window.location.protocol === 'https:' &&
        !(await SubscriptionHelper.hasInsecureParentOrigin())) {
          navigator.serviceWorker.getRegistration()
            .then(registration => {
              if (registration && registration.active) {
                MainHelper.establishServiceWorkerChannel(registration);
              }
            })
            .catch(e => {
              if (e.code === 9) { // Only secure origins are allowed
                if (location.protocol === 'http:' || Environment.isIframe()) {
                  // This site is an HTTP site with an <iframe>
                  // We can no longer register service workers since Chrome 42
                  log.debug(`Expected error getting service worker registration on ${location.href}:`, e);
                }
              } else {
                log.error(`Error getting Service Worker registration on ${location.href}:`, e);
              }
            });
    }

    MainHelper.showNotifyButton();

    if (Browser.safari && OneSignal.config.autoRegister === false) {
      OneSignal.isPushNotificationsEnabled(enabled => {
        if (enabled) {
          /*  The user is on Safari and *specifically* set autoRegister to false.
           The normal case for a user on Safari is to not set anything related to autoRegister.
           With autoRegister false, we don't automatically show the permission prompt on Safari.
           However, if push notifications are already enabled, we're actually going to make the same
           subscribe call and register the device token, because this will return the same device
           token and allow us to update the user's session count and last active.
           For sites that omit autoRegister, autoRegister is assumed to be true. For Safari, the session count
           and last active is updated from this registration call.
           */
          InitHelper.sessionInit({__sdkCall: true});
        }
      });
    }

    if (SubscriptionHelper.isUsingSubscriptionWorkaround() && !MainHelper.isContinuingBrowserSession()) {
      /*
       The user is on an HTTP site and they accessed this site by opening a new window or tab (starting a new
       session). This means we should increment their session_count and last_active by calling
       registerWithOneSignal(). Without this call, the user's session and last_active is not updated. We only
       do this if the user is actually registered with OneSignal though.
       */
      log.debug(`(${Environment.getEnv()}) Updating session info for HTTP site.`);
      OneSignal.isPushNotificationsEnabled(isPushEnabled => {
        if (isPushEnabled) {
          return MainHelper.getAppId()
                          .then(appId => MainHelper.registerWithOneSignal(appId, null));
        }
      });
    }

    MainHelper.checkAndDoHttpPermissionRequest();
  }

  static installNativePromptPermissionChangedHook() {
    if (navigator.permissions && !(Browser.firefox && Number(Browser.version) <= 45)) {
      OneSignal._usingNativePermissionHook = true;
      // If the browser natively supports hooking the subscription prompt permission change event
      //     use it instead of our SDK method
      navigator.permissions.query({name: 'notifications'}).then(function (permissionStatus) {
        permissionStatus.onchange = function () {
          EventHelper.triggerNotificationPermissionChanged();
        };
      });
    }
  }

  static saveInitOptions() {
    let opPromises = [];
    if (OneSignal.config.persistNotification === false) {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: false}));
    } else {
      opPromises.push(Database.put('Options', {key: 'persistNotification', value: true}));
    }

    let webhookOptions = OneSignal.config.webhooks;
    ['notification.displayed', 'notification.clicked', 'notification.dismissed'].forEach(event => {
      if (webhookOptions && webhookOptions[event]) {
        opPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: webhookOptions[event]}));
      } else {
        opPromises.push(Database.put('Options', {key: `webhooks.${event}`, value: false}));
      }
    });
    if (webhookOptions && webhookOptions.cors) {
      opPromises.push(Database.put('Options', {key: `webhooks.cors`, value: true}));
    } else {
      opPromises.push(Database.put('Options', {key: `webhooks.cors`, value: false}));
    }

    if (OneSignal.config.notificationClickHandlerMatch) {
      opPromises.push(Database.put('Options', {
        key: 'notificationClickHandlerMatch',
        value: OneSignal.config.notificationClickHandlerMatch
      }));
    } else {
      opPromises.push(Database.put('Options', {key: 'notificationClickHandlerMatch', value: 'exact'}));
    }

    if (OneSignal.config.notificationClickHandlerAction) {
      opPromises.push(Database.put('Options', {
        key: 'notificationClickHandlerAction',
        value: OneSignal.config.notificationClickHandlerAction
      }));
    } else {
      opPromises.push(Database.put('Options', {key: 'notificationClickHandlerAction', value: 'navigate'}));
    }

    if (OneSignal.config.serviceWorkerRefetchRequests === false) {
      opPromises.push(Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: false}));
    } else {
      opPromises.push(Database.put('Options', {key: 'serviceWorkerRefetchRequests', value: true}));
    }
    return Promise.all(opPromises);
  }

  static internalInit() {
    log.debug('Called %cinternalInit()', getConsoleStyle('code'));
    Database.get('Ids', 'appId')
            .then(appId => {
              // HTTPS - Only register for push notifications once per session or if the user changes notification permission to Ask or Allow.
              if (sessionStorage.getItem("ONE_SIGNAL_SESSION")
                && !OneSignal.config.subdomainName
                && (window.Notification.permission == "denied"
                || sessionStorage.getItem("ONE_SIGNAL_NOTIFICATION_PERMISSION") == window.Notification.permission)) {
                Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
                return;
              }

              sessionStorage.setItem("ONE_SIGNAL_NOTIFICATION_PERMISSION", window.Notification.permission);

              if (Browser.safari && OneSignal.config.autoRegister === false) {
                log.debug('On Safari and autoregister is false, skipping sessionInit().');
                // This *seems* to trigger on either Safari's autoregister false or Chrome HTTP
                // Chrome HTTP gets an SDK_INITIALIZED event from the iFrame postMessage, so don't call it here
                if (!SubscriptionHelper.isUsingSubscriptionWorkaround()) {
                  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
                }
                return;
              }

              if (OneSignal.config.autoRegister === false && !OneSignal.config.subdomainName) {
                log.debug('Skipping internal init. Not auto-registering and no subdomain.');
                /* 3/25: If a user is already registered, re-register them in case the clicked Blocked and then Allow (which immediately invalidates the GCM token as soon as you click Blocked) */
                OneSignal.isPushNotificationsEnabled().then(isPushEnabled => {
                  if (isPushEnabled && !SubscriptionHelper.isUsingSubscriptionWorkaround()) {
                    log.info('Because the user is already subscribed and has enabled notifications, we will re-register their GCM token.');
                    // Resubscribes them, and in case their GCM registration token was invalid, gets a new one
                    SubscriptionHelper.registerForW3CPush({});
                  } else {
                    ServiceWorkerHelper.updateServiceWorker();
                  }
                });
                Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
                return;
              }

              if (document.visibilityState !== "visible") {
                once(document, 'visibilitychange', (e, destroyEventListener) => {
                  if (document.visibilityState === 'visible') {
                    destroyEventListener();
                    InitHelper.sessionInit({__sdkCall: true});
                  }
                }, true);
                return;
              }

              InitHelper.sessionInit({__sdkCall: true});
            });
  }

  static async initSaveState() {
    const appId = await MainHelper.getAppId()
    await Database.put("Ids", { type: "appId", id: appId });
    const initialPageTitle = document.title || 'Notification';
    await Database.put("Options", { key: "pageTitle", value: initialPageTitle });
    log.info(`OneSignal: Set pageTitle to be '${initialPageTitle}'.`);
  }

  static sessionInit(options) {
    log.debug(`Called %csessionInit(${JSON.stringify(options)})`, getConsoleStyle('code'));
    if (OneSignal._sessionInitAlreadyRunning) {
      log.debug('Returning from sessionInit because it has already been called.');
      return;
    } else {
      OneSignal._sessionInitAlreadyRunning = true;
    }

    var hostPageProtocol = `${location.protocol}//`;

    if (Browser.safari) {
      if (OneSignal.config.safari_web_id) {
        MainHelper.getAppId()
                 .then(appId => {
                   window.safari.pushNotification.requestPermission(
                     `${OneSignal._API_URL}safari`,
                     OneSignal.config.safari_web_id,
                     {app_id: appId},
                     pushResponse => {
                       log.info('Safari Registration Result:', pushResponse);
                       if (pushResponse.deviceToken) {
                         let subscriptionInfo = {
                           // Safari's subscription returns a device token (e.g. 03D5D4A2EBCE1EE2AED68E12B72B1B995C2BFB811AB7DBF973C84FED66C6D1D5)
                           endpointOrToken: pushResponse.deviceToken.toLowerCase()
                         };
                         MainHelper.registerWithOneSignal(appId, subscriptionInfo);
                       }
                       else {
                         MainHelper.beginTemporaryBrowserSession();
                       }
                       EventHelper.triggerNotificationPermissionChanged();
                     }
                   );
                 });
      }
    }
    else if (options.modalPrompt && options.fromRegisterFor) { // If HTTPS - Show modal
      Promise.all([
        MainHelper.getAppId(),
        OneSignal.isPushNotificationsEnabled(),
        OneSignal.getNotificationPermission()
      ])
             .then(([appId, isPushEnabled, notificationPermission]) => {
               let modalUrl = `${OneSignal.modalUrl}?${MainHelper.getPromptOptionsQueryString()}&id=${appId}&httpsPrompt=true&pushEnabled=${isPushEnabled}&permissionBlocked=${(notificationPermission as any) === 'denied'}&promptType=modal`;
               log.info('Opening HTTPS modal prompt:', modalUrl);
               let modal = MainHelper.createHiddenSubscriptionDomModal(modalUrl);

               let sendToOrigin = `https://onesignal.com`;
               if (Environment.isDev()) {
                 sendToOrigin = DEV_FRAME_HOST;
               }
               let receiveFromOrigin = sendToOrigin;
               OneSignal.modalPostmam = new Postmam(modal, sendToOrigin, receiveFromOrigin);
               OneSignal.modalPostmam.startPostMessageReceive();

               OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_LOADED, message => {
                 MainHelper.showSubscriptionDomModal();
                 Event.trigger('modalLoaded');
               });
               OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_ACCEPTED, message => {
                 log.debug('User accepted the HTTPS modal prompt.');
                 OneSignal._sessionInitAlreadyRunning = false;
                 let iframeModalDom = document.getElementById('OneSignal-iframe-modal');
                 iframeModalDom.parentNode.removeChild(iframeModalDom);
                 OneSignal.modalPostmam.destroy();
                 MainHelper.triggerCustomPromptClicked('granted');
                 log.debug('Calling setSubscription(true)');
                 OneSignal.setSubscription(true)
                          .then(() => SubscriptionHelper.registerForW3CPush(options));
               });
               OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.MODAL_PROMPT_REJECTED, message => {
                 log.debug('User rejected the HTTPS modal prompt.');
                 OneSignal._sessionInitAlreadyRunning = false;
                 let iframeModalDom = document.getElementById('OneSignal-iframe-modal');
                 iframeModalDom.parentNode.removeChild(iframeModalDom);
                 OneSignal.modalPostmam.destroy();
                 MainHelper.triggerCustomPromptClicked('denied');
               });
               OneSignal.modalPostmam.once(OneSignal.POSTMAM_COMMANDS.POPUP_CLOSING, message => {
                 log.info('Detected modal is closing.');
                 OneSignal.modalPostmam.destroy();
               });
             });
    }
    else if ('serviceWorker' in navigator && !SubscriptionHelper.isUsingSubscriptionWorkaround()) { // If HTTPS - Show native prompt
      if (options.__sdkCall && !MainHelper.wasHttpsNativePromptDismissed()) {
        SubscriptionHelper.registerForW3CPush(options);
      } else if (options.__sdkCall && MainHelper.wasHttpsNativePromptDismissed()) {
        log.debug('OneSignal: Not automatically showing native HTTPS prompt because the user previously dismissed it.');
        OneSignal._sessionInitAlreadyRunning = false;
      } else {
        SubscriptionHelper.registerForW3CPush(options);
      }
    }
    else {
      if (OneSignal.config.autoRegister !== true) {
        log.debug('OneSignal: Not automatically showing popover because autoRegister is not specifically true.');
      }
      if (MainHelper.isHttpPromptAlreadyShown()) {
        log.debug('OneSignal: Not automatically showing popover because it was previously shown in the same session.');
      }
      if ((OneSignal.config.autoRegister === true) && !MainHelper.isHttpPromptAlreadyShown()) {
        OneSignal.showHttpPrompt().catch(e => {
          if (e instanceof InvalidStateError && ((e as any).reason === InvalidStateReason[InvalidStateReason.RedundantPermissionMessage]) ||
              e instanceof PermissionMessageDismissedError ||
            e instanceof AlreadySubscribedError) {
            log.debug('[Prompt Not Showing]', e);
            // Another prompt is being shown, that's okay
          } else throw e;
        })
      }
    }

    Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  }
}