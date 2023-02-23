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
