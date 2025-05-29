import { DUMMY_PUSH_TOKEN } from '../constants';

export const getSubscriptionFn = vi
  .fn<() => Promise<Partial<PushSubscription>>>()
  .mockResolvedValue({
    endpoint: DUMMY_PUSH_TOKEN,
    // expirationTime: Date.now(),
    // options: {
    //   applicationServerKey: null,
    //   userVisibleOnly: true,
    // },
  });

export const getRegistrationFn = vi
  .fn<() => Promise<Partial<ServiceWorkerRegistration>>>()
  .mockResolvedValue({
    scope: '/',
    active: {
      scriptURL: 'http://localhost:3000/',
    },
    pushManager: {
      getSubscription: getSubscriptionFn,
      // permissionState: vi.fn().mockResolvedValue('granted'),
      // subscribe: vi.fn().mockResolvedValue({
      //   endpoint,
      // }),
    } satisfies PushManager,
    showNotification: vi.fn(),
  });

export class MockServiceWorker implements Partial<ServiceWorkerContainer> {
  getRegistration = getRegistrationFn;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    self.addEventListener(type, listener, options);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void {
    self.removeEventListener(type, listener, options);
  }
}
