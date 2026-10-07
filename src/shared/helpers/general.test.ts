import { afterEach, describe, expect, test, vi } from 'vite-plus/test';

import { getBrowserLanguage } from './general';

describe('getBrowserLanguage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    ['zh-Hans', 'zh-Hans'],
    ['zh-Hant', 'zh-Hant'],
    ['zh-Hans-HK', 'zh-Hans'],
    ['zh-Hant-CN', 'zh-Hant'],
    ['zh-CN', 'zh-Hans'],
    ['zh-SG', 'zh-Hans'],
    ['zh-MY', 'zh-Hans'],
    ['zh-TW', 'zh-Hant'],
    ['zh-HK', 'zh-Hant'],
    ['zh-MO', 'zh-Hant'],
    ['zh-Latn-TW', 'zh-Hant'],
    ['zh-TW-x-hans', 'zh-Hant'],
    ['zh-CN-x-tw', 'zh-Hans'],
    ['zh', 'zh-Hans'],
    ['en-US', 'en'],
    ['', 'en'],
  ])('normalizes %s to %s', (languageTag, expectedLanguage) => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(languageTag);

    expect(getBrowserLanguage()).toBe(expectedLanguage);
  });
});
