export class Event {
  constructor() {
    this.promise = null;
    this.response = null;
  }

  waitUntil(promise) {
    this.promise = promise;
  }
}

export class FetchEvent extends Event {
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
  constructor(args) {
    super();
    Object.assign(this, args);
  }
}

export class NotificationEvent extends Event {
  constructor(args) {
    super();
    this.notification = args;
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

async function handleEvent(name, args, callback) {
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