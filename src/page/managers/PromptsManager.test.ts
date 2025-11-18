import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupLoadStylesheet } from '__test__/support/helpers/setup';
import { Browser } from 'src/shared/useragent/constants';
import { PromptsManager } from './PromptsManager';

vi.mock('src/shared/useragent/detect', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('src/shared/useragent/detect')>();
  return {
    ...mod,
    getBrowserName: vi.fn(),
    getBrowserVersion: vi.fn(),
    isMobileBrowser: vi.fn(),
    isTabletBrowser: vi.fn(),
    requiresUserInteraction: vi.fn(),
  };
});

describe('PromptsManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('_shouldForceSlidedownOverNative returns true on Chrome>=63 mobile/tablet', async () => {
    const detect = await import('src/shared/useragent/detect');
    vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Chrome);
    vi.spyOn(detect, 'getBrowserVersion').mockReturnValue(70);
    vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(true);
    vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
    vi.spyOn(detect, 'requiresUserInteraction').mockReturnValue(false);

    const pm = new PromptsManager(OneSignal._context);
    expect(pm['_shouldForceSlidedownOverNative']()).toBe(true);
  });

  test('_shouldForceSlidedownOverNative returns true when requiresUserInteraction', async () => {
    const detect = await import('src/shared/useragent/detect');
    vi.spyOn(detect, 'getBrowserName').mockReturnValue(Browser._Firefox);
    vi.spyOn(detect, 'getBrowserVersion').mockReturnValue(100);
    vi.spyOn(detect, 'isMobileBrowser').mockReturnValue(false);
    vi.spyOn(detect, 'isTabletBrowser').mockReturnValue(false);
    vi.spyOn(detect, 'requiresUserInteraction').mockReturnValue(true);

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
