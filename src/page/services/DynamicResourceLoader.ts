import { VERSION } from 'src/shared/utils/EnvVariables';
import SdkEnvironment from '../../shared/managers/SdkEnvironment';

export const ResourceType = {
  Stylesheet: 0,
  Script: 1,
} as const;

export type ResourceTypeValue =
  (typeof ResourceType)[keyof typeof ResourceType];

export const ResourceLoadState = {
  /**
   * The remote resource was fetched and loaded successfully.
   */
  Loaded: 0,
  /**
   * The remote resource failed to be loaded (e.g. not found or network offline).
   */
  Failed: 1,
} as const;

export type ResourceLoadStateValue =
  (typeof ResourceLoadState)[keyof typeof ResourceLoadState];

interface DynamicResourceLoaderCache {
  [key: string]: Promise<ResourceLoadStateValue>;
}

export class DynamicResourceLoader {
  private cache: DynamicResourceLoaderCache;

  constructor() {
    this.cache = {};
  }

  getCache(): DynamicResourceLoaderCache {
    // Cache is private; return a cloned copy just for testing
    return { ...this.cache };
  }

  async loadSdkStylesheet(): Promise<ResourceLoadStateValue> {
    const pathForEnv = SdkEnvironment.getOneSignalResourceUrlPath();
    const cssFileForEnv = SdkEnvironment.getOneSignalCssFileName();
    return this.loadIfNew(
      ResourceType.Stylesheet,
      new URL(`${pathForEnv}/${cssFileForEnv}?v=${VERSION}`),
    );
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Caches any previous load attempt's result and does not retry loading a previous resource.
   */
  async loadIfNew(
    type: ResourceTypeValue,
    url: URL,
  ): Promise<ResourceLoadStateValue> {
    // Load for first time
    if (!this.cache[url.toString()]) {
      this.cache[url.toString()] = DynamicResourceLoader.load(type, url);
    }
    // Resource is loading; multiple calls can be made to this while the same resource is loading
    // Waiting on the Promise is what we want here
    return this.cache[url.toString()];
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Each call creates a new DOM element and fetch attempt.
   */
  static async load(
    type: ResourceTypeValue,
    url: URL,
  ): Promise<ResourceLoadStateValue> {
    try {
      let domElement: HTMLElement;
      await new Promise((resolve, reject) => {
        switch (type) {
          case ResourceType.Script:
            domElement = document.createElement('script');
            domElement.setAttribute('type', 'text/javascript');
            domElement.setAttribute('async', 'async');
            domElement.setAttribute('src', url.toString());
            break;
          case ResourceType.Stylesheet:
            domElement = document.createElement('link');
            domElement.setAttribute('rel', 'stylesheet');
            domElement.setAttribute('href', url.toString());
            break;
        }
        domElement.onerror = reject;
        domElement.onload = resolve;
        document.querySelector('head')?.appendChild(domElement);
      });
      return ResourceLoadState.Loaded;
    } catch (e) {
      return ResourceLoadState.Failed;
    }
  }
}
