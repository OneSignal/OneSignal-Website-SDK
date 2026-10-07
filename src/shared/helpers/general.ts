/**
 * Returns a promise for the setTimeout() method.
 * @param durationMs
 * @returns {Promise} Returns a promise that resolves when the timeout is complete.
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBaseUrl() {
  return location.origin;
}

export const getBrowserLanguage = () => {
  const languageTag = (navigator.language || 'en').toLowerCase();
  const languageSubtags = languageTag.replace(/-[a-z0-9]-.*/, '').split('-');
  if (languageSubtags[0] == 'zh') {
    if (languageSubtags.includes('hans')) return 'zh-Hans';
    if (languageSubtags.includes('hant')) return 'zh-Hant';

    return languageSubtags.includes('hk') ||
      languageSubtags.includes('mo') ||
      languageSubtags.includes('tw')
      ? 'zh-Hant'
      : 'zh-Hans';
  }

  // Return the language subtag (it can be three characters, so truncate it down to 2 just to be sure)
  return languageSubtags[0].substring(0, 2);
};
