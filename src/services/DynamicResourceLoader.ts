export const enum ResourceType {
  Stylesheet,
  Script
}

export const enum ResourceLoadState {
  /**
   * The remote resource was fetched and loaded successfully.
   */
  Loaded,
  /**
   * The remote resource failed to be loaded (e.g. not found or network offline).
   */
  Failed
}

export class DynamicResourceLoader {

  private cache: Map<string, Promise<ResourceLoadState>>;

  constructor() {
    this.cache = new Map();
  }

  async loadSdkStylesheet(): Promise<ResourceLoadState> {
    return await this.loadIfNew(ResourceType.Stylesheet, new URL('https://cdn.onesignal.com/sdks/OneSignalSDKStyles.css'));
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Caches any previous load attempt's result and does not retry loading a previous resource.
   */
  async loadIfNew(type: ResourceType, url: URL): Promise<ResourceLoadState> {
    // Load for first time
    if (!this.cache.has(url.toString())) {
      this.cache.set(url.toString(), DynamicResourceLoader.load(type, url));
    }
    // Resource is loading; multiple calls can be made to this while the same resource is loading
    // Waiting on the Promise is what we want here
    return await this.cache.get(url.toString());
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Each call creates a new DOM element and fetch attempt.
   */
  static async load(type: ResourceType, url: URL): Promise<ResourceLoadState> {
    try {
      await new Promise((resolve, reject) => {
        switch (type) {
          case ResourceType.Script:
            var domElement: HTMLElement = document.createElement('script');
            domElement.setAttribute('type', 'text/javascript');
            domElement.setAttribute('async', 'async');
            domElement.setAttribute('src', url.toString());
            break;
          case ResourceType.Stylesheet:
            var domElement: HTMLElement = document.createElement('link');
            domElement.setAttribute('rel', 'stylesheet');
            domElement.setAttribute('href', url.toString());
            break;
        }
        domElement.onerror = reject;
        domElement.onload = resolve;
        document.querySelector('head').appendChild(domElement);
      });
      return ResourceLoadState.Loaded;
    } catch (e) {
      return ResourceLoadState.Failed;
    }
  }
}