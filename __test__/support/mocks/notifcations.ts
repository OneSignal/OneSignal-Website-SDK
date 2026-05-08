import type { OSMinifiedNotificationPayload } from 'src/sw/serviceWorker/types';
import type { PartialDeep } from 'type-fest';

import { deepMerge } from '../helpers/general';

export const mockOSMinifiedNotificationPayload = (
  data: PartialDeep<OSMinifiedNotificationPayload> = {},
): OSMinifiedNotificationPayload => {
  const defaultPayload: OSMinifiedNotificationPayload = {
    alert: 'This is a test notification',
    custom: {
      a: 'test-action',
      i: 'test-id',
    },
    icon: 'https://example.com/icon.png',
    title: 'Test Notification',
  };

  return deepMerge(defaultPayload, data);
};
