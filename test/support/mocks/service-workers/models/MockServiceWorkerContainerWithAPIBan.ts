import { MockServiceWorkerContainer } from "./MockServiceWorkerContainer";

// This mock adds throws to APIs we want to ensure OneSignal never uses.
// The baned APIs are those that fit under assuming our ServiceWorker is:
//   * the only one
//   * in control of the page
// These are important to ensure the SDK compatibility with PWA and AMP pages as an example
//   of possible other ServiceWorkers.
export class MockServiceWorkerContainerWithAPIBan extends MockServiceWorkerContainer {
  constructor() {
    super();
  }

  get controller(): ServiceWorker | null {
    throw new Error("Don't use, assumes page control!");
  }

  getControllerForTests(): ServiceWorker | null {
    return this._controller;
  }

  static getControllerForTests(): ServiceWorker | null {
    return (navigator.serviceWorker as MockServiceWorkerContainerWithAPIBan).getControllerForTests();
  }

  get ready(): Promise<ServiceWorkerRegistration> {
    throw new Error("Don't use, assumes page control!");
  }

  async getRegistration(clientURL?: string): Promise<ServiceWorkerRegistration | undefined> {
    if (!clientURL) {
      throw new Error("Must include clientURL to get the SW of the scope we registered, not the current page being viewed.")
    }

    if (!clientURL.startsWith(location.origin)) {
      throw new Error("Must always use full URL as the HTML <base> tag can change the relative path.");
    }

    return super.getRegistration(clientURL);
  }

  set oncontrollerchange(_event: ((this: ServiceWorkerContainer, ev: Event) => any) | null) {
    throw new Error("Don't use, assumes page control!");
  }

  addEventListener<K extends keyof ServiceWorkerContainerEventMap>(type: K, _listener: (this: ServiceWorkerContainer, ev: ServiceWorkerContainerEventMap[K]) => any, _options?: boolean | AddEventListenerOptions): void {
    if (type == 'controllerchange') {
      throw new Error("Don't use, assumes page control!");
    }
  }
}
