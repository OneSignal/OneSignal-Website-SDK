import Log from "../libraries/Log";
import { addCssClass, getDomElementOrStub, removeCssClass } from "../utils";
import { DelayedPromptType, SlidedownPromptOptions } from "../models/Prompts";
import {
  CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES,
  CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  DANGER_ICON,
  SLIDEDOWN_CSS_IDS
} from "./constants";
import { ItiScriptURLHashes, ItiScriptURLs } from "./InternationalTelephoneInput";
import { } from 'intl-tel-input'; // typings

interface TypeSpecificVariablePayload {
  message: string;
  domElementType: string;
  validationElementId: string;
  inputElementId: string;
  inputClass: string;
  wrappingDivId: string;
}

export default class ChannelCaptureContainer {
  public smsInputFieldIsValid: boolean = true;
  public emailInputFieldIsValid: boolean = true;
  private promptOptions: SlidedownPromptOptions;
  private itiOneSignal: any; // iti library initialization return obj

  constructor(promptOptions: SlidedownPromptOptions) {
    this.promptOptions = promptOptions;
  }

  /* P R I V A T E */
  private generateHtml(): Element {
    const captureContainer      = document.createElement("div");
    addCssClass(captureContainer, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.channelCaptureContainer);
    captureContainer.id = CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.channelCaptureContainer;
    let label, smsInputElement, emailInputElement;

    switch (this.promptOptions.type) {
      case DelayedPromptType.Sms:
        label = this.promptOptions.text.smsLabel || "Phone Number";
        smsInputElement = this.getInputWithValidationElement(DelayedPromptType.Sms, label);
        captureContainer.appendChild(smsInputElement);
        break;
      case DelayedPromptType.Email:
        label = this.promptOptions.text.emailLabel || "Email";
        emailInputElement = this.getInputWithValidationElement(DelayedPromptType.Email, label);
        captureContainer.appendChild(emailInputElement);
        break;
      case DelayedPromptType.SmsAndEmail:
        label = this.promptOptions.text.emailLabel || "Email";
        emailInputElement = this.getInputWithValidationElement(DelayedPromptType.Email, label);
        captureContainer.appendChild(emailInputElement);
        label = this.promptOptions.text.smsLabel || "Phone Number";
        smsInputElement = this.getInputWithValidationElement(DelayedPromptType.Sms, label);
        captureContainer.appendChild(smsInputElement);
        break;
      default:
        break;
    }

    return captureContainer;
  }

  private getValidationElementWithMessage(message: string): Element {
    const wrapperDiv   = document.createElement("div");
    const iconElement  = document.createElement("img");
    const errorMessage = document.createElement("p");
    errorMessage.innerText = message;

    iconElement.setAttribute("src", DANGER_ICON);
    wrapperDiv.appendChild(iconElement);
    wrapperDiv.appendChild(errorMessage);
    return wrapperDiv;
  }

  private getInputWithValidationElement(type: DelayedPromptType, label: string): Element {
    const varPayload = this.getTypeSpecificVariablesForValidationElemGeneration(type); // {message}

    const labelElement      = document.createElement("label");
    const inputElement      = document.createElement("input");
    const clear             = document.createElement("div");
    const clear2            = document.createElement("div");
    const validationElement = this.getValidationElementWithMessage(varPayload.message);
    const wrappingDiv       = document.createElement("div");

    clear.setAttribute("style", "clear:both");
    clear2.setAttribute("style", "clear:both");

    addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
    addCssClass(validationElement, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElement);
    validationElement.id = varPayload.validationElementId;

    labelElement.title      = label;
    labelElement.innerText  = label;

    inputElement.type  = varPayload.domElementType;
    inputElement.id    = varPayload.inputElementId;

    addCssClass(inputElement, varPayload.inputClass);
    addCssClass(wrappingDiv, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.inputWithValidationElement);
    wrappingDiv.id = varPayload.wrappingDivId;

    wrappingDiv.appendChild(labelElement);
    wrappingDiv.appendChild(clear);
    wrappingDiv.appendChild(inputElement);
    wrappingDiv.appendChild(clear2);
    wrappingDiv.appendChild(validationElement);

    return wrappingDiv;
  }

  private getTypeSpecificVariablesForValidationElemGeneration(type: DelayedPromptType): TypeSpecificVariablePayload {
    if (type === DelayedPromptType.Email) {
      return {
        message: "Please enter a valid email",
        domElementType: "email",
        validationElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalEmailInput,
        wrappingDivId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement
      };
    } else if (type === DelayedPromptType.Sms) {
      return {
        message: "Please enter a valid phone number",
        domElementType: "tel",
        validationElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalSmsInput,
        wrappingDivId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement
      };
    } else throw new Error("invalid channel type for input validation");
  }

