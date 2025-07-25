export const WindowEnvironmentKind = {
  /**
   * A service worker environment.
   */
  ServiceWorker: 'ServiceWorker',

  /**
   * The top-level frame to the "main" client's site.
   */
  Host: 'Host',
} as const;

export type WindowEnvironmentKindValue =
  (typeof WindowEnvironmentKind)[keyof typeof WindowEnvironmentKind];
