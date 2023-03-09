/**
 * TO DO: initialize a class specific static Emitter (instead of using global OneSignal.emitter)
 * and update everywhere that event is emitted to use the new emitter (e.g: OneSignal.user.emitter.emit())
 */

export abstract class EventListenerBase {
  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - event name to listen for
   * @param listener - callback function to execute when event is triggered
   */
  abstract addEventListener(event: string, listener: (obj: any) => void): void;

  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - event name to stop listening for
   * @param listener - callback function to remove from event
   */
  abstract removeEventListener(event: string, listener: (obj: any) => void): void;
}
