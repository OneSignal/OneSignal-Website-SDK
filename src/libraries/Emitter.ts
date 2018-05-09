
/**
 * Source: https://github.com/pazguille/emitter-es6
 */

export type EventHandler = (...args: any[]) => any;
export type OnceEventHandler = {
  listener: EventHandler
};

interface ListenerMap {
  [index: string]: (EventHandler | OnceEventHandler)[];
}

/**
 * Creates a new instance of Emitter.
 * @class
 * @returns {Object} emitter - An instance of Emitter.
 * @example
 * var emitter = new Emitter();
 */
export default class Emitter {

  private _events: ListenerMap;

  constructor() {
    this._events = {};
  }

  /**
   * Adds a listener to the collection for a specified event.
   */
  public on(event: string, listener: EventHandler): Emitter {
    this._events[event] = this._events[event] || [];
    this._events[event].push(listener);
    return this;
  }

  /**
   * Adds a one time listener to the collection for a specified event. It will
   * execute only once.
   */
  public once(event: string, listener: EventHandler): Emitter {
    const that = this;

    function fn(this: Function) {
      that.off(event, fn);
      listener.apply(this, arguments);
    }

    (fn as any).listener = listener;
    this.on(event, fn);

    return this;
  }

  /**
   * Removes a listener from the collection for a specified event.
   */
  public off(event: string, listener: EventHandler): Emitter {
    const listeners = this._events[event];

    if (listeners !== undefined) {
      for (let j = 0; j < listeners.length; j += 1) {
        if (listeners[j] === listener || (listeners[j] as OnceEventHandler).listener === listener) {
          listeners.splice(j, 1);
          break;
        }
      }

      if (listeners.length === 0)
        this.removeAllListeners(event);
    }

    return this;
  }

  /**
   * Removes all listeners from the collection for a specified event.
   */
  public removeAllListeners(event?: string): Emitter {
    try {
      if (event)
        delete this._events[event];
      else
        this._events = {};

    } catch(e) {}

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
  public listeners(event: string): (EventHandler | OnceEventHandler)[] | undefined {
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
    if (listeners)
      return listeners.length;
    return 0;
  }

  /**
   * Execute each item in the listener collection in order with the specified
   * data.
   */
  public emit(..._: any[]): Emitter {
    const args = [].slice.call(arguments, 0); // converted to array
    const event = args.shift();
    let listeners = this._events[event];

    if (listeners !== undefined) {
      listeners = listeners.slice(0);
      const len = listeners.length;
      for (let i = 0; i < len; i += 1)
        (listeners[i] as Function).apply(this, args);
    }

    return this;
  }

}
