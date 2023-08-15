import { SinonSandbox } from "sinon";
import { CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES } from "../../../../src/shared/slidedown/constants";
import ChannelCaptureContainer from "../../../../src/page/slidedown/ChannelCaptureContainer";

export class ChannelCaptureContainerHelper {
  static stubScriptLoading(sandbox: SinonSandbox): void {
    sandbox.stub(ChannelCaptureContainer.prototype as any, "loadPhoneLibraryScripts");
    sandbox.stub(ChannelCaptureContainer.prototype as any, "initializePhoneInputLibrary");
  }

  static stubEventListenerAdders(sandbox: SinonSandbox): void {
    sandbox.stub(ChannelCaptureContainer.prototype as any, "addSmsInputEventListeners");
    sandbox.stub(ChannelCaptureContainer.prototype as any, "addEmailInputEventListeners");
  }

  static setupStubs(sandbox: SinonSandbox): void {
    ChannelCaptureContainerHelper.stubScriptLoading(sandbox);
    ChannelCaptureContainerHelper.stubEventListenerAdders(sandbox);
  }

  static isEmailValidationElementShowing(): boolean {
    const emailValidationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`
    );

    const emailValidationHidden = emailValidationElement?.classList.contains(
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden
      );

    return !emailValidationHidden || false;
  }

  static isSmsValidationElementShowing(): boolean {
    const smsValidationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`
    );

    const smsValidationHidden = smsValidationElement?.classList.contains(
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden
      );

    return !smsValidationHidden || false;
  }
}
