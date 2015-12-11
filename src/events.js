import log from 'loglevel';

export function triggerEvent (eventName, data) {
  if (typeof window === "undefined") {
    log.debug('Skipping triggering of event:', eventName, 'because we are running in a ServiceWorker context.');
    return;
  }
  var event = new CustomEvent(eventName, {
    bubbles: true, cancelable: true, details: data
  });
  window.dispatchEvent(event);
}