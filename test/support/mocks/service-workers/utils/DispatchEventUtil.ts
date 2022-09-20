import { EventHandler } from "../../../../../src/libraries/Emitter";

export class DispatchEventUtil {
  private listeners: Map<string, Array<EventHandler | EventListenerObject>> = new Map();

  public addEventListener(
    type: string,
    listener: EventListener | EventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (!listener)
      return;

    if (this.listeners.has(type)) {
      const handlers = this.listeners.get(type);
      if (!handlers)
        throw `Missing listeners for type '${type}'`;

      handlers.push(listener);
      this.listeners.set(type, handlers);
    }
    else
      this.listeners.set(type, [listener]);
  }

  public dispatchEvent(evt: Event): boolean {
    const handlers = this.listeners.get(evt.type);
    if (!handlers)
      return false;

    for (const handler of handlers) {
      const eventListenerObj = (<EventListenerObject>handler).handleEvent;
      if (eventListenerObj)
        eventListenerObj(evt);
      else
        (<EventHandler>handler)(evt);
    }
    return true;
  }

  public removeEventListener(
    type: string,
    listener?: EventListener | EventListenerObject | null,
    _options?: EventListenerOptions | boolean
  ): void {
    if (!listener)
      return;

    if (!this.listeners.has(type))
      return;

    const handlers = this.listeners.get(type);
    if (!handlers)
      throw `Missing listeners for type '${type}'`;

    const index = handlers.indexOf(listener);
    if (index > -1) {
      handlers.splice(index, 1);
      this.listeners.set(type, handlers);
    }
  }
}
