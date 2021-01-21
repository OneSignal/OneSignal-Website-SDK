interface SubscriptionPopupHostOptions {
  /**
   * Describes whether the first screen of the popup (asking users No Thanks or
   * Continue) is shown.
   *
   * If true, this screen is skipped, and users see "Click Allow to receive
   * notifications" with the prompt auto-appearing.
   *
   * If false or undefined, users see the first screen.
   */
  autoAccept?: boolean;
}

interface PromptOptionsPostData {
  autoAcceptTitle?: string;
  siteName?: string;
  subscribeText?: string;
  showGraphic?: boolean;
  actionMessage?: string;
  exampleNotificationTitle?: string;
  exampleNotificationMessage?: string;
  exampleNotificationCaption?: string;
  acceptButton?: string;
  cancelButton?: string;
  timeout?: number;
}

interface PostData extends PromptOptionsPostData, SubscriptionPopupHostOptions {
  promptType: "popup" | "modal";
  parentHostname: string;
}
