import { EnumOutOfRangeArgumentError } from 'src/shared/errors/common';
import {
  BUILD_ORIGIN,
  BUILD_TYPE,
  IS_HTTPS,
  NO_DEV_PORT,
  VERSION,
} from 'src/shared/utils/EnvVariables';

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

const getOneSignalCssFileName = () => {
  const baseFileName = 'OneSignalSDK.page.styles.css';

  // using if statements to have better dead code elimination
  if (BUILD_TYPE === 'development') return `Dev-${baseFileName}`;

  if (BUILD_TYPE === 'staging') return `Staging-${baseFileName}`;

  if (BUILD_TYPE === 'production') return baseFileName;
};

const RESOURCE_HTTP_PORT = 4000;
const RESOURCE_HTTPS_PORT = 4001;

const getOneSignalResourceUrlPath = () => {
  const protocol = IS_HTTPS ? 'https' : 'http';
  const port = IS_HTTPS ? RESOURCE_HTTPS_PORT : RESOURCE_HTTP_PORT;
  let origin: string;

  // using if statements to have better dead code elimination
  if (BUILD_TYPE === 'development') {
    origin = NO_DEV_PORT
      ? `${protocol}://${BUILD_ORIGIN}`
      : `${protocol}://${BUILD_ORIGIN}:${port}`;
  } else if (BUILD_TYPE === 'staging') {
    origin = `https://${BUILD_ORIGIN}`;
  } else if (BUILD_TYPE === 'production') {
    origin = 'https://onesignal.com';
  } else {
    throw EnumOutOfRangeArgumentError('buildEnv');
  }
  return new URL(`${origin}/sdks/web/v16`);
};

export class DynamicResourceLoader {
  private _cache: DynamicResourceLoaderCache;

  constructor() {
    this._cache = {};
  }

  _getCache(): DynamicResourceLoaderCache {
    // Cache is private; return a cloned copy just for testing
    return { ...this._cache };
  }

  async _loadSdkStylesheet(): Promise<ResourceLoadStateValue> {
    const pathForEnv = getOneSignalResourceUrlPath();
    const cssFileForEnv = getOneSignalCssFileName();
    return this._loadIfNew(
      ResourceType.Stylesheet,
      new URL(`${pathForEnv}/${cssFileForEnv}?v=${VERSION}`),
    );
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Caches any previous load attempt's result and does not retry loading a previous resource.
   */
  async _loadIfNew(
    type: ResourceTypeValue,
    url: URL,
  ): Promise<ResourceLoadStateValue> {
    // Load for first time
    if (!this._cache[url.toString()]) {
      this._cache[url.toString()] = DynamicResourceLoader._load(type, url);
    }
    // Resource is loading; multiple calls can be made to this while the same resource is loading
    // Waiting on the Promise is what we want here
    return this._cache[url.toString()];
  }

  /**
   * Attempts to load a resource by adding it to the document's <head>.
   * Each call creates a new DOM element and fetch attempt.
   */
  static async _load(
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
