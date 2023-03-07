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
export const APP_ID = "34fcbe85-278d-4fd2-a4ec-0f80e95072c5";

export const DUMMY_PUSH_TOKEN = "https://fcm.googleapis.com/fcm/send/01010101010101";
export const DUMMY_ONESIGNAL_ID = "1111111111-2222222222-3333333333";
export const DUMMY_EXTERNAL_ID = "rodrigo";
export const DUMMY_SUBSCRIPTION_ID = "4444444444-5555555555-6666666666";
export const DUMMY_MODEL_ID = "0000000000";
