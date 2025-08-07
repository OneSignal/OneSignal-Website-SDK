let getPageViewCount: typeof import('./pageview').getPageViewCount;
let incrementPageViewCount: typeof import('./pageview').incrementPageViewCount;
let simulatePageNavigationOrRefresh: typeof import('./pageview').simulatePageNavigationOrRefresh;

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  vi.resetModules();

  ({
    getPageViewCount,
    incrementPageViewCount,
    simulatePageNavigationOrRefresh,
  } = await import('./pageview'));
});

test('should increment page view count once for current page', () => {
  expect(getPageViewCount()).toBe(0);

  incrementPageViewCount();
  incrementPageViewCount();

  expect(getPageViewCount()).toBe(1);
});

test('should increment page view count once for each page refresh', () => {
  expect(getPageViewCount()).toBe(0);

  incrementPageViewCount();
  simulatePageNavigationOrRefresh();
  expect(getPageViewCount()).toBe(1);

  incrementPageViewCount();
  simulatePageNavigationOrRefresh();
  expect(getPageViewCount()).toBe(2);
});
