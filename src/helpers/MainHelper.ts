import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from '../vars';
import Environment from '../Environment';
import OneSignalApi from '../OneSignalApi';
import * as log from 'loglevel';
import LimitStore from '../LimitStore';
import Event from "../Event";
import Database from '../Database';
import * as Browser from 'bowser';
import {
  getConsoleStyle, contains, normalizeSubdomain, getDeviceTypeForBrowser, capitalize,
  awaitOneSignalInitAndSupported
} from '../utils';
import * as objectAssign from 'object-assign';
import * as EventEmitter from 'wolfy87-eventemitter';
import * as heir from 'heir';
import * as swivel from 'swivel';
import OneSignal from '../OneSignal';
import Postmam from '../Postmam';
import * as Cookie from 'js-cookie';
import HttpModal from "../http-modal/httpModal";
import Bell from "../bell/bell";
import SubscriptionHelper from "./SubscriptionHelper";
import EventHelper from "./EventHelper";


export default class MainHelper {

  /**
   * If there are multiple manifests, and one of them is our OneSignal manifest, we move it to the top of <head> to ensure our manifest is used for push subscription (manifests after the first are ignored as part of the spec).
   */
  static fixWordpressManifestIfMisplaced() {
    var manifests = document.querySelectorAll('link[rel=manifest]');
    if (!manifests || manifests.length <= 1) {
      // Multiple manifests do not exist on this webpage; there is no issue
      return;
    }
    for (let i = 0; i < manifests.length; i++) {
      let manifest = manifests[i];
      let url = (manifest as any).href;
      if (contains(url, 'gcm_sender_id')) {
        // Move the <manifest> to the first thing in <head>
        document.querySelector('head').insertBefore(manifest, document.querySelector('head').children[0]);
        log.warn('OneSignal: Moved the WordPress push <manifest> to the first element in <head>.');
      }
    }
  }

  /**
   * If the user has manually opted out of notifications (OneSignal.setSubscription), returns -2; otherwise returns 1.
   * @param isOptedIn The result of OneSignal.getSubscription().
   */
  static getNotificationTypeFromOptIn(isOptedIn) {
    if (isOptedIn == true || isOptedIn == null) {
      return 1;
    } else {
      return -2;
    }
  }

