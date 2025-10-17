import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  DynamicResourceLoader,
  ResourceLoadState,
  ResourceType,
} from './DynamicResourceLoader';

describe('DynamicResourceLoader', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Clean up all mocks after each test
  });

  // Helper function to mock successful loading
  const mockSuccessfulLoading = () => {
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.head?.appendChild;

    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        const element = originalCreateElement.call(
          document,
          tagName,
        ) as HTMLElement;

        // Store handlers on the element
        let onloadHandler: ((event: Event) => void) | null = null;
        let onerrorHandler: ((event: Event) => void) | null = null;

        Object.defineProperty(element, 'onload', {
          set: (handler) => {
            onloadHandler = handler;
          },
          get: () => onloadHandler,
        });

        Object.defineProperty(element, 'onerror', {
          set: (handler) => {
            onerrorHandler = handler;
          },
          get: () => onerrorHandler,
        });

        return element;
      },
    );

    if (originalAppendChild) {
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const result = originalAppendChild.call(document.head, node);

        // Trigger onload after element is added
        setImmediate(() => {
          const element = node as any;
          if (element.onload) {
            element.onload(new Event('load'));
          }
        });

        return result;
      });
    }
  };

  // Helper function to mock failed loading
  const mockFailedLoading = () => {
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.head?.appendChild;

    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        const element = originalCreateElement.call(
          document,
          tagName,
        ) as HTMLElement;

        let onloadHandler: ((event: Event) => void) | null = null;
        let onerrorHandler: ((event: Event) => void) | null = null;

        Object.defineProperty(element, 'onload', {
          set: (handler) => {
            onloadHandler = handler;
          },
          get: () => onloadHandler,
        });

        Object.defineProperty(element, 'onerror', {
          set: (handler) => {
            onerrorHandler = handler;
          },
          get: () => onerrorHandler,
        });

        return element;
      },
    );

    if (originalAppendChild) {
      vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
        const result = originalAppendChild.call(document.head, node);

        // Trigger onerror after element is added
        setImmediate(() => {
          const element = node as any;
          if (element.onerror) {
            element.onerror(new Event('error'));
          }
        });

        return result;
      });
    }
  };

  test('should load sdk stylesheet', async () => {
    mockSuccessfulLoading(); // Set up success mock for this test only

    const cssURL =
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css';
    server.use(
      http.get(cssURL, () => {
        return HttpResponse.text('body { color: red; }');
      }),
    );

    const loader = new DynamicResourceLoader();
    const state = await loader._loadSdkStylesheet();

    expect(state).toBe(ResourceLoadState._Loaded);
    const stylesheets = document.head.querySelectorAll(
      'link[rel="stylesheet"]',
    );
    const url = `${cssURL}?v=${__VERSION__}`;
    expect(stylesheets[0].getAttribute('href')).toBe(url);
    expect(loader._getCache()).toEqual({
      [url]: expect.any(Promise),
    });
  });

  test('should load sdk script', async () => {
    mockSuccessfulLoading(); // Set up success mock for this test only

    const scriptURL = 'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    server.use(
      http.get(scriptURL, () => {
        return HttpResponse.text('');
      }),
    );

    const loader = new DynamicResourceLoader();
    const state = await loader._loadIfNew(
      ResourceType._Script,
      new URL(scriptURL),
    );
    expect(state).toBe(ResourceLoadState._Loaded);

    // should not load the same script again
    const state2 = await loader._loadIfNew(
      ResourceType._Script,
      new URL(scriptURL),
    );
    expect(state2).toBe(ResourceLoadState._Loaded);
  });

  test('should handle load error', async () => {
    mockFailedLoading(); // Set up failure mock for this test only

    console.error = vi.fn();
    const scriptURL = 'https://onesignal.com/sdks/web/v15/OneSignalSDK.page.js';
    server.use(
      http.get(scriptURL, () => {
        return HttpResponse.error();
      }),
    );

    const loader = new DynamicResourceLoader();
    const state = await loader._loadIfNew(
      ResourceType._Script,
      new URL(scriptURL),
    );
    expect(state).toBe(ResourceLoadState._Failed);
  });
});
