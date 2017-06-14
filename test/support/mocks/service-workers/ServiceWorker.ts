import NotImplementedError from '../../../../src/errors/NotImplementedError';

export default class ServiceWorker implements EventTarget {
  scriptURL: string;
  state: ServiceWorkerState;

  postMessage(message: any, transfer: any = []): void {
  }

  addEventListener = () => { throw new NotImplementedError() };
  removeEventListener = () => { throw new NotImplementedError() };
  dispatchEvent = () => { throw new NotImplementedError() };
  // event
  // EventHandler onstatechange;
};
