import * as BrowserSupportsPush from './BrowserSupportsPush';
import { start } from './OneSignalShimLoader';

const supportsSpy = vi
  .spyOn(BrowserSupportsPush, 'isPushNotificationsSupported')
  .mockReturnValue(true);
const isIosSafariSpy = vi
  .spyOn(BrowserSupportsPush, 'isIosSafari')
  .mockReturnValue(false);

describe('OneSignalShimLoader', () => {
  test('start should load the page script', async () => {
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
});
