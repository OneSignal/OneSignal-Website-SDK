/**
 * Source: https://github.com/pazguille/emitter-es6
 */

import type { EventsMap } from '../services/types';

/**
 * Creates a new instance of Emitter.
 * @class
 * @returns {Object} emitter - An instance of Emitter.
 * @example
 * var emitter = new Emitter();
 */
export default class Emitter {
  private _events: { [key: string]: ((...args: any[]) => void)[] };

  constructor() {
    this._events = {};
  }

  /**
   * Adds a listener to the collection for a specified event.
   */
  public on<K extends keyof EventsMap>(
    eventName: K,
    listener: (data: EventsMap[K]) => void,
  ): Emitter {
    this._events[eventName] = this._events[eventName] || [];
    this._events[eventName].push(listener);
    return this;
  }

  /**
   * Adds a one time listener to the collection for a specified event. It will
   * execute only once.
   */
  public once<K extends keyof EventsMap>(
    event: K,
    listener: (data: EventsMap[K]) => void,
  ): Emitter {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    function fn(this: Emitter) {
      that.off(event, fn);
      // @ts-expect-error - arguments is not typed
      listener.apply(this, arguments);
    }

    fn.listener = listener;
    this.on(event, fn);

    return this;
  }

  /**
   * Removes a listener from the collection for a specified event.
   */
  public off<K extends keyof EventsMap>(
    event: K,
    listener: (data: EventsMap[K]) => void,
  ): Emitter {
    const listeners = this._events[event];

    if (listeners !== undefined) {
      for (let j = 0; j < listeners.length; j += 1) {
        if (
          listeners[j] === listener ||
          (listeners[j] as unknown as { listener: (...args: any[]) => void })
            .listener === listener
        ) {
          listeners.splice(j, 1);
          break;
        }
      }

      if (listeners.length === 0) this.removeAllListeners(event);
    }

    return this;
  }

  /**
   * Removes all listeners from the collection for a specified event.
   */
  public removeAllListeners(event?: string): Emitter {
    if (event) delete this._events[event];
    else this._events = {};

    return this;
  }

  /**
   * Returns all listeners from the collection for a specified event.
   * @public
   * @function
   * @name Emitter#listeners
   * @param {String} event - Event name.
   * @returns {Array}
   * @example
   * me.listeners('ready');
   */
  public listeners(event: string): ((...args: any[]) => void)[] | undefined {
    try {
      return this._events[event];
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Returns number of listeners from the collection for a specified event.
   * @public
   * @function
   * @name Emitter#numberOfListeners
   * @param {String} event - Event name.
   * @returns {number}
   * @example
   * me.numberOfListeners('ready');
   */
  public numberOfListeners(event: string): number {
    const listeners = this.listeners(event);
    if (listeners) return listeners.length;
    return 0;
  }

  /**
   * Execute each item in the listener collection in order with the specified data.
   * @param event - String of the event name
   * @param args - Variable number of args to pass to the functions subscribe to the event
   */
  public async emit(...args: any[]): Promise<Emitter> {
    const event = args.shift();
    let listeners = this._events[event];

    if (listeners !== undefined) {
      listeners = listeners.slice(0);
      const len = listeners.length;
      for (let i = 0; i < len; i += 1)
        // @ts-expect-error - TODO: improve args type
        await (listeners[i] as () => void).apply(this, args);
    }

    return this;
  }
}
