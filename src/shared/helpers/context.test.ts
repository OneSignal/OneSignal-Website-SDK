import { describe, expect, test } from 'vite-plus/test';

import type { AppConfig } from '../config/types';
import type { ContextInterface } from '../context/types';
import { getServiceWorkerManager } from './context';

const buildContext = (path: string, serviceWorkerPath: string): ContextInterface =>
  ({
    _appConfig: {
      userConfig: { path, serviceWorkerPath },
    } as AppConfig,
  }) as ContextInterface;

const workerPathFor = (path: string, serviceWorkerPath: string): string => {
  const manager = getServiceWorkerManager(buildContext(path, serviceWorkerPath));
  return manager['_config'].workerPath._getFullPath();
};

describe('getServiceWorkerManager worker path', () => {
  test('joins default root path with worker file name', () => {
    expect(workerPathFor('/', 'OneSignalSDKWorker.js')).toBe('/OneSignalSDKWorker.js');
  });

  test('collapses a leading slash in serviceWorkerPath to avoid a protocol-relative URL', () => {
    expect(workerPathFor('/', '/OneSignalSDKWorker.js')).toBe('/OneSignalSDKWorker.js');
  });

  test('joins a nested path with a trailing slash', () => {
    expect(workerPathFor('/push/onesignal/', 'OneSignalSDKWorker.js')).toBe(
      '/push/onesignal/OneSignalSDKWorker.js',
    );
  });

  test('normalizes slashes on both sides of the join', () => {
    expect(workerPathFor('/push/', '/OneSignalSDKWorker.js')).toBe('/push/OneSignalSDKWorker.js');
  });
});
