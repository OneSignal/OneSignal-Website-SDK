export default class ServiceWorker implements EventTarget {
  scriptURL: String;
  state: ServiceWorkerState;

  postMessage(message: any, transfer: any = []): void {

  }

  // event
  // EventHandler onstatechange;
};
