import { Categories } from './Tags';

export enum DelayedPromptType {
  Native = "native",
  Slidedown = "slidedown"
}

interface BasePromptOptions {
  enabled: boolean;
}

export interface DelayedPromptOptions extends BasePromptOptions {
  autoPrompt?: boolean;
  timeDelay?: number;
  pageViews?: number;
}

export interface CategorySlidedownOptions extends DelayedPromptOptions {
  categories?: Categories;
}

export interface SlidedownPermissionMessageOptions extends CategorySlidedownOptions {
  actionMessage: string;
  acceptButtonText: string;
  cancelButtonText: string;
}

export interface FullscreenPermissionMessageOptions extends DelayedPromptOptions {
  autoAcceptTitle?: string;
  actionMessage: string;
  acceptButton: string;
  cancelButton: string;
  title: string;
  message: string;
  caption: string;
}

export type CustomLinkStyle = "button" | "link";
export type CustomLinkSize = "large" | "medium" | "small";

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
  acceptButtonText?: string;
  cancelButtonText?: string;
  showCredit?: string;
  native?: DelayedPromptOptions;
  slidedown?: SlidedownPermissionMessageOptions;
  fullscreen?: FullscreenPermissionMessageOptions;
  customlink?: AppUserConfigCustomLinkOptions;
}

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

export interface AppUserConfigNotifyButton {
  options?: AppUserConfigNotifyButton;
  enable: boolean;
  displayPredicate?: Function | null | undefined;
  size?: BellSize;
  position?: BellPosition;
  offset?: { bottom: string; left: string; right: string };
  prenotify?: boolean;
  showCredit?: boolean;
  colors?: {
    'circle.background': string;
    'circle.foreground': string;
    'badge.background': string;
    'badge.foreground': string;
    'badge.bordercolor': string;
    'pulse.color': string;
    'dialog.button.background.hovering': string;
    'dialog.button.background.active': string;
    'dialog.button.background': string;
    'dialog.button.foreground': string;
  };
  text: BellText;
  theme?: string;
  showLauncherAfter?: number;
  showBadgeAfter?: number;
}
