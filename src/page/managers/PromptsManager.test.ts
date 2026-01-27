import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupLoadStylesheet } from '__test__/support/helpers/setup';
import { DelayedPromptType } from 'src/shared/prompts/constants';
import type { DelayedPromptOptions } from 'src/shared/prompts/types';
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

  test('_internalShowDelayedPrompt forces slidedown when interaction required', async () => {
    requiresUserInteractionSpy.mockReturnValue(true);
    const pm = new PromptsManager(OneSignal._context);
    const nativeSpy = vi
      .spyOn(pm, '_internalShowNativePrompt')
      .mockResolvedValue(true);
    const slidedownSpy = vi
      .spyOn(pm, '_internalShowSlidedownPrompt')
      .mockResolvedValue(undefined);
    await pm._internalShowDelayedPrompt(DelayedPromptType._Native, 0);
    expect(nativeSpy).not.toHaveBeenCalled();

    expect(slidedownSpy).toHaveBeenCalled();
  });

  test('_spawnAutoPrompts triggers native when condition met and not forced', async () => {
    const pm = new PromptsManager(OneSignal._context);
    const getOptsSpy = vi
      .spyOn(pm, '_getDelayedPromptOptions' as keyof PromptsManager)
      .mockImplementation(
        (): DelayedPromptOptions => ({
          enabled: true,
          autoPrompt: true,
          timeDelay: 0,
          pageViews: 0,
        }),
      );
    const condSpy = vi
      .spyOn(pm, '_isPageViewConditionMet' as keyof PromptsManager)
      .mockResolvedValue(true);
    
    const delayedSpy = vi
      .spyOn(pm, '_internalShowDelayedPrompt')
      .mockResolvedValue(undefined);
    requiresUserInteractionSpy.mockReturnValue(false);
    getBrowserNameSpy.mockReturnValue(Browser._Chrome);
    getBrowserVersionSpy.mockReturnValue(62);
    
    await pm._spawnAutoPrompts();
    
    expect(getOptsSpy).toHaveBeenCalled();
    expect(condSpy).toHaveBeenCalled();
    expect(delayedSpy).toHaveBeenCalledWith(DelayedPromptType._Native, 0);
  });
});
