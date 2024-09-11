import Log from '../../shared/libraries/Log';

export default class ServiceWorkerUtilHelper {
  // Get the service worker based on a relative scope.
  // A  relative scope is required as a domain can have none to many service workers installed.
  static async getRegistration(
    scope: string,
  ): Promise<ServiceWorkerRegistration | undefined> {
    try {
      // Adding location.origin to negate the effects of a possible <base> html tag the page may have.
      const url = location.origin + scope;
      return await navigator.serviceWorker.getRegistration(url);
    } catch (e) {
      // This could be null in an HTTP context or error if the user doesn't accept cookies
      Log.warn(
        '[Service Worker Status] Error Checking service worker registration',
        scope,
        e,
      );
      return undefined;
    }
  }

  // A ServiceWorkerRegistration will have a ServiceWorker in 1 of 3 states, get which ever is available.
  static getAvailableServiceWorker(
    registration: ServiceWorkerRegistration,
  ): ServiceWorker | null {
    const availableWorker =
      registration.active || registration.installing || registration.waiting;
    // This never be null unless ServiceWorkerRegistration is pointing to a worker that is completely gone.
    if (!availableWorker) {
      Log.warn('Could not find an available ServiceWorker instance!');
    }
    return availableWorker;
  }

  // Allows waiting for the service worker registration to become active.
  // Some APIs, like registration.pushManager.subscribe, required it be active
  // otherwise it throws.
  static waitUntilActive(
    registration: ServiceWorkerRegistration,
  ): Promise<void> {
    return new Promise((resolve) => {
      // IMPORTANT: checking non-active instances first,
      // otherwise the 'statechange' event could be missed.
      const inactiveWorker = registration.installing || registration.waiting;
      if (inactiveWorker) {
        inactiveWorker.addEventListener('statechange', () => {
          Log.debug(
            'OneSignal Service Worker state changed:',
            inactiveWorker.state,
          );
          if (registration.active) {
            resolve();
          }
        });
      }
      if (registration.active) resolve();
    });
  }
}
