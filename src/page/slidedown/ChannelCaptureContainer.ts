import {
  addCssClass,
  getDomElementOrStub,
  removeCssClass,
} from 'src/shared/helpers/dom';
import { DelayedPromptType } from 'src/shared/prompts/constants';
import type {
  DelayedPromptTypeValue,
  SlidedownPromptOptions,
} from 'src/shared/prompts/types';
import Log from '../../shared/libraries/Log';
import {
  CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES,
  CHANNEL_CAPTURE_CONTAINER_CSS_IDS,
  DANGER_ICON,
  SLIDEDOWN_CSS_IDS,
} from '../../shared/slidedown/constants';
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
  public _smsInputFieldIsValid = true;
  public _emailInputFieldIsValid = true;
  private _promptOptions: SlidedownPromptOptions;
  private _itiOneSignal: ReturnType<typeof window.intlTelInput> | undefined;

  constructor(promptOptions: SlidedownPromptOptions) {
    this._promptOptions = promptOptions;
  }

  /* P R I V A T E */
  private _generateHtml(): Element {
    const captureContainer = document.createElement('div');
    addCssClass(
      captureContainer,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._ChannelCaptureContainer,
    );
    captureContainer.id =
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._ChannelCaptureContainer;
    let label, smsInputElement, emailInputElement;

    switch (this._promptOptions.type) {
      case DelayedPromptType._Sms:
        label = this._promptOptions.text.smsLabel || 'Phone Number';
        smsInputElement = this._getInputWithValidationElement(
          DelayedPromptType._Sms,
          label,
        );
        captureContainer.appendChild(smsInputElement);
        break;
      case DelayedPromptType._Email:
        label = this._promptOptions.text.emailLabel || 'Email';
        emailInputElement = this._getInputWithValidationElement(
          DelayedPromptType._Email,
          label,
        );
        captureContainer.appendChild(emailInputElement);
        break;
      case DelayedPromptType._SmsAndEmail:
        label = this._promptOptions.text.emailLabel || 'Email';
        emailInputElement = this._getInputWithValidationElement(
          DelayedPromptType._Email,
          label,
        );
        captureContainer.appendChild(emailInputElement);
        label = this._promptOptions.text.smsLabel || 'Phone Number';
        smsInputElement = this._getInputWithValidationElement(
          DelayedPromptType._Sms,
          label,
        );
        captureContainer.appendChild(smsInputElement);
        break;
      default:
        break;
    }

    return captureContainer;
  }

  private _getValidationElementWithMessage(message: string): Element {
    const wrapperDiv = document.createElement('div');
    const iconElement = document.createElement('img');
    const errorMessage = document.createElement('p');
    errorMessage.innerText = message;

    iconElement.setAttribute('src', DANGER_ICON);
    wrapperDiv.appendChild(iconElement);
    wrapperDiv.appendChild(errorMessage);
    return wrapperDiv;
  }

  private _getInputWithValidationElement(
    type: DelayedPromptTypeValue,
    label: string,
  ): Element {
    const varPayload =
      this._getTypeSpecificVariablesForValidationElemGeneration(type); // {message}

    const labelElement = document.createElement('label');
    const inputElement = document.createElement('input');
    const clear = document.createElement('div');
    const clear2 = document.createElement('div');
    const validationElement = this._getValidationElementWithMessage(
      varPayload.message,
    );
    const wrappingDiv = document.createElement('div');

    clear.setAttribute('style', 'clear:both');
    clear2.setAttribute('style', 'clear:both');

    addCssClass(
      validationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
    );
    addCssClass(
      validationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElement,
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
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._InputWithValidationElement,
    );
    wrappingDiv.id = varPayload.wrappingDivId;

    wrappingDiv.appendChild(labelElement);
    wrappingDiv.appendChild(clear);
    wrappingDiv.appendChild(inputElement);
    wrappingDiv.appendChild(clear2);
    wrappingDiv.appendChild(validationElement);

    return wrappingDiv;
  }

  private _getTypeSpecificVariablesForValidationElemGeneration(
    type: DelayedPromptTypeValue,
  ): TypeSpecificVariablePayload {
    if (type === DelayedPromptType._Email) {
      return {
        message: 'Please enter a valid email',
        domElementType: 'email',
        validationElementId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalEmailInput,
        wrappingDivId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS._EmailInputWithValidationElement,
        tabIndex: 1,
      };
    } else if (type === DelayedPromptType._Sms) {
      return {
        message: 'Please enter a valid phone number',
        domElementType: 'tel',
        validationElementId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsValidationElement,
        inputElementId: CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsInput,
        inputClass: CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalSmsInput,
        wrappingDivId:
          CHANNEL_CAPTURE_CONTAINER_CSS_IDS._SmsInputWithValidationElement,
        tabIndex: 2,
      };
    } else throw new Error('invalid channel type for input validation');
  }

  private _initializePhoneInputLibrary(): void {
    const onesignalSmsInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsInput}`,
    );
    if (onesignalSmsInput && !!window.intlTelInput) {
      this._itiOneSignal = window.intlTelInput(
        onesignalSmsInput as HTMLInputElement,
        {
          autoPlaceholder: 'off',
          separateDialCode: true,
        },
      );
    } else {
      Log._error(
        'OneSignal: there was a problem initializing International Telephone Input',
      );
    }
  }

  private _addSmsInputEventListeners(): void {
    const smsInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsInput}`,
    );

    smsInput.addEventListener('keyup', (event) => {
      this._smsInputFieldIsValid =
        this._itiOneSignal?.isValidNumber() ||
        (smsInput as HTMLInputElement)?.value === '';

      // @ts-expect-error - TODO: improve type
      if (event.key === 'Enter') {
        // Trigger the button element with a click
        document.getElementById(SLIDEDOWN_CSS_IDS._AllowButton)?.click();
      }

      this._updateValidationOnSmsInputChange();
    });

    // handles case where number is typed, then country is changed after
    smsInput.addEventListener('blur', () => {
      this._smsInputFieldIsValid =
        this._itiOneSignal?.isValidNumber() ||
        (smsInput as HTMLInputElement)?.value === '';

      this._updateValidationOnSmsInputChange();
    });
  }

  private _addEmailInputEventListeners(): void {
    const emailInput = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailInput}`,
    );

    emailInput.addEventListener('keyup', (event) => {
      const emailValue = (emailInput as HTMLInputElement)?.value;
      this._emailInputFieldIsValid =
        ChannelCaptureContainer._validateEmailInputWithReturnVal(emailValue);

      // @ts-expect-error - TODO: improve type
      if (event.key === 'Enter') {
        // Trigger the button element with a click
        document.getElementById(SLIDEDOWN_CSS_IDS._AllowButton)?.click();
      }

      this._updateValidationOnEmailInputChange();
    });
  }

  private _updateValidationOnSmsInputChange(): void {
    const smsInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._SmsInputWithValidationElement}`,
    );
    const smsValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsValidationElement}`,
    );
    removeCssClass(
      smsInputWithValidation,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
    );
    addCssClass(
      smsValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
    );
  }

  private _updateValidationOnEmailInputChange(): void {
    const emailInputWithValidation = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._EmailInputWithValidationElement}`,
    );
    const emailValidationElement = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailValidationElement}`,
    );
    removeCssClass(
      emailInputWithValidation,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
    );
    addCssClass(
      emailValidationElement,
      CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
    );
  }

  async _loadPhoneLibraryScripts(): Promise<void> {
    if (OneSignal._didLoadITILibrary) {
      return;
    }

    const script1 = document.createElement('script');
    const script2 = document.createElement('script');
    const link = document.createElement('link');

    script1.src = ItiScriptURLs._Main;
    script2.src = ItiScriptURLs._Utils;
    link.href = ItiScriptURLs._Stylesheet;
    link.rel = 'stylesheet';

    script1.integrity = ItiScriptURLHashes._Main;
    script2.integrity = ItiScriptURLHashes._Utils;
    link.integrity = ItiScriptURLHashes._Stylesheet;

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
  public async _mount(): Promise<void> {
    const isUsingSms = ChannelCaptureContainer._isUsingSmsInputField(
      this._promptOptions.type,
    );
    const isUsingEmail = ChannelCaptureContainer._isUsingEmailInputField(
      this._promptOptions.type,
    );

    if (isUsingSms) {
      await this._loadPhoneLibraryScripts();
    }

    const captureContainer = this._generateHtml();
    const body = getDomElementOrStub(`#${SLIDEDOWN_CSS_IDS._Body}`);
    body.appendChild(captureContainer);

    if (isUsingSms) {
      this._initializePhoneInputLibrary();
      this._addSmsInputEventListeners();
    }

    if (isUsingEmail) {
      this._addEmailInputEventListeners();
    }
  }

  _isEmailInputFieldEmpty(): boolean {
    return this._getValueFromEmailInput() === '';
  }

  _isSmsInputFieldEmpty(): boolean {
    return this._getValueFromSmsInput() === '';
  }

  _getValueFromEmailInput(): string {
    const inputNode = getDomElementOrStub(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailInput}`,
    );
    return (inputNode as HTMLInputElement)?.value || '';
  }

  _getValueFromSmsInput(): string {
    return (
      this._itiOneSignal?.getNumber(
        window.intlTelInputUtils?.numberFormat.E164,
      ) || ''
    );
  }

  /* S T A T I C */
  static _showSmsInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalSmsValidationElement}`,
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._SmsInputWithValidationElement}`,
    );

    if (!validationElement || !inputElement) {
      Log._error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      validationElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
      );
      inputElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
      );
    } else {
      validationElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
      );
      inputElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
      );
    }
  }

  static _showEmailInputError(state: boolean): void {
    const validationElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._OnesignalEmailValidationElement}`,
    );
    const inputElement = document.querySelector(
      `#${CHANNEL_CAPTURE_CONTAINER_CSS_IDS._EmailInputWithValidationElement}`,
    );

    if (!validationElement || !inputElement) {
      Log._error("OneSignal: couldn't find slidedown validation element");
      return;
    }

    if (state) {
      // show error
      validationElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
      );
      inputElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
      );
    } else {
      validationElement.classList.add(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalValidationElementHidden,
      );
      inputElement.classList.remove(
        CHANNEL_CAPTURE_CONTAINER_CSS_CLASSES._OnesignalErrorInput,
      );
    }
  }

  static _resetInputErrorStates(type: DelayedPromptTypeValue): void {
    switch (type) {
      case DelayedPromptType._Sms:
        ChannelCaptureContainer._showSmsInputError(false);
        break;
      case DelayedPromptType._Email:
        ChannelCaptureContainer._showEmailInputError(false);
        break;
      case DelayedPromptType._SmsAndEmail:
        ChannelCaptureContainer._showSmsInputError(false);
        ChannelCaptureContainer._showEmailInputError(false);
        break;
      default:
        break;
    }
  }

  static _validateEmailInputWithReturnVal(emailString?: string): boolean {
    const re = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    return re.test(emailString || '') || emailString === '';
  }

  static _isUsingSmsInputField(type: DelayedPromptTypeValue): boolean {
    return (
      type === DelayedPromptType._Sms || type === DelayedPromptType._SmsAndEmail
    );
  }

  static _isUsingEmailInputField(type: DelayedPromptTypeValue): boolean {
    return (
      type === DelayedPromptType._Email ||
      type === DelayedPromptType._SmsAndEmail
    );
  }
}
