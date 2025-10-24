import * as useragentHelpers from 'src/shared/useragent/detect';
import { start } from './shimLoader';

const supportsSpy = vi
  .spyOn(useragentHelpers, 'isPushNotificationsSupported')
  .mockReturnValue(true);
const isIosSafariSpy = vi
  .spyOn(useragentHelpers, 'isIosSafari')
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
