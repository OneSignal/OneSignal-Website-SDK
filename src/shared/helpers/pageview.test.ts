let getPageViewCount: typeof import('./pageview').getPageViewCount;
let incrementPageViewCount: typeof import('./pageview').incrementPageViewCount;

const resetModules = async () => {
  vi.resetModules();
  ({ getPageViewCount, incrementPageViewCount } = await import('./pageview'));
};

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  await resetModules();
});

test('should increment page view count once for current page', () => {
  expect(getPageViewCount()).toBe(0);

  incrementPageViewCount();
  incrementPageViewCount();

  expect(getPageViewCount()).toBe(1);
});

test('should increment page view count once for each page refresh', async () => {
  expect(getPageViewCount()).toBe(0);

  incrementPageViewCount();
  expect(getPageViewCount()).toBe(1);

  await resetModules();
  incrementPageViewCount();
  expect(getPageViewCount()).toBe(2);
});
