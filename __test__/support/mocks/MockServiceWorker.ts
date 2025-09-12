import { PUSH_TOKEN } from '../../constants';

export const mockPushSubscription: PushSubscription = {
  expirationTime: null,
  endpoint: PUSH_TOKEN,
  unsubscribe: vi.fn().mockResolvedValue(true),
  options: {
    applicationServerKey: null,
    userVisibleOnly: true,
  },
  toJSON: vi.fn(),
  getKey: vi.fn().mockReturnValue(null),
};

export const mockPushManager = {
  permissionState: vi.fn().mockResolvedValue('granted'),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
  getSubscription: vi
    .fn<() => Promise<PushSubscription>>()
    .mockResolvedValue(mockPushSubscription),
} satisfies PushManager;

const registration: Partial<ServiceWorkerRegistration> = {
  scope: '/',
  active: {
    scriptURL: 'http://localhost:3000/',
    onstatechange: vi.fn(),
    state: 'activated',
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onerror: vi.fn(),
  },
  pushManager: mockPushManager,
};

export const getRegistrationFn = vi
  .fn<() => Promise<Partial<ServiceWorkerRegistration>>>()
  .mockResolvedValue(registration);

export const registerFn = vi
  .fn<() => Promise<Partial<ServiceWorkerRegistration>>>()
  .mockResolvedValue(registration);

export class MockServiceWorker implements Partial<ServiceWorkerContainer> {
  // @ts-expect-error - using partial types
  getRegistration = getRegistrationFn;

  // @ts-expect-error - using partial types
  register = registerFn;

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
