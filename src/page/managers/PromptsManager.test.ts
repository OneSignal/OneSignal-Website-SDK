import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupLoadStylesheet } from '__test__/support/helpers/setup';
import { vi } from 'vitest';
import { PromptsManager } from './PromptsManager';

vi.mock('src/shared/useragent/detect', async (importOriginal) => {
  const mod = await importOriginal<typeof import('src/shared/useragent/detect')>();
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
    TestEnvironment.initialize({ initOneSignalId: true, initUserAndPushSubscription: false });
    vi.restoreAllMocks();
  });

  test('_shouldForceSlidedownOverNative returns true on Chrome>=63 mobile/tablet', async () => {
    const detect = await import('src/shared/useragent/detect');
    (detect.getBrowserName as any).mockReturnValue('chrome');
    (detect.getBrowserVersion as any).mockReturnValue(70);
    (detect.isMobileBrowser as any).mockReturnValue(true);
    (detect.isTabletBrowser as any).mockReturnValue(false);
    (detect.requiresUserInteraction as any).mockReturnValue(false);

    const pm = new PromptsManager(OneSignal._context);
    expect(pm['_shouldForceSlidedownOverNative']()).toBe(true);
  });

  test('_shouldForceSlidedownOverNative returns true when requiresUserInteraction', async () => {
    const detect = await import('src/shared/useragent/detect');
    (detect.getBrowserName as any).mockReturnValue('Firefox');
    (detect.getBrowserVersion as any).mockReturnValue(100);
    (detect.isMobileBrowser as any).mockReturnValue(false);
    (detect.isTabletBrowser as any).mockReturnValue(false);
    (detect.requiresUserInteraction as any).mockReturnValue(true);

    const pm = new PromptsManager(OneSignal._context);
    expect(pm['_shouldForceSlidedownOverNative']()).toBe(true);
  });

  test('event hooks install only once for slidedown path', async () => {
    await setupLoadStylesheet();
    const pm = new PromptsManager(OneSignal._context);

    // stub _createSlidedown to avoid side effects
    vi.spyOn(OneSignal._context._slidedownManager as any, '_createSlidedown').mockResolvedValue(undefined);
    const installSpy = vi.spyOn(pm as any, '_installEventHooksForSlidedown');

    await pm['_internalShowSlidedownPrompt']();
    await pm['_internalShowSlidedownPrompt']();
    expect(installSpy).toHaveBeenCalledTimes(1);
  });
});


