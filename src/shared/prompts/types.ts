import type { Categories } from 'src/page/tags/types';
import type { DelayedPromptType } from './constants';

export type DelayedPromptTypeValue =
  (typeof DelayedPromptType)[keyof typeof DelayedPromptType];

// app config prompts
export interface AppUserConfigPromptOptions {
  autoPrompt?: boolean;
  subscribeText?: string;
  showGraphic?: boolean;
  timeout?: number;
  autoAcceptTitle?: string;
  actionMessage?: string;
  exampleNotificationTitleDesktop?: string;
  exampleNotificationMessageDesktop?: string;
  exampleNotificationTitleMobile?: string;
  exampleNotificationMessageMobile?: string;
  exampleNotificationCaption?: string;
  acceptButton?: string;
  cancelButton?: string;
  acceptButtonText?: string; // legacy
  cancelButtonText?: string; // legacy
  showCredit?: string;
  native?: DelayedPromptOptions;
  slidedown?: SlidedownOptions;
  fullscreen?: FullscreenPermissionMessageOptions;
  customlink?: AppUserConfigCustomLinkOptions;
}

interface BasePromptOptions {
  enabled: boolean;
}
export interface DelayedPromptOptions extends BasePromptOptions {
  autoPrompt?: boolean;
  timeDelay?: number;
  pageViews?: number;
}

export interface SlidedownPromptOptions {
  type: DelayedPromptTypeValue;
  text: SlidedownTextOptions;
  autoPrompt: boolean;
  icon?: string | null; // url
  delay?: SlidedownDelayOptions;
  categories?: TagCategory[];
}

export interface SlidedownOptions {
  prompts: SlidedownPromptOptions[];
}

// deprecated. TO DO: remove after server config version 2 fully migrated
export interface SlidedownOptionsVersion1 {
  enabled: boolean;
  autoPrompt: boolean;
  pageViews?: number;
  timeDelay?: number;
  acceptButtonText?: string;
  acceptButton?: string;
  cancelButtonText?: string;
  cancelButton?: string;
  actionMessage: string;
  customizeTextEnabled: boolean;
  categories?: Categories;
}

export interface SlidedownTextOptions {
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  negativeUpdateButton?: string;
  positiveUpdateButton?: string;
  updateMessage?: string;
  confirmMessage?: string;
  smsLabel?: string;
  emailLabel?: string;
}

export interface SlidedownDelayOptions {
  pageViews: number;
  timeDelay: number;
}

export interface TagCategory {
  tag: string;
  label: string;
  checked?: boolean;
}

export interface FullscreenPermissionMessageOptions
  extends DelayedPromptOptions {
  autoAcceptTitle?: string;
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  title: string;
  message: string;
  caption: string;
}

export interface AppUserConfigCustomLinkOptions extends BasePromptOptions {
  style?: CustomLinkStyle;
  size?: CustomLinkSize;
  unsubscribeEnabled?: boolean;
  text?: {
    explanation?: string;
    subscribe?: string;
    unsubscribe?: string;
  };
  color?: {
    button?: string;
    text?: string;
  };
}

export type CustomLinkStyle = 'button' | 'link';

export type CustomLinkSize = 'large' | 'medium' | 'small';

export type BellSize = 'small' | 'medium' | 'large';

export type BellPosition = 'bottom-left' | 'bottom-right';

export interface BellText {
  'tip.state.unsubscribed': string;
  'tip.state.subscribed': string;
  'tip.state.blocked': string;
  'message.prenotify': string;
  'message.action.subscribed': string;
  'message.action.subscribing': string;
  'message.action.resubscribed': string;
  'message.action.unsubscribed': string;
  'dialog.main.title': string;
  'dialog.main.button.subscribe': string;
  'dialog.main.button.unsubscribe': string;
  'dialog.blocked.title': string;
  'dialog.blocked.message': string;
}

// server app config prompts
export interface ServerAppPromptConfig {
  native: {
    enabled: boolean;
    autoPrompt: boolean;
    pageViews?: number;
    timeDelay?: number;
  };
  bell: {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
    color: {
      main: string;
      accent: string;
    };
    dialog: {
      main: {
        title: string;
        subscribeButton: string;
        unsubscribeButton: string;
      };
      blocked: {
        title: string;
        message: string;
      };
    };
    offset: {
      left: number;
      right: number;
      bottom: number;
    };
    message: {
      subscribing: string;
      unsubscribing: string;
    };
    tooltip: {
      blocked: string;
      subscribed: string;
      unsubscribed: string;
    };
    location: 'bottom-left' | 'bottom-right';
    hideWhenSubscribed: boolean;
    customizeTextEnabled: boolean;
  };
  slidedown: SlidedownOptions;
  fullscreen: {
    title: string;
    caption: string;
    enabled: boolean;
    message: string;
    acceptButton: string;
    cancelButton: string;
    actionMessage: string;
    autoAcceptTitle: string;
    customizeTextEnabled: boolean;
  };
  customlink: {
    enabled: boolean;
    style: CustomLinkStyle;
    size: CustomLinkSize;
    unsubscribeEnabled: boolean;
    text: {
      explanation: string;
      subscribe: string;
      unsubscribe: string;
    };
    color: {
      button: string;
      text: string;
    };
  };
}
