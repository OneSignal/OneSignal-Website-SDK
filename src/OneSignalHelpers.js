import { DEV_HOST, DEV_FRAME_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js';
import './string.js';
import { apiCall, sendNotification } from './api.js';
import log from 'loglevel';
import LimitStore from './limitStore.js';
import Event from "./events.js";
import Bell from "./bell/bell.js";
import Database from './database.js';
import * as Browser from 'bowser';
import { isPushNotificationsSupported, isPushNotificationsSupportedAndWarn, getConsoleStyle, once, guid, contains, logError, normalizeSubdomain, decodeHtmlEntities, getUrlQueryParam } from './utils.js';
import objectAssign from 'object-assign';
import EventEmitter from 'wolfy87-eventemitter';
import heir from 'heir';
import swivel from 'swivel';
import Postmam from './postmam.js';


export default class OneSignalHelpers {

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

  static getDeviceTypeForBrowser() {
    if (Browser.chrome) {
      return OneSignal.DEVICE_TYPES.CHROME;
    } else if (Browser.firefox) {
      return OneSignal.DEVICE_TYPES.FIREFOX;
    } else if (Browser.safari) {
      return OneSignal.DEVICE_TYPES.SAFARI;
    }
  }

  static beginTemporaryBrowserSession() {
    sessionStorage.setItem("ONE_SIGNAL_SESSION", true);
  }

  static isContinuingBrowserSession() {
    return sessionStorage.getItem("ONE_SIGNAL_SESSION");
  }

  /**
   * Called from both the host page and HTTP popup.
   * If a user already exists and is subscribed, updates the session count by calling /players/:id/on_session; otherwise, a new player is registered via the /players endpoint.
   * Saves the user ID and registration ID to the database after the response from OneSignal.
   */
  static registerWithOneSignal(appId, registrationId, deviceType) {
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
          notification_types: OneSignalHelpers.getNotificationTypeFromOptIn(subscription)
        };

        if (registrationId) {
          requestData.identifier = registrationId;
          Database.put("Ids", {type: "registrationId", id: registrationId});
        }

        return apiCall(requestUrl, 'POST', requestData);
      })
      .then(response => {
        let { id: userId } = response;

        OneSignalHelpers.beginTemporaryBrowserSession();

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
              OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.POPUP_IDS_AVAILBLE)
              if (opener)
                window.close();
            })
            .catch(e => log.error(e));
        }
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
    OneSignal.getNotificationPermission()
      .then(permission => {
        let currentPermission = permission;
        let lastPermission = LimitStore.getLast('notification.permission');
        if (lastPermission !== currentPermission) {
          OneSignal.triggerNotificationPermissionChanged(lastPermission, currentPermission);
        }
      })
      .catch(e => log.error(e));
  }

  static sendSelfNotification(title, message, url, icon, data) {
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
          sendNotification(appId, [userId], {'en': title}, {'en': message}, url, icon, data)
        } else {
          log.warn('Could not send self a test notification because there is no valid user ID or app ID.');
        }
      });
  }

  static establishServiceWorkerChannel(serviceWorkerRegistration) {
    if (OneSignal._channel) {
      OneSignal._channel.off('data');
      OneSignal._channel.off('notification.clicked');
    }
    OneSignal._channel = swivel.at(serviceWorkerRegistration.active);
    OneSignal._channel.on('data', function handler(context, data) {
      log.debug(`%c${Environment.getEnv().capitalize()} ⬸ ServiceWorker:`, getConsoleStyle('serviceworkermessage'), data, context);
    });
    OneSignal._channel.on('notification.clicked', function handler(context, data) {
      if (Environment.isHost()) {
        OneSignal._fireTransmittedNotificationClickedCallbacks(data);
      } else if (Environment.isIframe()) {
        var creator = opener || parent;
        OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.NOTIFICATION_OPENED, data);
      }
    });
    log.info('Service worker messaging channel established!');
  }

  static getNormalizedSubdomain(subdomain) {
    if (!subdomain) {
      log.error('OneSignal: Missing required init parameter %csubdomainName', getConsoleStyle('code'), '. You must supply a subdomain name to the SDK initialization options. (See: https://documentation.onesignal.com/docs/website-sdk-http-installation#2-include-and-initialize-onesignal)')
      throw new Error('OneSignal: Missing required init parameter subdomainName. You must supply a subdomain name to the SDK initialization options. (See: https://documentation.onesignal.com/docs/website-sdk-http-installation#2-include-and-initialize-onesignal)')
    }
    return normalizeSubdomain(subdomain);
  }

  static getPromptOptionsQueryString() {
    var message_localization_opts = OneSignal.config['promptOptions'];
    var message_localization_opts_str = '';
    if (message_localization_opts) {
      var message_localization_params = ['actionMessage',
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
    var recentPermissions = LimitStore.put('prompt.custom.permission', clickResult);
    Event.trigger(OneSignal.EVENTS.CUSTOM_PROMPT_CLICKED, {
      result: clickResult
    });
  }

  static saveAppId() {

  }

  static autoCorrectSubdomain(inputSubdomain) {
    let normalizedSubdomain = OneSignalHelpers.getNormalizedSubdomain(inputSubdomain);
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