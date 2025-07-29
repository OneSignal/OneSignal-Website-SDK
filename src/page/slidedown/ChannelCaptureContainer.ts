import {
  DelayedPromptType,
  type DelayedPromptTypeValue,
  type SlidedownPromptOptions,
} from 'src/shared/prompts';
import Log from '../../shared/libraries/Log';
import {
  CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES,
  CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  DANGER_ICON,
  SLIDEDOWN_CSS_IDS,
} from '../../shared/slidedown/constants';
import {
  addCssClass,
  getDomElementOrStub,
  removeCssClass,
} from '../../shared/utils/utils';
import {
  ItiScriptURLHashes,
  ItiScriptURLs,
} from './InternationalTelephoneInput';

interface TypeSpecificVariablePayload {
  message: string;
  domElementType: string;
  validationElementId: string;
  inputElementId: string;
  inputClass: string;
  wrappingDivId: string;
  tabIndex: number;
}

export default class ChannelCaptureContainer {
  public smsInputFieldIsValid = true;
  public emailInputFieldIsValid = true;
  private promptOptions: SlidedownPromptOptions;
  private itiOneSignal: any; // iti library initialization return obj

  constructor(promptOptions: SlidedownPromptOptions) {
    this.promptOptions = promptOptions;
  }

  /* P R I V A T E */
  private generateHtml(): Element {
    const captureContainer = document.createElement('div');
    addCssClass(
      captureContainer,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.channelCaptureContainer,
    );
    captureContainer.id =
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.channelCaptureContainer;
    let label, smsInputElement, emailInputElement;

    switch (this.promptOptions.type) {
      case DelayedPromptType.Sms:
        label = this.promptOptions.text.smsLabel || 'Phone Number';
        smsInputElement = this.getInputWithValidationElement(
          DelayedPromptType.Sms,
          label,
        );
        captureContainer.appendChild(smsInputElement);
        break;
      case DelayedPromptType.Email:
        label = this.promptOptions.text.emailLabel || 'Email';
        emailInputElement = this.getInputWithValidationElement(
          DelayedPromptType.Email,
          label,
        );
        captureContainer.appendChild(emailInputElement);
        break;
      case DelayedPromptType.SmsAndEmail:
        label = this.promptOptions.text.emailLabel || 'Email';
        emailInputElement = this.getInputWithValidationElement(
          DelayedPromptType.Email,
          label,
        );
        captureContainer.appendChild(emailInputElement);
        label = this.promptOptions.text.smsLabel || 'Phone Number';
        smsInputElement = this.getInputWithValidationElement(
          DelayedPromptType.Sms,
          label,
        );
        captureContainer.appendChild(smsInputElement);
        break;
      default:
        break;
    }

    return captureContainer;
  }

  private getValidationElementWithMessage(message: string): Element {
    const wrapperDiv = document.createElement('div');
    const iconElement = document.createElement('img');
    const errorMessage = document.createElement('p');
    errorMessage.innerText = message;

    iconElement.setAttribute('src', DANGER_ICON);
    wrapperDiv.appendChild(iconElement);
    wrapperDiv.appendChild(errorMessage);
    return wrapperDiv;
  }

  private getInputWithValidationElement(
    type: DelayedPromptTypeValue,
    label: string,
  ): Element {
    const varPayload =
      this.getTypeSpecificVariablesForValidationElemGeneration(type); // {message}

    const labelElement = document.createElement('label');
    const inputElement = document.createElement('input');
    const clear = document.createElement('div');
    const clear2 = document.createElement('div');
    const validationElement = this.getValidationElementWithMessage(
      varPayload.message,
    );
    const wrappingDiv = document.createElement('div');

    clear.setAttribute('style', 'clear:both');
    clear2.setAttribute('style', 'clear:both');

    addCssClass(
      validationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
    );
    addCssClass(
      validationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElement,
    );
    validationElement.id = varPayload.validationElementId;

    labelElement.title = label;
    labelElement.innerText = label;
    labelElement.htmlFor = varPayload.inputElementId;

    inputElement.type = varPayload.domElementType;
    inputElement.id = varPayload.inputElementId;
    inputElement.tabIndex = varPayload.tabIndex;

    addCssClass(inputElement, varPayload.inputClass);
    addCssClass(
      wrappingDiv,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.inputWithValidationElement,
    );
    wrappingDiv.id = varPayload.wrappingDivId;

    wrappingDiv.appendChild(labelElement);
    wrappingDiv.appendChild(clear);
    wrappingDiv.appendChild(inputElement);
    wrappingDiv.appendChild(clear2);
    wrappingDiv.appendChild(validationElement);

    return wrappingDiv;
  }

