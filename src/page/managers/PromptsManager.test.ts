import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupLoadStylesheet } from '__test__/support/helpers/setup';
import { Browser } from 'src/shared/useragent/constants';
import * as detect from 'src/shared/useragent/detect';
import { PromptsManager } from './PromptsManager';

const getBrowserNameSpy = vi.spyOn(detect, 'getBrowserName');
const getBrowserVersionSpy = vi.spyOn(detect, 'getBrowserVersion');
const isMobileBrowserSpy = vi.spyOn(detect, 'isMobileBrowser');
const isTabletBrowserSpy = vi.spyOn(detect, 'isTabletBrowser');
const requiresUserInteractionSpy = vi.spyOn(detect, 'requiresUserInteraction');

describe('PromptsManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('_shouldForceSlidedownOverNative returns true on Chrome>=63 mobile/tablet', async () => {
    getBrowserNameSpy.mockReturnValue(Browser._Chrome);
    getBrowserVersionSpy.mockReturnValue(70);
    isMobileBrowserSpy.mockReturnValue(true);
    isTabletBrowserSpy.mockReturnValue(false);
    requiresUserInteractionSpy.mockReturnValue(false);

    const pm = new PromptsManager(OneSignal._context);
    expect(pm['_shouldForceSlidedownOverNative']()).toBe(true);
  });

  test('_shouldForceSlidedownOverNative returns true when requiresUserInteraction', async () => {
    getBrowserNameSpy.mockReturnValue(Browser._Firefox);
    getBrowserVersionSpy.mockReturnValue(100);
    isMobileBrowserSpy.mockReturnValue(false);
    isTabletBrowserSpy.mockReturnValue(false);
    requiresUserInteractionSpy.mockReturnValue(true);

    const pm = new PromptsManager(OneSignal._context);
    expect(pm['_shouldForceSlidedownOverNative']()).toBe(true);
  });

  test('event hooks install only once for slidedown path', async () => {
    await setupLoadStylesheet();
    const pm = new PromptsManager(OneSignal._context);

    // stub _createSlidedown to avoid side effects
    vi.spyOn(
      OneSignal._context._slidedownManager,
      '_createSlidedown',
    ).mockResolvedValue(undefined);
    const installSpy = vi.spyOn(pm, '_installEventHooksForSlidedown');

    await pm['_internalShowSlidedownPrompt']();
    await pm['_internalShowSlidedownPrompt']();
    expect(installSpy).toHaveBeenCalledTimes(1);
  });
});
