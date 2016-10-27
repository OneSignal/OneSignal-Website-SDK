import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js';
import './string.js';
import OneSignalApi from './oneSignalApi.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import Event from "./events.js";
import Database from './database.js';
import * as Browser from 'bowser';
import { isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, getConsoleStyle, once, guid, contains, normalizeSubdomain, decodeHtmlEntities, getUrlQueryParam, getDeviceTypeForBrowser } from './utils.js';
import objectAssign from 'object-assign';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import swivel from 'swivel';
import OneSignal from './OneSignal';
import Postmam from './postmam.js';
import Cookie from 'js-cookie';


export default class Helpers {

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
      let url = manifest.href;
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
    sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
    if (Environment.isPopup()) {
      // If we're setting sessionStorage and we're in an Popup, we need to also set sessionStorage on the
      // main page
      if (!OneSignal.popupPostmam) {
        return;
      }
      OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.BEGIN_BROWSING_SESSION);
    }
  }

  /**
   * Returns true if the experimental HTTP permission request is being used to prompt the user.
   */
  static isUsingHttpPermissionRequest() {
    return OneSignal &&
           OneSignal.config &&
           OneSignal.config.httpPermissionRequest &&
           OneSignal.config.httpPermissionRequest.enable;
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
    sessionStorage.setItem("ONESIGNAL_HTTP_PROMPT_SHOWN", true);
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
          notification_types: Helpers.getNotificationTypeFromOptIn(subscription)
        };

        if (subscriptionInfo) {
          requestData.identifier = subscriptionInfo.endpointOrToken;
          // Although we're passing the full endpoint to OneSignal, we still need to store only the registration ID for our SDK API getRegistrationId()
          // Parse out the registration ID from the full endpoint URL and save it to our database
          let registrationId = subscriptionInfo.endpointOrToken.replace(new RegExp("^(https://android.googleapis.com/gcm/send/|https://updates.push.services.mozilla.com/push/)"), "");
          Database.put("Ids", {type: "registrationId", id: registrationId});
          // New web push standard in Firefox 46+ and Chrome 50+ includes 'auth' and 'p256dh' in PushSubscription
          if (subscriptionInfo.auth) {
            requestData.web_auth = subscriptionInfo.auth;
          }
          if (subscriptionInfo.p256dh) {
            requestData.web_p256 = subscriptionInfo.p256dh;
          }
        }

        return OneSignalApi.post(requestUrl, requestData);
      })
      .then(response => {
        let { id: userId } = response;

        Helpers.beginTemporaryBrowserSession();

        if (userId) {
          Database.put("Ids", {type: "userId", id: userId});
        }

        if (OneSignal._thisIsThePopup) {
          // 12/16/2015 -- At this point, the user has just clicked Allow on the HTTP popup!!
          OneSignal.getNotificationPermission()
            .then((permission) => {
              log.debug("Sending player Id and registrationId back to host page");
              var creator = opener || parent;
              OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION_CHANGED, permission);
              OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.POPUP_IDS_AVAILBLE);
              if (opener)
                window.close();
            })
            .catch(e => log.error(e));
        }
      })
        .then(() => {
          // We've finished registering with OneSignal, our session_count and last_active has been updated
          Event.trigger(OneSignal.EVENTS.REGISTERED);
        });
  }

  static checkAndTriggerSubscriptionChanged() {
    log.info('Called %ccheckAndTriggerSubscriptionChanged', getConsoleStyle('code'));

    let _currentSubscription, _subscriptionChanged;
    Promise.all([
      OneSignal.isPushNotificationsEnabled(),
      Database.get('Options', 'isPushEnabled')
    ])
      .then(([currentSubscription, previousSubscription]) => {
        _currentSubscription = currentSubscription;
        let subscriptionChanged = (previousSubscription === null ||
        previousSubscription !== currentSubscription);
        _subscriptionChanged = subscriptionChanged;
        if (subscriptionChanged) {
          log.info('New Subscription:', currentSubscription);
          return Database.put('Options', {key: 'isPushEnabled', value: currentSubscription});
        }
      })
      .then(() => {
        if (_subscriptionChanged) {
          OneSignal.triggerSubscriptionChanged(_currentSubscription);
        }
      });
  }

  static checkAndTriggerNotificationPermissionChanged() {
    Promise.all([
      Database.get('Options', 'notificationPermission'),
      OneSignal.getNotificationPermission()
    ])
      .then(([previousPermission, currentPermission]) => {
        if (previousPermission !== currentPermission) {
          OneSignal.triggerNotificationPermissionChanged(previousPermission, currentPermission);
        }
      })
      .catch(e => log.error(e));
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
      OneSignal.getAppId(),
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
    return new Promise(resolve => Notification.requestPermission(resolve));
  }

  static getNotificationIcons() {
    return OneSignal.getAppId()
                    .then(appId => {
                      if (!appId) {
                        return Promise.reject(null);
                      } else {
                        let url = `${OneSignal._API_URL}apps/${appId}/icon`;
                        return url;
                      }
                    }, () => {
                      log.debug('No app ID, not getting notification icon for notify button.');
                      return;
                    })
                    .then(url => fetch(url))
                    .then(response => response.json())
                    .then(data => {
                      if (data.errors) {
                        log.error(`API call %c${url}`, getConsoleStyle('code'), 'failed with:', data.errors);
                        reject(null);
                      }
                      return data;
                    })
                    .catch(function (ex) {
                      log.error('Call %cgetNotificationIcons()', getConsoleStyle('code'), 'failed with:', ex);
                    })
  }

  static establishServiceWorkerChannel(serviceWorkerRegistration) {
    log.debug('OneSignal: Attempting to establish a service worker channel...', serviceWorkerRegistration);
    if (OneSignal._channel) {
      OneSignal._channel.off('data');
      OneSignal._channel.off('notification.displayed');
      OneSignal._channel.off('notification.clicked');
    }
    OneSignal._channel = swivel.at(serviceWorkerRegistration ? serviceWorkerRegistration.active : null);
    OneSignal._channel.on('data', function handler(context, data) {
      log.debug(`%c${Environment.getEnv().capitalize()} ⬸ ServiceWorker:`, getConsoleStyle('serviceworkermessage'), data, context);
    });
    OneSignal._channel.on('notification.displayed', function handler(context, data) {
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISPLAYED, data);
    });
    OneSignal._channel.on('notification.clicked', function handler(context, data) {
      if (Environment.isHost()) {
        OneSignal._fireTransmittedNotificationClickedCallbacks(data);
      } else if (Environment.isIframe()) {
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, data);
      }
    });
    OneSignal._channel.on('notification.dismissed', function handler(context, data) {
      Event.trigger(OneSignal.EVENTS.NOTIFICATION_DISMISSED, data);
    });
    log.info('Service worker messaging channel established!');
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
      let hash = Helpers.getPromptOptionsPostHash();
      for (let key of Object.keys(hash)) {
        var value = hash[key];
        promptOptionsStr += '&' + key + '=' + value;
      }
    }
    return promptOptionsStr;
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
        'actionMessage',
        'exampleNotificationTitle',
        'exampleNotificationMessage',
        'exampleNotificationCaption',
        'acceptButtonText',
        'cancelButtonText'
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
    let normalizedSubdomain = Helpers.getNormalizedSubdomain(inputSubdomain);
    if (normalizedSubdomain !== inputSubdomain) {
      log.warn(`Auto-corrected subdomain '${inputSubdomain}' to '${normalizedSubdomain}'.`);
    }
    return normalizedSubdomain;
  }

  static createHiddenDomIFrame(url, name) {
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
  static openWindowViaPost(url, data) {
    var form = document.createElement("form");
    form.action = url;
    form.method = 'POST';
    form.target = "onesignal-http-popup";

    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
    var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var childWidth = OneSignal._windowWidth;
    var childHeight = OneSignal._windowHeight;
    var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
    var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;
    window.open('about:blank', "onesignal-http-popup", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);

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
  };

  static openSubdomainPopup(url, data) {
    Helpers.openWindowViaPost(url, data);
  }
}