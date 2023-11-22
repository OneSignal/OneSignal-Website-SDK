import Log from '../libraries/Log';
import LocalStorage from '../utils/LocalStorage';

export class PageViewManager {
  private static SESSION_STORAGE_KEY_NAME = 'onesignal-pageview-count';
  private incrementedPageViewCount = false;

  getPageViewCount(): number {
    try {
      /*
        sessionStorage may be supported by the browser but may not be available
        as an API in incognito mode and in cases where the user disables
        third-party cookies on some browsers.
       */
      const pageViewCountStr = sessionStorage.getItem(
        PageViewManager.SESSION_STORAGE_KEY_NAME,
      );
      const pageViewCount = pageViewCountStr ? parseInt(pageViewCountStr) : 0;
      if (isNaN(pageViewCount)) {
        return 0;
      } else {
        return pageViewCount;
      }
    } catch (e) {
      /*
        If we're in incognito mode or sessionStorage is otherwise unsupported,
        pretend we're starting our first session.
       */
      return 0;
    }
  }

  setPageViewCount(sessionCount: number) {
    try {
      sessionStorage.setItem(
        PageViewManager.SESSION_STORAGE_KEY_NAME,
        sessionCount.toString(),
      );
    } catch (e) {
      /*
        If sessionStorage isn't available, don't error.
       */
    }
  }

  /**
   * Increments:
   *    - session pageView count AND
   *    - total pageView count
   *
   * at most once for the current page view.
   *
   * A flag is set to prevent incrementing the session count more than once for
   * the current page view. If the page is refreshed, this in-memory variable
   * will be automatically reset. Because of this, regardless of the number of
   * times this method is called on the current page view, the page view count
   * will only be incremented once.
   *
   * LocalStorage pageView count added for use in Delayed Prompts feature. This
   * pageView count persists even past sessions since it is saved to local stor-
   * age (as opposed to Session Storage which persists only for that tab)
   */
  incrementPageViewCount() {
    if (this.incrementedPageViewCount) {
      // For this method, we don't want to increment the session count more than
      // once per pageview
      return;
    }

    const newCountSingleTab = this.getPageViewCount() + 1;
    const newCountAcrossTabs = this.getLocalPageViewCount() + 1;

    this.setPageViewCount(newCountSingleTab);
    this.setLocalPageViewCount(newCountAcrossTabs);
    this.incrementedPageViewCount = true;

    Log.debug(`Incremented page view count: newCountSingleTab: ${newCountSingleTab},
      newCountAccrossTabs: ${newCountAcrossTabs}.`);
  }

  simulatePageNavigationOrRefresh() {
    this.incrementedPageViewCount = false;
  }

  /**
   * Returns true if this page is running OneSignal for the first time and has
   * not been navigated or refreshed.
   */
  isFirstPageView() {
    return this.getPageViewCount() === 1;
  }

  /**
   * Returns Page Views saved to Local Storage (Persists Longer than Single Session)
   */
  getLocalPageViewCount() {
    return LocalStorage.getLocalPageViewCount();
  }

  /**
   * Sets Page Views to Local Storage
   */
  setLocalPageViewCount(count: number) {
    LocalStorage.setLocalPageViewCount(count);
  }
}
