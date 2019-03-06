import OneSignalError from "./OneSignalError";


export enum SdkInitErrorKind {
  InvalidAppId,
  AppNotConfiguredForWebPush,
  MissingSubdomain,
  WrongSiteUrl,
  MultipleInitialization,
  MissingSafariWebId,
  Unknown
}

export class SdkInitError extends OneSignalError {
  reason: string;

  constructor(reason: SdkInitErrorKind, extra?: {
    siteUrl: string;
  }) {
    switch (reason) {
      case SdkInitErrorKind.InvalidAppId:
        super('OneSignal: This app ID does not match any existing app. Double check your app ID.');
        break;
      case SdkInitErrorKind.AppNotConfiguredForWebPush:
        super('OneSignal: This app ID does not have any web platforms enabled. Double check your app ID, or see step 1 on our setup guide (https://goo.gl/01h7fZ).');
        break;
      case SdkInitErrorKind.MissingSubdomain:
        super('OneSignal: Non-HTTPS pages require a subdomain of OneSignal to be chosen on your dashboard. See step 1.4 on our setup guide (https://goo.gl/xip6JB).');
        break;
      case SdkInitErrorKind.WrongSiteUrl:
        if (extra && extra.siteUrl) {
          super(`OneSignal: This web push config can only be used on ${new URL(extra.siteUrl).origin}. Your current origin is ${location.origin}.`);
        } else {
          super('OneSignal: This web push config can not be used on the current site.');
        }
        break;
      case SdkInitErrorKind.MultipleInitialization:
        super('OneSignal: The OneSignal web SDK can only be initialized once. Extra initializations are ignored. Please remove calls initializing the SDK more than once.');
        break;
      case SdkInitErrorKind.MissingSafariWebId:
        super('OneSignal: Safari browser support on Mac OS X requires the Safari web platform to be enabled. Please see the Safari Support steps in our web setup guide.');
        break;
      case SdkInitErrorKind.Unknown:
        super('OneSignal: An unknown initialization error occurred.');
        break;
    }
    this.reason = SdkInitErrorKind[reason];

    /**
     * Important! Required to make sure the correct error type is detected during instanceof checks.
     * Same applies to all derived classes.
     * https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
     */
    Object.setPrototypeOf(this, SdkInitError.prototype);
  }
}
