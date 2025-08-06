import type { InvalidChannelInputField } from './constants';

export type InvalidChannelInputFieldValue =
  (typeof InvalidChannelInputField)[keyof typeof InvalidChannelInputField];
