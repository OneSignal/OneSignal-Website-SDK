import { OneSignalShimLoader } from './OneSignalShimLoader';
import * as BrowserSupportsPush from './BrowserSupportsPush';

const supportsSpy = vi
  .spyOn(BrowserSupportsPush, 'isPushNotificationsSupported')
  .mockReturnValue(true);
const isIosSafariSpy = vi
  .spyOn(BrowserSupportsPush, 'isIosSafari')
  .mockReturnValue(false);

describe('OneSignalShimLoader', () => {
  test('start should load the page script', async () => {
    OneSignalShimLoader.start();

    // should load the page script if supported
    const script = document.querySelector('script')!;
    expect(script.src).toContain('OneSignalSDK.page.es6.js');

    // should log message if not supported
    supportsSpy.mockReturnValue(false);
    isIosSafariSpy.mockReturnValue(true);
    vi.spyOn(console, 'info').mockImplementation(() => null);

    OneSignalShimLoader.start();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'OneSignal: SDK is not compatible with this browser. To support iOS please install as a Web App.',
      ),
    );
  });
});
