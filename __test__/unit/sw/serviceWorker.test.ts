import { ServiceWorker } from '../../../src/sw/serviceWorker/ServiceWorker';

// suppress all internal logging
jest.mock('../../../src/shared/libraries/Log');

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
});
