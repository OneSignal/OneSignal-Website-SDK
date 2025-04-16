export const OPERATION_NAME = {
  // Identity Operations
  SET_ALIAS: 'set-alias',
  DELETE_ALIAS: 'delete-alias',

  // Tag Operations
  SET_TAG: 'set-tag',
  DELETE_TAG: 'delete-tag',

  // Property Operations
  SET_PROPERTY: 'set-property',

  // Session Operations
  TRACK_SESSION_START: 'track-session-start',
  TRACK_SESSION_END: 'track-session-end',

  // User Operations
  REFRESH_USER: 'refresh-user',
  LOGIN_USER: 'login-user',

  // Subscription Operations
  CREATE_SUBSCRIPTION: 'create-subscription',
  UPDATE_SUBSCRIPTION: 'update-subscription',
  DELETE_SUBSCRIPTION: 'delete-subscription',
  TRANSFER_SUBSCRIPTION: 'transfer-subscription',
} as const;