  private getTypeSpecificVariablesForValidationElemGeneration(
    type: DelayedPromptTypeValue,
  ): TypeSpecificVariablePayload {
    if (type === DelayedPromptType.Email) {
      return {
        message: 'Please enter a valid email',
        domElementType: 'email',
        validationElementId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalEmailInput,
        wrappingDivId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement,
        tabIndex: 1,
      };
    } else if (type === DelayedPromptType.Sms) {
      return {
        message: 'Please enter a valid phone number',
        domElementType: 'tel',
        validationElementId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalSmsInput,
        wrappingDivId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement,
        tabIndex: 2,
      };
    } else throw new Error('invalid channel type for input validation');
  }

  private initializePhoneInputLibrary(): void {
    const onesignalSmsInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`,
    );
    if (onesignalSmsInput && !!window.intlTelInput) {
      this.itiOneSignal = window.intlTelInput(onesignalSmsInput, {
        autoPlaceholder: 'off',
        separateDialCode: true,
      });
    } else {
      Log.error(
        'OneSignal: there was a problem initializing International Telephone Input',
      );
    }
  }

  private addSmsInputEventListeners(): void {
    const smsInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`,
    );

    smsInput.addEventListener('keyup', (event) => {
      this.smsInputFieldIsValid =
        this.itiOneSignal.isValidNumber() ||
        (smsInput as HTMLInputElement)?.value === '';

      // @ts-expect-error - TODO: improve type
      if (event.key === 'Enter') {
        // Trigger the button element with a click
        document.getElementById(SLIDEDOWN_CSS_IDS.allowButton)?.click();
      }

      this.updateValidationOnSmsInputChange();
    });

