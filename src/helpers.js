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

  static beginTemporaryBrowserSession() {
    sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
  }

  static isContinuingBrowserSession() {
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
          // 12/16/2015 -- At this point, the user has just clicked Allow on the HTTP prompt!!
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

  static establishServiceWorkerChannel(serviceWorkerRegistration) {
    if (OneSignal._channel) {
      OneSignal._channel.off('data');
      OneSignal._channel.off('notification.displayed');
      OneSignal._channel.off('notification.clicked');
    }
    OneSignal._channel = swivel.at(serviceWorkerRegistration.active);
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
    var message_localization_opts = OneSignal.config['promptOptions'];
    var message_localization_opts_str = '';
    if (message_localization_opts) {
      var message_localization_params = [
        'siteName',
        'actionMessage',
        'exampleNotificationTitleDesktop',
        'exampleNotificationMessageDesktop',
        'exampleNotificationTitleMobile',
        'exampleNotificationMessageMobile',
        'exampleNotificationCaption',
        'acceptButtonText',
        'cancelButtonText',
        'showCredit'];
      for (var i = 0; i < message_localization_params.length; i++) {
        var key = message_localization_params[i];
        var value = message_localization_opts[key];
        var encoded_value = encodeURIComponent(value);
        if (value || value === false || value === '') {
          message_localization_opts_str += '&' + key + '=' + encoded_value;
        }
      }
    }
    return message_localization_opts_str;
  }

  static triggerCustomPromptClicked(clickResult) {
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  }

  static saveAppId() {

  }

  static autoCorrectSubdomain(inputSubdomain) {
    let normalizedSubdomain = Helpers.getNormalizedSubdomain(inputSubdomain);
    if (normalizedSubdomain !== inputSubdomain) {
      log.warn(`Auto-corrected subdomain '${inputSubdomain}' to '${normalizedSubdomain}'.`);
    }
    return normalizedSubdomain;
  }

  static createHiddenDomIFrame(url) {
    let node = document.createElement("iframe");
    node.style.display = "none";
    node.src = url;
    document.body.appendChild(node);
    return node;
  }

  static createSubscriptionDomModal(url) {
    let iframeContainer = document.createElement('div');
    iframeContainer.setAttribute('id', 'OneSignal-iframe-modal');
    iframeContainer.innerHTML = '<div id="notif-permission" style="background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 3000000000; display: block"></div>';
    document.body.appendChild(iframeContainer);

    let iframeContainerStyle = document.createElement('style');
    iframeContainerStyle.innerHTML = `@media (max-width: 560px) { .OneSignal-permission-iframe { width: 100%; height: 100%;} } @media (min-width: 561px) { .OneSignal-permission-iframe { top: 50%; left: 50%; margin-left: -275px; margin-top: -248px;} }`;
    document.getElementsByTagName('head')[0].appendChild(iframeContainerStyle);

    let iframe = document.createElement("iframe");
    iframe.className = "OneSignal-permission-iframe"
    iframe.style.cssText = "background: rgba(255, 255, 255, 1); position: fixed;";
    iframe.setAttribute('frameborder', '0');
    iframe.width = OneSignal._windowWidth.toString();
    iframe.height = OneSignal._windowHeight.toString();
    iframe.src = url;

    document.getElementById("notif-permission").appendChild(iframe);
    return iframe;
  }

  static openSubdomainPopup(url) {
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
    var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    var childWidth = OneSignal._windowWidth;
    var childHeight = OneSignal._windowHeight;
    var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
    var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;
    return window.open(url, "_blank", `'scrollbars=yes, width=${childWidth}, height=${childHeight}, top=${top}, left=${left}`);
  }
}