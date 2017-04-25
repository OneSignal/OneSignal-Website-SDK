import PushMessageData from "../models/PushMessageData";
import { Notification } from "../../../../../src/models/Notification";

export class Event {
  public promise: Promise<any>;
  public response: any;

  constructor() {
    this.promise = null;
    this.response = null;
  }

  waitUntil(promise) {
    this.promise = promise;
  }
}

export class FetchEvent extends Event {
  public request: any;

  constructor(args) {
    super();
    if (typeof args === 'string') {
      this.request = { url: '/test' };
    } else if (args && typeof args === 'object') {
      this.request = args;
    }
  }
  respondWith(response) {
    this.promise = response;
  }
}

export class PushEvent extends Event {

  constructor(
    public data?: PushMessageData
  ) {
    super();
  }

  static createMockWithPayload(
    notification: Notification = Notification.createMock()
  ): PushEvent {
    return new PushEvent(new PushMessageData(JSON.stringify({
      "custom": {
        "i": "ab2e3893-b172-4a5d-9051-ed5d10303d8a",
        "u": notification.url
      },
      "icon": notification.icon,
      "alert": notification.body,
      "title": notification.title
    })));
  }
}

export class NotificationEvent extends Event {
  constructor(
    public notification?: Notification
  ) {
    super();
  }
}

export function createEvent(event, args) {
  switch (event) {
    case 'fetch':
      return new FetchEvent(args);
    case 'notificationclick':
      return new NotificationEvent(args);
    case 'push':
      return new PushEvent(args);
    default:
      return new Event();
  }
}

export async function handleEvent(name, args, callback) {
  const event = createEvent(name, args);
  callback(event);
  return await event.promise;
}

export async function handleEvents(name, args, listeners) {
  if (listeners.length === 1) {
    return handleEvent(name, args, listeners[0]);
  }
  return await Promise.all(
    listeners.map(callback => handleEvent(name, args, callback))
  );
}