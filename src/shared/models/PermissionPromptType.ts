export const PermissionPromptType = {
  /**
   * The "main" browser native permission request dialog when prompting for local or push notification permissions.
   */
  HttpsPermissionRequest: 'HTTPS permission request',
  /**
   * The "sliding down" prompt.
   */
  SlidedownPermissionMessage: 'slidedown permission message',
  /**
   * The "notify button".
   */
  SubscriptionBell: 'subscription bell',
} as const;

export type PermissionPromptTypeValue =
  (typeof PermissionPromptType)[keyof typeof PermissionPromptType];
