/**
 * A generic interface which indicates the implementer has the ability to notify events through the
 * generic THandler interface specified. When implemented, any outside component may subscribe
 * to the events being notified. When an event is to be raised, the implementor
 * will call a method within THandler, the method(s) defined therein are entirely dependent on
 * the implementor/definition.
 *
 * Unlike ICallbackNotifier, there can be one zero or more event subscribers at any given time.
 *
 * @template THandler The type that the implementor is expecting to raise events to.
 */
export interface IEventNotifier<THandler> {
  /**
   * Whether there are currently any subscribers.
   */
  hasSubscribers: boolean;

  /**
   * Subscribe to listen for events.
   *
   * @param handler The handler that will be called when the event(s) occur.
   */
  subscribe(handler: THandler): void;

  /**
   * Unsubscribe to no longer listen for events.
   *
   * @param handler The handler that was previous registered via subscribe.
   */
  unsubscribe(handler: THandler): void;
}