  /*
   Returns the current browser-agnostic notification permission as "default", "granted", "denied".
   safariWebId: Used only to get the current notification permission state in Safari (required as part of the spec).
   */
  static getNotificationPermission(safariWebId) {
    return awaitOneSignalInitAndSupported()
      .then(() => {
        return new Promise((resolve, reject) => {
          if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
            // User is using our subscription workaround
            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION, {safariWebId: safariWebId}, reply => {
              let remoteNotificationPermission = reply.data;
              resolve(remoteNotificationPermission);
            });
          } else {
            if (Browser.safari) {
              // The user is on Safari
              // A web ID is required to determine the current notificiation permission
              if (safariWebId) {
                resolve(window.safari.pushNotification.permission(safariWebId).permission);
              }
              else {
                // The user didn't set up Safari web push properly; notifications are unlikely to be enabled
                console.warn(`OneSignal: Invalid init option safari_web_id %c${safariWebId}`, getConsoleStyle('code'), '. Please pass in a valid safari_web_id to OneSignal init.');
              }
            }
            else {
              // Identical API on Firefox and Chrome
              resolve(window.Notification.permission);
            }
          }
        });
      });
  }

  /**
   * Assigns a variable into sessionStorage to represent the beginning of a OneSignal session. A session is
   * initiated by opening a new tab or window to a OneSignal active page. While the same session lasts, refreshes to
   * the same page won't re-subscribe the user to OneSignal or update the last_active or session_count property.
   *
   * This method ensures that the sessionStorage is appropriately set for HTTP sites by communicating with the host
   * page.
   *
   * The only time we do start a browsing session on HTTP is after we register, so we get the popupPostman and post
   * a message back to the host to also start a browsing session.
   */
  static beginTemporaryBrowserSession() {
    log.debug('OneSignal: Marking browser session as continuing.');
    sessionStorage.setItem("ONE_SIGNAL_SESSION", "true");
    if (Environment.isPopup()) {
      // If we're setting sessionStorage and we're in an Popup, we need to also set sessionStorage on the
      // main page
      if (!OneSignal.popupPostmam) {
        return;
      }
      OneSignal.popupPostmam.message(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION);
    }
  }

  /**
   * Returns true if the experimental HTTP permission request is being used to prompt the user.
   */
  static isUsingHttpPermissionRequest() {
    return OneSignal.config.httpPermissionRequest &&
      OneSignal.config.httpPermissionRequest.enable == true &&
      (Environment.isIframe() ||
      Environment.isHost() && SubscriptionHelper.isUsingSubscriptionWorkaround());
  }

  /**
   * Returns true if the site using the HTTP permission request is supplying its own modal prompt to the user.
   */
  static isUsingCustomHttpPermissionRequestPostModal() {
    return (OneSignal.config.httpPermissionRequest &&
    OneSignal.config.httpPermissionRequest.useCustomModal == true);
  }

  /**
   * Creates a session cookie to note that the user does not want to be disturbed for the rest of the browser session.
   */
  static markHttpsNativePromptDismissed() {
    log.debug('OneSignal: User dismissed the native notification prompt; storing flag.');
    return Cookie.set('onesignal-notification-prompt', 'dismissed', {
      // In 8 hours, or 1/3 of the day
      expires: 0.333
    });
  }

  /**
   * Just for debugging purposes, removes the coookie from hiding the native prompt.
   * @returns {*}
   */
  static unmarkHttpsNativePromptDismissed() {
    if (Cookie.remove('onesignal-notification-prompt')) {
      log.debug('OneSignal: Removed the native notification prompt dismissed cookie.')
    } else {
      log.debug('OneSignal: Cookie not marked.');
    }
  }

  /**
   * Returns true if a session cookie exists for noting the user dismissed the native prompt.
   */
  static wasHttpsNativePromptDismissed() {
    return Cookie.get('onesignal-notification-prompt') === 'dismissed';
  }

  /**
   * Stores a flag in sessionStorage that we've already shown the HTTP popover to this user and that we should not
   * show it again until they open a new window or tab to the site.
   */
  static markHttpPopoverShown() {
    sessionStorage.setItem("ONESIGNAL_HTTP_PROMPT_SHOWN", "true");
  }

  /**
   * Returns true if the HTTP popover was already shown inside the same session.
   */
  static isHttpPromptAlreadyShown() {
    return sessionStorage.getItem("ONESIGNAL_HTTP_PROMPT_SHOWN") == "true";
  }

  /**
   * Returns true if this current window session is continuing and not a newly opened tab or window.
   */
  static isContinuingBrowserSession() {
    /*
     We don't need to communicate with any iFrames for HTTP sites because the same sessionStorage is set on all
     frames of the window.
     */
    return sessionStorage.getItem("ONE_SIGNAL_SESSION") == "true";
  }

  /**
   * Creates a new or updates an existing OneSignal user (player) on the server.
   *
   * @param appId The app ID passed to init.
   *        subscriptionInfo A hash containing 'endpointOrToken', 'auth', and 'p256dh'.
   *
   * @remarks Called from both the host page and HTTP popup.
   *          If a user already exists and is subscribed, updates the session count by calling /players/:id/on_session; otherwise, a new player is registered via the /players endpoint.
   *          Saves the user ID and registration ID to the local web database after the response from OneSignal.
   */
  static registerWithOneSignal(appId, subscriptionInfo) {
    let deviceType = getDeviceTypeForBrowser();
    return Promise.all([
      OneSignal.getUserId(),
      OneSignal.getSubscription()
    ])
                  .then(([userId, subscription]) => {
                    let requestUrl = userId ?
                      `players/${userId}/on_session` :
                      `players`;

                    let requestData = {
                      app_id: appId,
                      device_type: deviceType,
                      language: Environment.getLanguage(),
                      timezone: new Date().getTimezoneOffset() * -60,
                      device_model: navigator.platform + " " + Browser.name,
                      device_os: Browser.version,
                      sdk: OneSignal._VERSION,
                      notification_types: MainHelper.getNotificationTypeFromOptIn(subscription)
                    };

                    if (subscriptionInfo) {
                      (requestData as any).identifier = subscriptionInfo.endpointOrToken;
                      // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
                      // Parse out the registration ID from the full endpoint URL and save it to our database
                      let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
                      Database.put("Ids", {type: "registrationId", id: registrationId});
                      // New web push standard in Firefox 46+ and Chrome 50+ includes 'auth' and 'p256dh' in PushSubscription
                      if (subscriptionInfo.auth) {
                        (requestData as any).web_auth = subscriptionInfo.auth;
                      }
                      if (subscriptionInfo.p256dh) {
                        (requestData as any).web_p256 = subscriptionInfo.p256dh;
                      }
                    }

                    return OneSignalApi.post(requestUrl, requestData);
                  })
                  .then((response: any) => {
                    let {id: userId} = response;

                    MainHelper.beginTemporaryBrowserSession();

                    if (userId) {
                      Database.put("Ids", {type: "userId", id: userId});
                    }
                  })
                  .then(() => {
                    // We've finished registering with OneSignal, our session_count and last_active has been updated
                    Event.trigger(OneSignal.EVENTS.REGISTERED);
                  });
  }

  static checkAndTriggerNotificationPermissionChanged() {
    Promise.all([
      Database.get('Options', 'notificationPermission'),
      OneSignal.getNotificationPermission()
    ])
           .then(([previousPermission, currentPermission]) => {
             if (previousPermission !== currentPermission) {
               EventHelper.triggerNotificationPermissionChanged()
                        .then(() => Database.put('Options', {
                          key: 'notificationPermission',
                          value: currentPermission
                        }));
             }
           });
  }

  static sendSelfNotification(title, message, url, icon, data, buttons) {
    if (!title) {
      title = 'OneSignal Test Message';
    }
    if (!message) {
      message = 'This is an example notification.';
    }
    if (!url) {
      url = new URL(location.href).origin + '?_osp=do_not_open';
    }
    Promise.all([
      MainHelper.getAppId(),
      OneSignal.getUserId()
    ])
           .then(([appId, userId]) => {
             if (userId && appId) {
               OneSignalApi.sendNotification(appId, [userId], {'en': title}, {'en': message}, url, icon, data, buttons)
             } else {
               log.warn('Could not send self a test notification because there is no valid user ID or app ID.');
             }
           });
  }

  /**
   * Calls Notification.requestPermission(), but returns a Promise instead of accepting a callback like the a ctual
   * Notification.requestPermission();
   */
  static requestNotificationPermissionPromise() {
    return new Promise(resolve => window.Notification.requestPermission(resolve));
  }

  static showNotifyButton() {
    if (Environment.isBrowser() && !OneSignal.notifyButton) {
      OneSignal.config.notifyButton = OneSignal.config.notifyButton || {};
      if (OneSignal.config.bell) {
        // If both bell and notifyButton, notifyButton's options take precedence
        objectAssign(OneSignal.config.bell, OneSignal.config.notifyButton);
        objectAssign(OneSignal.config.notifyButton, OneSignal.config.bell);
      }
      if (OneSignal.config.notifyButton.displayPredicate &&
        typeof OneSignal.config.notifyButton.displayPredicate === "function") {
        Promise.resolve(OneSignal.config.notifyButton.displayPredicate())
               .then(predicateValue => {
                 if (predicateValue !== false) {
                   OneSignal.notifyButton = new Bell(OneSignal.config.notifyButton);
                   OneSignal.notifyButton.create();
                 } else {
                   log.debug('Notify button display predicate returned false so not showing the notify button.');
                 }
               });
      } else {
        OneSignal.notifyButton = new Bell(OneSignal.config.notifyButton);
        OneSignal.notifyButton.create();
      }
    }
  }

  static getPrefixedServiceWorkerNameForEnv() {
    if (Environment.isDev()) {
      OneSignal.SERVICE_WORKER_PATH = DEV_PREFIX + 'OneSignalSDKWorker.js';
      OneSignal.SERVICE_WORKER_UPDATER_PATH = DEV_PREFIX + 'OneSignalSDKUpdaterWorker.js';
    } else if (Environment.isStaging()) {
      OneSignal.SERVICE_WORKER_PATH = STAGING_PREFIX + 'OneSignalSDKWorker.js';
      OneSignal.SERVICE_WORKER_UPDATER_PATH = STAGING_PREFIX + 'OneSignalSDKUpdaterWorker.js';
    }
  }

  static checkAndDoHttpPermissionRequest() {
    log.debug('Called %ccheckAndDoHttpPermissionRequest()', getConsoleStyle('code'));
    if (this.isUsingHttpPermissionRequest()) {
      if (OneSignal.config.autoRegister) {
        OneSignal.showHttpPermissionRequest()
                 .then(result => {
                   if (result === 'granted' && !this.isUsingCustomHttpPermissionRequestPostModal()) {
                     log.debug('Showing built-in post HTTP permission request in-page modal because permission is granted and not using custom modal.');
                     this.showHttpPermissionRequestPostModal(OneSignal.config.httpPermissionRequest);
                   }
                 });
      } else {
        Event.trigger(OneSignal.EVENTS.TEST_INIT_OPTION_DISABLED);
      }
    }
  }

  static getNotificationIcons() {
    var url = '';
    return MainHelper.getAppId()
                    .then(appId => {
                      if (!appId) {
                        return Promise.reject(null);
                      } else {
                        url = `${OneSignal._API_URL}apps/${appId}/icon`;
                        return url;
                      }
                    }, () => {
                      log.debug('No app ID, not getting notification icon for notify button.');
                      return;
                    })
                    .then(url => fetch(url))
                    .then(response => (response as any).json())
                    .then(data => {
                      if (data.errors) {
                        log.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
                        throw new Error('Failed to get notification icons.');
                      }
                      return data;
                    });
  }

  static establishServiceWorkerChannel(serviceWorkerRegistration?) {
    if (OneSignal._channel) {
      OneSignal._channel.off('data');
      OneSignal._channel.off('notification.displayed');
      OneSignal._channel.off('notification.clicked');
    }
    OneSignal._channel = (swivel as any).at(serviceWorkerRegistration ? serviceWorkerRegistration.active : null);
    OneSignal._channel.on('data', function handler(context, data) {
      log.debug(`%c${capitalize(Environment.getEnv())} ⬸ ServiceWorker:`, getConsoleStyle('serviceworkermessage'), data, context);
    });
    OneSignal._channel.on('notification.displayed', function handler(context, data) {
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISPLAYED, data);
    });
    OneSignal._channel.on('notification.clicked', function handler(context, data) {
      if (Environment.isHost()) {
        EventHelper.fireTransmittedNotificationClickedCallbacks(data);
      } else if (Environment.isIframe()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, data);
      }
    });
    OneSignal._channel.on('notification.dismissed', function handler(context, data) {
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
    });
  }

  static getNormalizedSubdomain(subdomain) {
    if (subdomain) {
      return normalizeSubdomain(subdomain);
    }
  }

  static getPromptOptionsQueryString() {
    let promptOptions = OneSignal.config['promptOptions'];
    let promptOptionsStr = '';
    if (promptOptions) {
      let hash = MainHelper.getPromptOptionsPostHash();
      for (let key of Object.keys(hash)) {
        var value = hash[key];
        promptOptionsStr += '&' + key + '=' + value;
      }
    }
    return promptOptionsStr;
  }

  /**
   * Shows the modal on the page users must click on after the local notification prompt to trigger the standard
   * HTTP popup window.
   */
  static showHttpPermissionRequestPostModal(options) {
    OneSignal.httpPermissionRequestPostModal = new HttpModal(options);
    OneSignal.httpPermissionRequestPostModal.create();
  }

  static getPromptOptionsPostHash() {
    let promptOptions = OneSignal.config['promptOptions'];
    if (promptOptions) {
      var legacyParams = {
        'exampleNotificationTitleDesktop': 'exampleNotificationTitle',
        'exampleNotificationMessageDesktop': 'exampleNotificationMessage',
        'exampleNotificationTitleMobile': 'exampleNotificationTitle',
        'exampleNotificationMessageMobile': 'exampleNotificationMessage',
      };
      for (let legacyParamKey of Object.keys(legacyParams)) {
        let legacyParamValue = legacyParams[legacyParamKey];
        if (promptOptions[legacyParamKey]) {
          promptOptions[legacyParamValue] = promptOptions[legacyParamKey];
        }
      }
      var allowedPromptOptions = [
        'autoAcceptTitle',
        'siteName',
        'autoAcceptTitle',
        'subscribeText',
        'showGraphic',
        'actionMessage',
        'exampleNotificationTitle',
        'exampleNotificationMessage',
        'exampleNotificationCaption',
        'acceptButtonText',
        'cancelButtonText',
        'timeout',
      ];
      var hash = {};
      for (var i = 0; i < allowedPromptOptions.length; i++) {
        var key = allowedPromptOptions[i];
        var value = promptOptions[key];
        var encoded_value = encodeURIComponent(value);
        if (value || value === false || value === '') {
          hash[key] = encoded_value;
        }
      }
    }
    return hash;
  }

  static triggerCustomPromptClicked(clickResult) {
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  }

  static autoCorrectSubdomain(inputSubdomain) {
    let normalizedSubdomain = MainHelper.getNormalizedSubdomain(inputSubdomain);
    if (normalizedSubdomain !== inputSubdomain) {
      log.warn(`Auto-corrected subdomain '${inputSubdomain}' to '${normalizedSubdomain}'.`);
    }
    return normalizedSubdomain;
  }

  static createHiddenDomIFrame(url, name?) {
    let node = document.createElement("iframe");
    node.style.display = "none";
    if (!url) {
      url = 'about:blank';
    }
    node.src = url;
    if (name) {
      node.name = name;
    }
    document.body.appendChild(node);
    return node;
  }

  static createSubscriptionDomModal(url) {
    let iframeContainer = document.createElement('div');
    iframeContainer.setAttribute('id', 'OneSignal-iframe-modal');
    iframeContainer.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed;' +
      ' top: 0; left: 0; right: 0; bottom: 0; z-index: 3000000000; display: flex;' +
      ' align-items: center; justify-content: center;"></div>';
    document.body.appendChild(iframeContainer);

    let iframeContainerStyle = document.createElement('style');
    iframeContainerStyle.innerHTML = `@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} }`;
    document.getElementsByTagName('head')[0].appendChild(iframeContainerStyle);

    let iframe = document.createElement("iframe");
    iframe.className = "OneSignal-permission-iframe";
    iframe.setAttribute('frameborder', '0');
    iframe.width = OneSignal._windowWidth.toString();
    iframe.height = OneSignal._windowHeight.toString();
    iframe.src = url;

    document.getElementById("notif-permission").appendChild(iframe);
    return iframe;
  }

  // Arguments :
  //  verb : 'GET'|'POST'
  //  target : an optional opening target (a name, or "_blank"), defaults to "_self"
  static openWindowViaPost(url, data, overrides) {
    var form = document.createElement("form");
    form.action = url;
    form.method = 'POST';
    form.target = "onesignal-http-popup";

    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : (screen as any).left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : (screen as any).top;
    var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var childWidth = OneSignal._windowWidth;
    var childHeight = OneSignal._windowHeight;
    var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
    var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;

    if (overrides) {
      if (overrides.childWidth) {
        childWidth = overrides.childWidth;
      }
      if (overrides.childHeight) {
        childHeight = overrides.childHeight;
      }
      if (overrides.left) {
        left = overrides.left;
      }
      if (overrides.top) {
        top = overrides.top;
      }
    }
    const windowRef = window.open('about:blank', "onesignal-http-popup", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);

    if (data) {
      for (var key in data) {
        var input = document.createElement("textarea");
        input.name = key;
        input.value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
        form.appendChild(input);
      }
    }
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    return windowRef;
  };

  static openSubdomainPopup(url, data, overrides) {
    return MainHelper.openWindowViaPost(url, data, overrides);
  }

  static getAppId() {
    if (OneSignal.config.appId) {
      return Promise.resolve(OneSignal.config.appId);
    }
    else return Database.get('Ids', 'appId');
  }
}