import { OSMinifiedNotificationPayload } from 'src/sw/models/OSMinifiedNotificationPayload';
import { merge } from '../helpers/general';
import { PartialDeep } from 'type-fest';

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

  return merge(defaultPayload, data);
};