    // handles case where number is typed, then country is changed after
    smsInput.addEventListener('blur', () => {
      this.smsInputFieldIsValid =
        this.itiOneSignal.isValidNumber() ||
        (smsInput as HTMLInputElement)?.value === '';

      this.updateValidationOnSmsInputChange();
    });
  }

  private addEmailInputEventListeners(): void {
    const emailInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`,
    );

    emailInput.addEventListener('keyup', (event) => {
      const emailValue = (emailInput as HTMLInputElement)?.value;
      this.emailInputFieldIsValid =
        ChannelCaptureContainer.validateEmailInputWithReturnVal(emailValue);

      // @ts-expect-error - TODO: improve type
      if (event.key === 'Enter') {
        // Trigger the button element with a click
        document.getElementById(SLIDEDOWN_CSS_IDS.allowButton)?.click();
      }

      this.updateValidationOnEmailInputChange();
    });
  }

  private updateValidationOnSmsInputChange(): void {
    const smsInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement}`,
    );
    const smsValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`,
    );
    removeCssClass(
      smsInputWithValidation,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
    );
    addCssClass(
      smsValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
    );
  }

  private updateValidationOnEmailInputChange(): void {
    const emailInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement}`,
    );
    const emailValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`,
    );
    removeCssClass(
      emailInputWithValidation,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
    );
    addCssClass(
      emailValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
    );
  }

  private async loadPhoneLibraryScripts(): Promise<void> {
    if (OneSignal._didLoadITILibrary) {
      return;
    }

    const script1 = document.createElement('script');
    const script2 = document.createElement('script');
    const link = document.createElement('link');

    script1.src = ItiScriptURLs.Main;
    script2.src = ItiScriptURLs.Utils;
    link.href = ItiScriptURLs.Stylesheet;
    link.rel = 'stylesheet';

    script1.integrity = ItiScriptURLHashes.Main;
    script2.integrity = ItiScriptURLHashes.Utils;
    link.integrity = ItiScriptURLHashes.Stylesheet;

    script1.crossOrigin = 'anonymous';
    script2.crossOrigin = 'anonymous';
    link.crossOrigin = 'anonymous';

    document.head.appendChild(script1);
    document.head.appendChild(script2);
    document.head.appendChild(link);

    const promise1 = new Promise<void>((resolve) => {
      script1.onload = () => {
        resolve();
      };
    });
    const promise2 = new Promise<void>((resolve) => {
      script2.onload = () => {
        resolve();
      };
    });

    await Promise.all([promise1, promise2]);

    OneSignal._didLoadITILibrary = true;
  }

  /* P U B L I C */
  public async mount(): Promise<void> {
    const isUsingSms = ChannelCaptureContainer.isUsingSmsInputField(
      this.promptOptions.type,
    );
    const isUsingEmail = ChannelCaptureContainer.isUsingEmailInputField(
      this.promptOptions.type,
    );

    if (isUsingSms) {
      await this.loadPhoneLibraryScripts();
    }

    const captureContainer = this.generateHtml();
    const body = getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS.body}`);
    body.appendChild(captureContainer);

    if (isUsingSms) {
      this.initializePhoneInputLibrary();
      this.addSmsInputEventListeners();
    }

    if (isUsingEmail) {
      this.addEmailInputEventListeners();
    }
  }

  isEmailInputFieldEmpty(): boolean {
    return this.getValueFromEmailInput() === '';
  }

  isSmsInputFieldEmpty(): boolean {
    return this.getValueFromSmsInput() === '';
  }

  getValueFromEmailInput(): string {
    const inputNode = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`,
    );
    return (inputNode as HTMLInputElement)?.value || '';
  }

  getValueFromSmsInput(): string {
    return (
      this.itiOneSignal.getNumber(
        window.intlTelInput.utils.numberFormat.E164,
      ) || ''
    );
  }

  /* S T A T I C */
  static showSmsInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`,
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement}`,
    );

    if (!validationElement || !inputElement) {
      Log.error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      validationElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
      );
      inputElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
      );
    } else {
      validationElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
      );
      inputElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
      );
    }
  }

  static showEmailInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`,
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement}`,
    );

    if (!validationElement || !inputElement) {
      Log.error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      // show error
      validationElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
      );
      inputElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
      );
    } else {
      validationElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden,
      );
      inputElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput,
      );
    }
  }

  static resetInputErrorStates(type: DelayedPromptTypeValue): void {
    switch (type) {
      case DelayedPromptType.Sms:
        ChannelCaptureContainer.showSmsInputError(false);
        break;
      case DelayedPromptType.Email:
        ChannelCaptureContainer.showEmailInputError(false);
        break;
      case DelayedPromptType.SmsAndEmail:
        ChannelCaptureContainer.showSmsInputError(false);
        ChannelCaptureContainer.showEmailInputError(false);
        break;
      default:
        break;
    }
  }

  static validateEmailInputWithReturnVal(emailString?: string): boolean {
    const re = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    return re.test(emailString || '') || emailString === '';
  }

  static isUsingSmsInputField(type: DelayedPromptTypeValue): boolean {
    return (
      type === DelayedPromptType.Sms || type === DelayedPromptType.SmsAndEmail
    );
  }

  static isUsingEmailInputField(type: DelayedPromptTypeValue): boolean {
    return (
      type === DelayedPromptType.Email || type === DelayedPromptType.SmsAndEmail
    );
  }
}
