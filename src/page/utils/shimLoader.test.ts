import * as useragentHelpers from 'src/shared/useragent/detect';
import { afterEach, describe, test, expect, vi } from 'vite-plus/test';

import { start } from './shimLoader';

const supportsSpy = vi
  .spyOn(useragentHelpers, 'isPushNotificationsSupported')
  .mockReturnValue(true);
const isIosSafariSpy = vi.spyOn(useragentHelpers, 'isIosSafari').mockReturnValue(false);

const locks = Object.getOwnPropertyDescriptor(navigator, 'locks')!;

describe('OneSignalShimLoader', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'locks', locks);
  });

  test('start should load the page script', () => {
    start();

    // should load the page script if supported
    const script = document.querySelector('script')!;
    expect(script.src).toContain('OneSignalSDK.page.es6.js');

    // should log message if not supported
    supportsSpy.mockReturnValue(false);
    isIosSafariSpy.mockReturnValue(true);
    vi.spyOn(console, 'info').mockImplementation(() => null);

    start();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'Incompatible browser. Try these steps: https://tinyurl.com/bdh2j9f7',
      ),
    );
  });

  test('does not load the page script without Web Locks', () => {
    supportsSpy.mockReturnValue(true);
    isIosSafariSpy.mockReturnValue(false);
    vi.spyOn(console, 'info').mockImplementation(() => null);
    document.head.innerHTML = '';
    // @ts-expect-error - removing locks to simulate an older browser
    delete navigator.locks;

    start();

    expect(document.querySelector('script')).toBeNull();
    expect(console.info).toHaveBeenCalledWith('Incompatible browser.');
  });
});
