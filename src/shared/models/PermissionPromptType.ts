export enum PermissionPromptType {
  /**
   * The "main" browser native permission request dialog when prompting for local or push notification permissions.
   */
  HttpsPermissionRequest = <any>'HTTPS permission request',
  /**
   * The "sliding down" prompt.
   */
  SlidedownPermissionMessage = <any>'slidedown permission message',
  /**
   * The "notify button".
   */
  SubscriptionBell = <any>'subscription bell',
}
