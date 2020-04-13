import Log from "../../libraries/Log";

export default class ServiceWorkerHelper {
  // Gets details on the service-worker (if any) that controls the current page
  static async getRegistration(): Promise<ServiceWorkerRegistration | null | undefined> {
    try {
      // location.href is used for <base> tag compatibility when it is set to a different origin
      return await navigator.serviceWorker.getRegistration(location.href);
    } catch (e) {
      // This could be null in an HTTP context or error if the user doesn't accept cookies
      Log.warn("[Service Worker Status] Error Checking service worker registration", location.href, e);
      return null;
    }
  }
}
