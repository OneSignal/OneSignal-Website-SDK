import { ServiceWorker } from '../../../src/sw/serviceWorker/ServiceWorker';
import Database from '../../../src/shared/services/Database';

// suppress all internal logging
jest.mock('../../../src/shared/libraries/Log');

// mock dependencies
jest.mock('../../../src/shared/services/Database');
jest.mock('../../../src/shared/utils/AwaitableTimeout');

function chromeUserAgentDataBrands(): Array<{
  brand: string;
  version: string;
}> {
  return [
    { brand: 'Google Chrome', version: '129' },
    { brand: 'Not=A?Brand', version: '8' },
    { brand: 'Chromium', version: '129' },
  ];
}

describe('ServiceWorker', () => {
  // Define the ServiceWorker global scope type
  declare const self: ServiceWorkerGlobalScope;

  // Create a mock self object
  const mockSelf = {
    registration: {
      showNotification: jest.fn().mockResolvedValue(undefined),
    },
    clients: {
      openWindow: jest.fn(),
    }
  } as unknown as ServiceWorkerGlobalScope;

  beforeAll(() => {
    // Set up the global ServiceWorker scope
    Object.defineProperty(global, 'self', {
      value: mockSelf,
      writable: true
    });
  });

  describe('requiresMacOS15ChromiumAfterDisplayWorkaround', () => {
    test('navigator.userAgentData undefined', async () => {
      delete (navigator as any).userAgentData;
      expect(
        ServiceWorker.requiresMacOS15ChromiumAfterDisplayWorkaround(),
      ).toBe(false);
    });
    test('navigator.userAgentData null', async () => {
      (navigator as any).userAgentData = null;
      expect(
        ServiceWorker.requiresMacOS15ChromiumAfterDisplayWorkaround(),
      ).toBe(false);
    });

    test('navigator.userAgentData Chrome on Windows Desktop', async () => {
      (navigator as any).userAgentData = {
        mobile: false,
        platform: 'Windows',
        brands: chromeUserAgentDataBrands(),
      };
      expect(
        ServiceWorker.requiresMacOS15ChromiumAfterDisplayWorkaround(),
      ).toBe(false);
    });
    test('navigator.userAgentData Chrome on macOS', async () => {
      (navigator as any).userAgentData = {
        mobile: false,
        platform: 'macOS',
        brands: chromeUserAgentDataBrands(),
      };
      expect(
        ServiceWorker.requiresMacOS15ChromiumAfterDisplayWorkaround(),
      ).toBe(true);
    });
  });

  describe('API', () => {
    let mockSelf: any;

    beforeEach(() => {
      // Setup mock ServiceWorker global scope
      mockSelf = {
        registration: {
          showNotification: jest.fn().mockResolvedValue(undefined),
        },
        clients: {
          openWindow: jest.fn(),
        }
      };
      global.self = mockSelf;

      // Reset mocks between tests
      jest.clearAllMocks();
    });

    describe('onPushReceived', () => {
      beforeEach(() => {
        // Mock parseOrFetchNotifications to return a controlled payload
        jest.spyOn(ServiceWorker, 'parseOrFetchNotifications').mockResolvedValue([
          {
            title: 'Test Title',
            body: 'Test Body',
            icon: 'test-icon.png',
            custom: {
              i: 'test-uuid'
            }
          }
        ]);

        // Mock other required methods
        jest.spyOn(ServiceWorker, 'getAppId').mockResolvedValue('test-app-id');
        jest.spyOn(ServiceWorker, 'getPushSubscriptionId').mockResolvedValue('test-sub-id');
        
        // Mock Database
        (Database.putNotificationReceivedForOutcomes as jest.Mock).mockResolvedValue(undefined);
      });

      it('should not show notification for undefined payload', async () => {
        const mockPushEvent = {
          data: {
            json: () => undefined
          },
          waitUntil: jest.fn()
        };

        ServiceWorker.onPushReceived(mockPushEvent);
        expect(mockSelf.registration.showNotification).not.toHaveBeenCalled();
      });

      it('should not show notification for empty payload', async () => {
        const mockPushEvent = {
          data: {
            json: () => ({})
          },
          waitUntil: jest.fn()
        };

        ServiceWorker.onPushReceived(mockPushEvent);
        expect(mockSelf.registration.showNotification).not.toHaveBeenCalled();
      });

      it('should not show notification for non-OneSignal payload', async () => {
        const mockPushEvent = {
          data: {
            json: () => ({ title: 'Test Title' })
          },
          waitUntil: jest.fn()
        };

        ServiceWorker.onPushReceived(mockPushEvent);
        expect(mockSelf.registration.showNotification).not.toHaveBeenCalled();
      });

      it('should show notification with valid OneSignal payload', async () => {
        // Track the promise passed to waitUntil
        let waitUntilPromise: Promise<any>;
        
        const mockPushEvent = {
          data: {
            json: () => ({
              custom: {
                i: 'test-uuid'
              },
              title: 'Test Title'
            })
          },
          waitUntil: jest.fn((promise) => {
            waitUntilPromise = promise;
            return promise;
          })
        };

        // Call onPushReceived
        ServiceWorker.onPushReceived(mockPushEvent);
        
        // Wait for the waitUntil promise to complete
        await waitUntilPromise;

        expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
          'Test Title',
          expect.objectContaining({
            data: expect.objectContaining({
              id: expect.any(String)
            })
          })
        );
      });
    });

    describe('displayNotification', () => {
      it('should set requireInteraction to true when persistNotification is true', async () => {
        (Database.get as jest.Mock).mockResolvedValue({ value: true });

        await ServiceWorker.displayNotification({
          body: '',
          confirmDelivery: false,
          notificationId: 'test-id'
        });

        expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            requireInteraction: true
          })
        );
      });

      it('should set requireInteraction to true when persistNotification is undefined', async () => {
        (Database.get as jest.Mock).mockResolvedValue(undefined);

        await ServiceWorker.displayNotification({
          body: '',
          confirmDelivery: false,
          notificationId: 'test-id'
        });

        expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            requireInteraction: true
          })
        );
      });

      it('should set requireInteraction to true when persistNotification is "force"', async () => {
        (Database.get as jest.Mock).mockResolvedValue({ value: 'force' });

        await ServiceWorker.displayNotification({
          body: '',
          confirmDelivery: false,
          notificationId: 'test-id'
        });

        expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            requireInteraction: true
          })
        );
      });

      it('should set requireInteraction to false when persistNotification is false', async () => {
        (Database.get as jest.Mock).mockResolvedValue({ value: false });

        await ServiceWorker.displayNotification({
          body: '',
          confirmDelivery: false,
          notificationId: 'test-id'
        });

        expect(mockSelf.registration.showNotification).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            requireInteraction: false
          })
        );
      });
    });

    describe('onNotificationClicked', () => {
      beforeEach(() => {
        // Mock fetch for API calls
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      it('should send notification PUT request when clicked', async () => {
        const notificationId = 'test-notification-id';
        const mockNotificationEvent = {
          notification: {
            data: { id: notificationId },
            close: jest.fn()
          }
        };

        await ServiceWorker.onNotificationClicked(mockNotificationEvent);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/v1/notifications/${notificationId}`),
          expect.objectContaining({
            method: 'PUT',
            body: expect.any(String)
          })
        );
      });

      it('should execute webhooks when notification is clicked', async () => {
        const notificationId = 'test-notification-id';
        const mockNotificationEvent = {
          notification: {
            data: { id: notificationId },
            close: jest.fn()
          }
        };

        const executeWebhooksSpy = jest.spyOn(ServiceWorker, 'executeWebhooks');
        await ServiceWorker.onNotificationClicked(mockNotificationEvent);

        expect(executeWebhooksSpy).toHaveBeenCalledWith(
          'notification.clicked',
          expect.objectContaining({ id: notificationId })
        );
      });

      it('should open window when notification is clicked', async () => {
        const notificationId = 'test-notification-id';
        const mockNotificationEvent = {
          notification: {
            data: { id: notificationId },
            close: jest.fn()
          }
        };

        await ServiceWorker.onNotificationClicked(mockNotificationEvent);
        expect(mockSelf.clients.openWindow).toHaveBeenCalled();
      });
    });

    describe('sendConfirmedDelivery', () => {
      beforeEach(() => {
        // Mock fetch for API calls
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      it('should send confirmed delivery when feature flag is true', async () => {
        const notificationId = 'test-notification-id';
        
        await ServiceWorker.sendConfirmedDelivery({
          notificationId,
          confirmDelivery: true,
          body: ''
        });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/v1/notifications/${notificationId}/report_received`),
          expect.any(Object)
        );
      });

      it('should not send confirmed delivery when feature flag is false', async () => {
        const notificationId = 'test-notification-id';
        
        await ServiceWorker.sendConfirmedDelivery({
          notificationId,
          confirmDelivery: false,
          body: ''
        });

        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should include device_type in confirmed delivery request', async () => {
        const notificationId = 'test-notification-id';
        
        await ServiceWorker.sendConfirmedDelivery({
          notificationId,
          confirmDelivery: true,
          body: ''
        });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"device_type":5')
          })
        );
      });
    });
  });
});
