import { NotificationType } from 'src/shared/subscriptions/constants';

export const APP_ID = '34fcbe85-278d-4fd2-a4ec-0f80e95072c5';

export const PUSH_TOKEN = 'https://fcm.googleapis.com/fcm/send/01010101010101';
export const PUSH_TOKEN_2 =
  'https://fcm.googleapis.com/fcm/send/01010101010102';

export const ONESIGNAL_ID = '1111111111-2222222222-3333333333';
export const ONESIGNAL_ID_2 = '2222222222-3333333333-4444444444';
export const EXTERNAL_ID = 'rodrigo';
export const EXTERNAL_ID_2 = 'iryna';
export const SUB_ID = '4444444444-5555555555-6666666666';
export const SUB_ID_2 = '7777777777-8888888888-9999999999';
export const SUB_ID_3 = '1010101010-1111111111-2222222222';

export const DEVICE_OS = '56';

export const BASE_IDENTITY = {
  properties: {
    language: 'en',
    timezone_id: 'America/Los_Angeles',
  },
  refresh_device_metadata: true,
};

export const BASE_SUB = {
  device_model: '',
  device_os: '56',
  enabled: true,
  notification_types: NotificationType._Subscribed,
  sdk: __VERSION__,
};
