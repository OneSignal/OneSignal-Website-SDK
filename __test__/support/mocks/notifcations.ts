import deepmerge from 'deepmerge';
import type { OSMinifiedNotificationPayload } from 'src/sw/serviceWorker/types';
import type { PartialDeep } from 'type-fest';

export const mockOSMinifiedNotificationPayload = (
  data: PartialDeep<OSMinifiedNotificationPayload> = {},
): OSMinifiedNotificationPayload => {
  const defaultPayload = {
    alert: 'This is a test notification',
    custom: {
      a: 'test-action',
      i: 'test-id',
    },
    icon: 'https://example.com/icon.png',
    title: 'Test Notification',
  };

  return deepmerge(defaultPayload, data);
};
