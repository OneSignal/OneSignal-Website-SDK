/**
 * @file constants.ts
 */

/**
 * If we want to advance one processing interval in the core module, we would call something like:
 *
 *     jest.advanceTimersByTime(DELTA_QUEUE_TIME_ADVANCE);
 *
 * That is, we are advancing one ms more than the time interval to process the delta & operation queues.
 * Thus, we can be sure that the queues are processed.
 *
 * @constant {number} OPERATION_QUEUE_TIME_ADVANCE - The time advance for the operation queue.
 * @constant {number} DELTA_QUEUE_TIME_ADVANCE - The time advance for the delta queue.
 */
export const OPERATION_QUEUE_TIME_ADVANCE = 5001;
export const DELTA_QUEUE_TIME_ADVANCE = 1001;

/* S T R I N G   C O N S T A N T S */
export const APP_ID = '34fcbe85-278d-4fd2-a4ec-0f80e95072c5';

export const DUMMY_PUSH_TOKEN =
  'https://fcm.googleapis.com/fcm/send/01010101010101';
export const DUMMY_ONESIGNAL_ID = '1111111111-2222222222-3333333333';
export const DUMMY_EXTERNAL_ID = 'rodrigo';
export const DUMMY_EXTERNAL_ID_2 = 'iryna';
export const DUMMY_SUBSCRIPTION_ID = '4444444444-5555555555-6666666666';
export const DUMMY_MODEL_ID = '0000000000';

/* REQUEST CONSTANTS */
export const DUMMY_GET_USER_REQUEST_WITH_PUSH_SUB = {
  result: {
    properties: {
      language: 'en',
      timezone_id: 'America/New_York',
      first_active: 1689826588,
      last_active: 1689826588,
    },
    identity: {
      external_id: DUMMY_EXTERNAL_ID,
      onesignal_id: DUMMY_ONESIGNAL_ID,
    },
    subscriptions: [
      {
        id: DUMMY_SUBSCRIPTION_ID,
        app_id: APP_ID,
        type: 'ChromePush',
        token: DUMMY_PUSH_TOKEN,
        enabled: false,
        notification_types: -2,
        session_time: 0,
        session_count: 1,
        sdk: '160000',
        device_model: 'MacIntel',
        device_os: '114',
        rooted: false,
        test_type: 0,
        app_version: '',
        net_type: 0,
        carrier: '',
        web_auth: 'R5dzF/EvmUbv0IsM3Ria7g==',
        web_p256:
          'BNWNgguO0F+id4MjCW2V98cwPiXHs0XyPUOCqlU0OgyqG4W9V3H1R799goSjSSgZ0CMI+7/nZYiVl1bB8ZnDZx0=',
      },
    ],
  },
  status: 200,
};
