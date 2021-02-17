import Log from "../../libraries/Log";

export default class ServiceWorkerUtilHelper {
  // Get the service worker based on a scope as a domain can have none to many service workers.
  static async getRegistration(scope: string): Promise<ServiceWorkerRegistration | null | undefined> {
    try {
      return await navigator.serviceWorker.getRegistration(scope);
    } catch (e) {
      // This could be null in an HTTP context or error if the user doesn't accept cookies
      Log.warn("[Service Worker Status] Error Checking service worker registration", scope, e);
      return null;
    }
  }

  // A ServiceWorkerRegistration will have a ServiceWorker in 1 of 3 states, get which ever is available.
  static getAvailableServiceWorker(registration: ServiceWorkerRegistration): ServiceWorker {
    const availableWorker = registration.active || registration.installing || registration.waiting;
    // This should never throw unless ServiceWorkerRegistration is pointing to a worker that is completely gone.
    if (!availableWorker) {
      throw new Error("Could not find an available ServiceWorker instance!");
    }
    return availableWorker;
  }
}
