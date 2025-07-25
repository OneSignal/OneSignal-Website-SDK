export const OPERATION_NAME = {
  // Identity Operations
  SET_ALIAS: 'set-alias',
  DELETE_ALIAS: 'delete-alias',

  // Property Operations
  SET_PROPERTY: 'set-property',

  // User Operations
  REFRESH_USER: 'refresh-user',
  LOGIN_USER: 'login-user',

  // Subscription Operations
  CREATE_SUBSCRIPTION: 'create-subscription',
  UPDATE_SUBSCRIPTION: 'update-subscription',
  DELETE_SUBSCRIPTION: 'delete-subscription',
  TRANSFER_SUBSCRIPTION: 'transfer-subscription',

  // Custom Events Operations
  CUSTOM_EVENT: 'custom-event',
} as const;

export const IdentityConstants = {
  /**
   * The alias label for the external ID alias.
   */
  EXTERNAL_ID: 'external_id',

  /**
   * The alias label for the internal OneSignal ID alias.
   */
  ONESIGNAL_ID: 'onesignal_id',
} as const;
