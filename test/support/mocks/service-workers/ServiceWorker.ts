import NotImplementedError from '../../../../src/errors/NotImplementedError';

export default class ServiceWorker implements EventTarget {
  scriptURL: string;
  state: ServiceWorkerState;

  addEventListener = () => { throw new NotImplementedError(); };
  removeEventListener = () => { throw new NotImplementedError(); };
  dispatchEvent = () => { throw new NotImplementedError(); };
  postMessage = () => { throw new NotImplementedError(); };
  ready = new Promise((resolve) => { resolve(); })
}
