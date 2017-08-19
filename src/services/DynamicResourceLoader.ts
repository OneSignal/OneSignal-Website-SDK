import * as objectAssign from 'object-assign';
import SdkEnvironment from '../managers/SdkEnvironment';
import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import Environment from '../Environment';

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

interface DynamicResourceLoaderCache {
  [key: string]: Promise<ResourceLoadState>;
}

export class DynamicResourceLoader {
  private cache: DynamicResourceLoaderCache;

  constructor() {
    this.cache = {};
  }

  getCache(): DynamicResourceLoaderCache {
    // Cache is private; return a cloned copy just for testing
    return objectAssign({}, this.cache);
  }

  async loadSdkStylesheet(): Promise<ResourceLoadState> {
    const originForEnv = SdkEnvironment.getOneSignalApiUrl().origin;
    return await this.loadIfNew(
      ResourceType.Stylesheet,
      new URL(`${originForEnv}/sdks/OneSignalSDKStyles.css?v=${Environment.getSdkStylesVersionHash()}`)
    );
  }

  async loadFetchPolyfill(): Promise<ResourceLoadState> {
    return await this.loadIfNew(
      ResourceType.Script,
      new URL('https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.3/fetch.min.js')
    );
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Caches any previous load attempt's result and does not retry loading a previous resource.
   */
  async loadIfNew(type: ResourceType, url: URL): Promise<ResourceLoadState> {
    // Load for first time
    if (!this.cache[url.toString()]) {
      this.cache[url.toString()] = DynamicResourceLoader.load(type, url);
    }
    // Resource is loading; multiple calls can be made to this while the same resource is loading
    // Waiting on the Promise is what we want here
    return await this.cache[url.toString()];
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
