import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import NotImplementedError from "../../../../src/errors/NotImplementedError";

export class ServiceWorkerContainer implements EventTarget {
    private _serviceWorkerRegistration: ServiceWorkerRegistration;
    private _resolveReadyPromise: Function;
    private _readyPromise: Promise<ServiceWorkerRegistration>;
    private _serviceWorker: ServiceWorker;

    readonly controller: ServiceWorker;

    get ready(): Promise<ServiceWorkerRegistration> {
        return this._readyPromise;
    }

    constructor() {
        this._serviceWorkerRegistration = null;
        this._readyPromise = new Promise(resolve => this._resolveReadyPromise = resolve);
    }

    async register(scriptURL: string, options?: RegistrationOptions): Promise<ServiceWorkerRegistration> {
        this._serviceWorkerRegistration = new ServiceWorkerRegistration();
        this._serviceWorker = new ServiceWorker();
        (this._serviceWorker as any).scriptURL = scriptURL;
        (this._serviceWorker as any).state = "activated";
        this._serviceWorkerRegistration.active = this._serviceWorker;
        this._resolveReadyPromise(this._serviceWorkerRegistration);
        return await this._serviceWorkerRegistration;
    }

    async getRegistration(clientURL: string = ""): Promise<any> {
        return await this._serviceWorkerRegistration;
    }

    async getRegistrations(): Promise<ServiceWorkerRegistration[]> {
      if (this._serviceWorkerRegistration) {
        return [this._serviceWorkerRegistration];
      } else {
        return [];
      }
    }

    addEventListener = () => { throw new NotImplementedError() };
    removeEventListener = () => { throw new NotImplementedError() };
    dispatchEvent = () => { throw new NotImplementedError() };
    // EventHandler oncontrollerchange;
    // EventHandler onmessage; // event.source of message events is ServiceWorker object
    // EventHandler onmessageerror;
};
