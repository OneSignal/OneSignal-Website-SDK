import OneSignalError from './OneSignalError';

export const SdkInitErrorKind = {
  InvalidAppId: 0,
  AppNotConfiguredForWebPush: 1,
  WrongSiteUrl: 2,
  MultipleInitialization: 3,
  MissingSafariWebId: 4,
  Unknown: 5,
} as const;

const reverseSdkInitErrorKind = Object.fromEntries(
  Object.entries(SdkInitErrorKind).map(([key, value]) => [value, key]),
);

export type SdkInitErrorKindValue =
  (typeof SdkInitErrorKind)[keyof typeof SdkInitErrorKind];

export class SdkInitError extends OneSignalError {
  reason!: string;

  constructor(
    reason: SdkInitErrorKindValue,
    extra?: {
      siteUrl: string;
    },
  ) {
    let errorMessage;
    switch (reason) {
      case SdkInitErrorKind.InvalidAppId:
        errorMessage =
          'OneSignal: This app ID does not match any existing app. Double check your app ID.';
        break;
      case SdkInitErrorKind.AppNotConfiguredForWebPush:
        errorMessage =
          `OneSignal: This app ID does not have any web platforms enabled. Double check your app` +
          ` ID, or see step 1 on our setup guide (https://tinyurl.com/2x5jzk83).`;
        break;
      case SdkInitErrorKind.WrongSiteUrl:
        if (extra && extra.siteUrl) {
          errorMessage =
            `OneSignal: This web push config can only be used on ${
              new URL(extra.siteUrl).origin
            }.` + ` Your current origin is ${location.origin}.`;
        } else {
          errorMessage =
            'OneSignal: This web push config can not be used on the current site.';
        }
        break;
      case SdkInitErrorKind.MultipleInitialization:
        errorMessage =
          `OneSignal: The OneSignal web SDK can only be initialized once. Extra initializations ` +
          `are ignored. Please remove calls initializing the SDK more than once.`;
        break;
      case SdkInitErrorKind.MissingSafariWebId:
        errorMessage =
          `OneSignal: Safari browser support on Mac OS X requires the Safari web platform` +
          ` to be enabled. Please see the Safari Support steps in our web setup guide.`;
        break;
      case SdkInitErrorKind.Unknown:
        errorMessage = 'OneSignal: An unknown initialization error occurred.';
        break;
    }
    super(errorMessage);

    this.reason = reverseSdkInitErrorKind[reason];

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md
     * #extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, SdkInitError.prototype);
  }
}
