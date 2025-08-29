/**
 * TO DO: initialize a class specific static Emitter (instead of using global OneSignal.emitter)
 * and update everywhere that event is emitted to use the new emitter (e.g: OneSignal.user.emitter.emit())
 */

import type { EventsMap } from '../../shared/services/types';

export abstract class EventListenerBase<
  TEventKeys extends keyof EventsMap = keyof EventsMap,
> {
  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - event name to listen for
   * @param listener - callback function to execute when event is triggered
   */
  abstract addEventListener<K extends TEventKeys>(
    event: K,
    listener: (obj: EventsMap[K]) => void,
  ): void;

  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - event name to stop listening for
   * @param listener - callback function to remove from event
   */
  abstract removeEventListener<K extends TEventKeys>(
    event: K,
    listener: (obj: EventsMap[K]) => void,
  ): void;
}
