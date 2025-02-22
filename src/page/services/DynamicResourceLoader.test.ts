import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  DynamicResourceLoader,
  ResourceLoadState,
  ResourceType,
} from './DynamicResourceLoader';

describe('DynamicResourceLoader', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  test('should load sdk stylesheet', async () => {
    const cssURL =
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css';
    server.use(
      http.get(cssURL, () => {
        return HttpResponse.json('body { color: red; }');
      }),
    );

    const loader = new DynamicResourceLoader();
    const state = await loader.loadSdkStylesheet();

    expect(state).toBe(ResourceLoadState.Loaded);
    const stylesheets = document.head.querySelectorAll(
      'link[rel="stylesheet"]',
    );

    const url = `${cssURL}?v=2`;
    expect(stylesheets[0].getAttribute('href')).toBe(url);
    expect(loader.getCache()).toEqual({
      [url]: expect.any(Promise),
    });
  });

  test('should load sdk script', async () => {
    const scriptURL = 'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    server.use(
      http.get(scriptURL, () => {
        return HttpResponse.json('body { color: red; }');
      }),
    );
    const loader = new DynamicResourceLoader();
    const state = await loader.loadIfNew(
      ResourceType.Script,
      new URL(scriptURL),
    );
    expect(state).toBe(ResourceLoadState.Loaded);

    // should not load the same script again
    const state2 = await loader.loadIfNew(
      ResourceType.Script,
      new URL(scriptURL),
    );
    expect(state2).toBe(ResourceLoadState.Loaded);
  });

  test('should handle load error', async () => {
    console.error = vi.fn();
    const scriptURL = 'https://onesignal.com/sdks/web/v15/OneSignalSDK.page.js';
    server.use(
      http.get(scriptURL, () => {
        return HttpResponse.error();
      }),
    );

    const loader = new DynamicResourceLoader();

    const state = await loader.loadIfNew(
      ResourceType.Script,
      new URL(scriptURL),
    );
    expect(state).toBe(ResourceLoadState.Failed);
  });
});
