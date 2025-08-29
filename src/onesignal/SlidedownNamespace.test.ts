import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Log from 'src/shared/libraries/Log';
import SlidedownNamespace from './SlidedownNamespace';

const warnSpy = vi.spyOn(Log, 'warn');

describe('Consent Required', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    OneSignal.setConsentRequired(true);
  });

  test('should not show slidedown if consent is required but not given', async () => {
    const slidedown = new SlidedownNamespace();
    await slidedown.promptPush();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');

    warnSpy.mockClear();
    await slidedown.promptPushCategories();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');

    warnSpy.mockClear();
    await slidedown.promptSms();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');

    warnSpy.mockClear();
    await slidedown.promptEmail();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');

    warnSpy.mockClear();
    await slidedown.promptSmsAndEmail();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
  });
});
