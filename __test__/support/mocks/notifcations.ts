import { OSMinifiedNotificationPayload } from 'src/sw/models/OSMinifiedNotificationPayload';
import { PartialDeep } from 'type-fest';
import deepmerge from 'deepmerge';

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
