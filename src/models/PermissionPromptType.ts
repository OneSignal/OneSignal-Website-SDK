export enum PermissionPromptType {
  /**
   * The "main" browser native permission request dialog when prompting for local or push notification permissions.
   */
  HttpsPermissionRequest = <any>'HTTPS permission request',
  /**
   * The "popup" to subdomain.onesignal.com.
   */
  FullscreenHttpPermissionMessage = <any>'fullscreen HTTP permission message',
  /**
   * The full-screen HTTPS modal with a dimmed backdrop.
   */
  FullscreenHttpsPermissionMessage = <any>'fullscreen HTTPS permission message',
  /**
   * The "sliding down" prompt.
   */
  SlidedownPermissionMessage = <any>'slidedown permission message',
  /**
   * The "notify button".
   */
  SubscriptionBell = <any>'subscription bell',
}
