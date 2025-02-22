import { PageViewManager } from './PageViewManager';

describe('PageViewManager', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('should increment page view count once for current page', () => {
    const pageViewManager = new PageViewManager();
    expect(pageViewManager.getPageViewCount()).toBe(0);

    pageViewManager.incrementPageViewCount();
    pageViewManager.incrementPageViewCount();
    pageViewManager.incrementPageViewCount();

    expect(pageViewManager.getPageViewCount()).toBe(1);
  });

  test('should increment page view count once for each page refresh', () => {
    const pageViewManager = new PageViewManager();
    expect(pageViewManager.getPageViewCount()).toBe(0);

    pageViewManager.incrementPageViewCount();
    pageViewManager.simulatePageNavigationOrRefresh();
    expect(pageViewManager.getPageViewCount()).toBe(1);

    pageViewManager.incrementPageViewCount();
    pageViewManager.simulatePageNavigationOrRefresh();
    expect(pageViewManager.getPageViewCount()).toBe(2);
  });
});
