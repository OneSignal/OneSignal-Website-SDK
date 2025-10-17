export const OPERATION_NAME = {
  // Identity Operations
  _SetAlias: 'set-alias',
  _DeleteAlias: 'delete-alias',

  // Property Operations
  _SetProperty: 'set-property',

  // User Operations
  _RefreshUser: 'refresh-user',
  _LoginUser: 'login-user',

  // Subscription Operations
  _CreateSubscription: 'create-subscription',
  _UpdateSubscription: 'update-subscription',
  _DeleteSubscription: 'delete-subscription',
  _TransferSubscription: 'transfer-subscription',

  // Custom Events Operations
  _CustomEvent: 'custom-event',
} as const;

export const IdentityConstants = {
  /**
   * The alias label for the external ID alias.
   */
  _ExternalID: 'external_id',

  /**
   * The alias label for the internal OneSignal ID alias.
   */
  _OneSignalID: 'onesignal_id',
} as const;