  private initializePhoneInputLibrary(): void {
    const onesignalSmsInput = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`);
    if (onesignalSmsInput && !!window.intlTelInput) {
      this.itiOneSignal = window.intlTelInput(onesignalSmsInput, {
        autoPlaceholder: "off",
        separateDialCode: true
      });
    } else {
      Log.error("OneSignal: there was a problem initializing International Telephone Input");
    }
  }

  private addSmsInputEventListeners(): void {
    const smsInput = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`);

    smsInput.addEventListener('keyup', () => {
      this.smsInputFieldIsValid = this.itiOneSignal.isValidNumber() ||
        (<HTMLInputElement>smsInput)?.value === "";

      this.updateValidationOnSmsInputChange();
    });

    // handles case where number is typed, then country is changed after
    smsInput.addEventListener('blur', () => {
      this.smsInputFieldIsValid = this.itiOneSignal.isValidNumber() ||
        (<HTMLInputElement>smsInput)?.value === "";

      this.updateValidationOnSmsInputChange();
    });
  }

  private addEmailInputEventListeners(): void {
    const emailInput = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`);

    emailInput.addEventListener('keyup', () => {
      const emailValue = (<HTMLInputElement>emailInput)?.value;
      this.emailInputFieldIsValid = ChannelCaptureContainer.validateEmailInputWithReturnVal(emailValue);

      this.updateValidationOnEmailInputChange();
    });
  }

  private updateValidationOnSmsInputChange(): void {
    const smsInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement}`
    );
    const smsValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`
    );
    removeCssClass(smsInputWithValidation, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    addCssClass(smsValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden
      );
  }

  private updateValidationOnEmailInputChange(): void {
    const emailInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement}`
    );
    const emailValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`
    );
    removeCssClass(emailInputWithValidation, CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    addCssClass(emailValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden
      );
  }

  private async loadPhoneLibraryScripts(): Promise<void> {
    const script1 = document.createElement("script");
    const script2 = document.createElement("script");
    const link    = document.createElement("link");

    script1.src = ItiScriptURLs.Main;
    script2.src = ItiScriptURLs.Utils;
    link.href   = ItiScriptURLs.Stylesheet;
    link.rel    = "stylesheet";

    script1.integrity = ItiScriptURLHashes.Main;
    script2.integrity = ItiScriptURLHashes.Utils;
    link.integrity    = ItiScriptURLHashes.Stylesheet;

    script1.crossOrigin = "anonymous";
    script2.crossOrigin = "anonymous";
    link.crossOrigin    = "anonymous";

    document.head.appendChild(script1);
    document.head.appendChild(script2);
    document.head.appendChild(link);

    const promise1 = new Promise<void>(resolve => { script1.onload = () => { resolve(); }; });
    const promise2 = new Promise<void>(resolve => { script2.onload = () => { resolve(); }; });

    await Promise.all([promise1, promise2]);
  }

  /* P U B L I C */
  public async mount(): Promise<void> {
    const isUsingSms = ChannelCaptureContainer.isUsingSmsInputField(this.promptOptions.type);
    const isUsingEmail = ChannelCaptureContainer.isUsingEmailInputField(this.promptOptions.type);

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

  /* S T A T I C */
  static isEmailInputFieldEmpty(): boolean {
    return ChannelCaptureContainer.getValueFromEmailInput() === "";
  }

  static isSmsInputFieldEmpty(): boolean {
    const onesignalSmsInput = document.querySelector(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`);
    return (<HTMLInputElement>onesignalSmsInput)?.value === "";
  }

  static showSmsInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsValidationElement}`
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.smsInputWithValidationElement}`
    );

    if (!validationElement || !inputElement) {
      Log.error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      validationElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
      inputElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    } else {
      validationElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
      inputElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    }
  }

  static showEmailInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailValidationElement}`
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.emailInputWithValidationElement}`
    );

    if (!validationElement || !inputElement) {
      Log.error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      // show error
      validationElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
      inputElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    } else {
      validationElement.classList.add(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalValidationElementHidden);
      inputElement.classList.remove(CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES.onesignalErrorInput);
    }
  }

  static resetInputErrorStates(type: DelayedPromptType): void {
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

  static getValueFromEmailInput(): string {
    const inputNode = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalEmailInput}`);
    return (<HTMLInputElement>inputNode)?.value || "";
  }

  static getValueFromSmsInput(): string {
    const inputNode = getDomElementOrStub(`#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS.onesignalSmsInput}`);
    return (<HTMLInputElement>inputNode)?.value || "";
  }

  static validateEmailInputWithReturnVal(emailString?: string): boolean {
    const re = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    return re.test(emailString || '') || emailString === "";
  }

  static isUsingSmsInputField(type: DelayedPromptType): boolean {
    return type === DelayedPromptType.Sms || type === DelayedPromptType.SmsAndEmail;
  }

  static isUsingEmailInputField(type: DelayedPromptType): boolean {
    return type === DelayedPromptType.Email || type === DelayedPromptType.SmsAndEmail;
  }
}
