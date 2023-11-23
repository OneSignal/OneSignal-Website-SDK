export const ONESIGNAL_EVENTS = {
  /**
   * Occurs immediately when the notification permission changes for the domain at the browser level.
   * This normally happens when the user clicks "Allow" or "Block" on the native permission prompt
   * on Chrome, Firefox, etc, however it also changes if the end-user clicks on the lock icon and
   * manually changes it.
   * Occurs BEFORE the actual push subscription is created on on the backend.
   */
  NOTIFICATION_PERMISSION_CHANGED_AS_STRING: 'permissionChangeAsString',
  /**
   * Same as NOTIFICATION_PERMISSION_CHANGED_AS_STRING, expect a boolean and will be used to fire
   * events to the public API OneSignal.Notification.addEventListener("permissionChange", function....)
   */
  NOTIFICATION_PERMISSION_CHANGED_AS_BOOLEAN: 'permissionChange',
  /**
   * Occurs after the user is officially subscribed to push notifications. The service worker is fully registered
   * and activated and the user is eligible to receive push notifications at any point after this.
   */
  SUBSCRIPTION_CHANGED: 'change',
  /**
   * Occurs after a POST call to OneSignal's server to send the welcome notification has completed. The actual
   * notification arrives shortly after.
   */
  WELCOME_NOTIFICATION_SENT: 'sendWelcomeNotification',
  /**
   * Occurs when a notification is displayed.
   */
  NOTIFICATION_WILL_DISPLAY: 'foregroundWillDisplay',
  /**
   * Occurs when a notification is dismissed by the user either clicking 'X' or clearing all notifications
   * (available in Android). This event is NOT called if the user clicks the notification's body or any of the
   * action buttons.
   */
  NOTIFICATION_DISMISSED: 'dismiss',
  /**
   * New event replacing legacy addNotificationOpenedHandler(). Used when the notification was clicked.
   */
  NOTIFICATION_CLICKED: 'click',
  /**
   * Occurs after the document ready event fires
   */
  SDK_INITIALIZED: 'initializeInternal',
  /**
   * Occurs after the SDK finishes its final internal initialization. The final initialization event.
   */
  SDK_INITIALIZED_PUBLIC: 'initialize',
  /**
   * Occurs after the user subscribes to push notifications and a new user entry is created on OneSignal's server,
   * and also occurs when the user begins a new site session and the last_session and last_active is updated on
   * OneSignal's server.
   */
  REGISTERED: 'register',
  /**
   * Occurs as the HTTP popup is closing.
   */
  POPUP_CLOSING: 'popupClose',
  /**
   * Occurs when the native permission prompt is displayed.
   */
  PERMISSION_PROMPT_DISPLAYED: 'permissionPromptDisplay',
  /**
   * Occurs when the email subscription changes
   */
  EMAIL_SUBSCRIPTION_CHANGED: 'emailSubscriptionChanged',
  /**
   * Occurs when the SMS subscription changes
   */
  SMS_SUBSCRIPTION_CHANGED: 'smsSubscriptionChanged',
  /**
   * For internal testing only. Used for all sorts of things.
   */
  TEST_INIT_OPTION_DISABLED: 'testInitOptionDisabled',
  TEST_WOULD_DISPLAY: 'testWouldDisplay',
  TEST_FINISHED_ALLOW_CLICK_HANDLING: 'testFinishedAllowClickHandling',
  POPUP_WINDOW_TIMEOUT: 'popupWindowTimeout',
  SESSION_STARTED: 'os.sessionStarted',
};
